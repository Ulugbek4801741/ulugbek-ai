"use strict";

const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");
const zlib = require("node:zlib");
const { promisify } = require("node:util");
const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

const DATA_DIR = path.resolve(process.env.ULUGBEK_DATA_DIR || path.join(__dirname, "data"));
const LEGACY_FILE = path.join(DATA_DIR, "knowledge.json");
const ARCHIVE_FILE = path.join(DATA_DIR, "knowledge.archive.json.gz.enc");
const VERSION = 1;
let writeChain = Promise.resolve();
let cachedItems = null;
let cachedMtimeMs = 0;

function getKey() {
  const raw = String(process.env.ULUGBEK_KNOWLEDGE_KEY || "").trim();
  if (!raw) return null;
  let key;
  if (/^[a-f0-9]{64}$/i.test(raw)) key = Buffer.from(raw, "hex");
  else {
    try { key = Buffer.from(raw, "base64"); } catch (_) { key = null; }
  }
  if (!key || key.length !== 32) {
    const error = new Error("ULUGBEK_KNOWLEDGE_KEY 32 baytli kalit bo‘lishi kerak (64 ta hex yoki base64).");
    error.code = "INVALID_KNOWLEDGE_KEY";
    throw error;
  }
  return key;
}

function encryptBuffer(plain, key) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plain), cipher.final()]);
  return {
    version: VERSION,
    algorithm: "aes-256-gcm",
    compression: "gzip",
    iv: iv.toString("base64"),
    authTag: cipher.getAuthTag().toString("base64"),
    ciphertext: ciphertext.toString("base64")
  };
}

function decryptEnvelope(envelope, key) {
  if (!envelope || envelope.version !== VERSION ||
      envelope.algorithm !== "aes-256-gcm" || envelope.compression !== "gzip") {
    throw new Error("Bilimlar arxivi formati tanilmadi.");
  }
  const iv = Buffer.from(envelope.iv || "", "base64");
  const tag = Buffer.from(envelope.authTag || "", "base64");
  const ciphertext = Buffer.from(envelope.ciphertext || "", "base64");
  if (iv.length !== 12 || tag.length !== 16 || !ciphertext.length) {
    throw new Error("Bilimlar arxivi buzilgan yoki to‘liq emas.");
  }
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

async function atomicWrite(file, data) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const temp = file + "." + crypto.randomUUID() + ".tmp";
  try {
    await fs.writeFile(temp, data, { mode: 0o600, flag: "wx" });
    await fs.rename(temp, file);
    try { await fs.chmod(file, 0o600); } catch (_) {}
  } catch (error) {
    await fs.rm(temp, { force: true }).catch(() => {});
    throw error;
  }
}

async function readEncrypted(key) {
  const raw = await fs.readFile(ARCHIVE_FILE, "utf8");
  const envelope = JSON.parse(raw);
  const compressed = decryptEnvelope(envelope, key);
  const plain = await gunzip(compressed);
  const items = JSON.parse(plain.toString("utf8"));
  if (!Array.isArray(items)) throw new Error("Bilimlar arxivi ro‘yxat formatida emas.");
  return items;
}

async function writeEncrypted(items, key) {
  const plain = Buffer.from(JSON.stringify(items), "utf8");
  const compressed = await gzip(plain, { level: 9 });
  const envelope = encryptBuffer(compressed, key);
  await atomicWrite(ARCHIVE_FILE, JSON.stringify(envelope));
  cachedItems = items;
  const stat = await fs.stat(ARCHIVE_FILE);
  cachedMtimeMs = stat.mtimeMs;
  return { originalBytes: plain.length, compressedBytes: compressed.length, encryptedBytes: Buffer.byteLength(JSON.stringify(envelope)) };
}

async function read() {
  const key = getKey();
  if (key) {
    try {
      const stat = await fs.stat(ARCHIVE_FILE);
      if (cachedItems && cachedMtimeMs === stat.mtimeMs) return cachedItems;
      cachedItems = await readEncrypted(key);
      cachedMtimeMs = stat.mtimeMs;
      return cachedItems;
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }

    // One-time, verified migration: old JSON is deleted only after the encrypted
    // archive has been written and successfully decrypted back.
    let legacy;
    try {
      legacy = JSON.parse(await fs.readFile(LEGACY_FILE, "utf8"));
    } catch (error) {
      if (error.code === "ENOENT") return [];
      throw error;
    }
    if (!Array.isArray(legacy)) throw new Error("Eski bilimlar fayli noto‘g‘ri formatda; migratsiya to‘xtatildi.");
    await writeEncrypted(legacy, key);
    const verified = await readEncrypted(key);
    if (JSON.stringify(verified) !== JSON.stringify(legacy)) {
      throw new Error("Shifrlangan arxiv tekshiruvi mos kelmadi; eski fayl saqlab qolindi.");
    }
    await fs.unlink(LEGACY_FILE);
    cachedItems = verified;
    return verified;
  }

  // Without a key, legacy data remains readable but all writes are blocked.
  // This prevents new knowledge from silently being stored in plaintext.
  try {
    const stat = await fs.stat(LEGACY_FILE);
    if (cachedItems && cachedMtimeMs === stat.mtimeMs) return cachedItems;
    cachedItems = JSON.parse(await fs.readFile(LEGACY_FILE, "utf8"));
    cachedMtimeMs = stat.mtimeMs;
    if (!Array.isArray(cachedItems)) throw new Error("Eski bilimlar fayli noto‘g‘ri formatda.");
    return cachedItems;
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

async function write(items) {
  const key = getKey();
  if (!key) {
    const error = new Error("Bilimlarni xavfsiz saqlash uchun Render’da ULUGBEK_KNOWLEDGE_KEY maxfiy o‘zgaruvchisini sozlang. Ochiq matnli yozuv bloklandi.");
    error.code = "KNOWLEDGE_KEY_REQUIRED";
    throw error;
  }
  if (!Array.isArray(items)) throw new TypeError("Bilimlar ro‘yxati array bo‘lishi kerak.");
  const snapshot = items.slice(-2000);
  writeChain = writeChain.then(() => writeEncrypted(snapshot, key));
  return writeChain;
}

async function status() {
  const key = getKey();
  const [archive, legacy] = await Promise.all([
    fs.stat(ARCHIVE_FILE).catch(() => null),
    fs.stat(LEGACY_FILE).catch(() => null)
  ]);
  return {
    encrypted: Boolean(archive),
    compression: archive ? "gzip-level-9" : null,
    encryption: archive ? "AES-256-GCM" : null,
    keyConfigured: Boolean(key),
    legacyPlaintextPresent: Boolean(legacy),
    archiveFile: path.basename(ARCHIVE_FILE),
    legacyFile: path.basename(LEGACY_FILE),
    migration: archive && !legacy ? "verified-complete" : legacy && key ? "pending-or-first-read" : legacy ? "waiting-for-encryption-key" : "no-legacy-data",
    writesRequireEncryptionKey: true
  };
}

module.exports = { read, write, status, _paths: { LEGACY_FILE, ARCHIVE_FILE }, _crypto: { encryptBuffer, decryptEnvelope } };
