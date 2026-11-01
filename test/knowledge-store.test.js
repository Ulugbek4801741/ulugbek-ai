"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const crypto = require("node:crypto");

const dir = path.join(os.tmpdir(), "ulugbek-knowledge-archive-" + crypto.randomUUID());
process.env.ULUGBEK_DATA_DIR = dir;
process.env.ULUGBEK_KNOWLEDGE_KEY = crypto.randomBytes(32).toString("hex");
const store = require("../knowledge-store");

test("AES-256-GCM archive encrypts and decrypts compressed knowledge", () => {
  const key = crypto.randomBytes(32);
  const envelope = store._crypto.encryptBuffer(Buffer.from("maxfiy bilim"), key);
  assert.notEqual(envelope.ciphertext, Buffer.from("maxfiy bilim").toString("base64"));
  const decoded = store._crypto.decryptEnvelope(envelope, key);
  assert.equal(decoded.toString("utf8"), "maxfiy bilim");
  assert.throws(() => store._crypto.decryptEnvelope(envelope, crypto.randomBytes(32)));
});

test("legacy JSON migrates only after encrypted archive verifies", async () => {
  const legacyPath = store._paths.LEGACY_FILE;
  const archivePath = store._paths.ARCHIVE_FILE;
  const records = [{ id: "legacy-1", title: "Eski bilim", content: "Saqlanishi kerak", status: "approved" }];
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(legacyPath, JSON.stringify(records), { mode: 0o600 });
  const loaded = await store.read();
  assert.deepEqual(loaded, records);
  await assert.rejects(fs.access(legacyPath));
  const archive = await fs.readFile(archivePath, "utf8");
  assert.equal(archive.includes("Saqlanishi kerak"), false);
  const status = await store.status();
  assert.equal(status.encrypted, true);
  assert.equal(status.legacyPlaintextPresent, false);
  assert.equal(status.migration, "verified-complete");
});

test("new knowledge writes require an encryption key", async () => {
  const key = process.env.ULUGBEK_KNOWLEDGE_KEY;
  delete process.env.ULUGBEK_KNOWLEDGE_KEY;
  await assert.rejects(store.write([{ title: "no plaintext" }]), error => error.code === "KNOWLEDGE_KEY_REQUIRED");
  process.env.ULUGBEK_KNOWLEDGE_KEY = key;
});

test("tampered encrypted data fails authentication", () => {
  const key = crypto.randomBytes(32);
  const envelope = store._crypto.encryptBuffer(Buffer.from("original"), key);
  envelope.ciphertext = Buffer.from("tampered").toString("base64");
  assert.throws(() => store._crypto.decryptEnvelope(envelope, key));
});
