"use strict";

// Public-source-only compressed backup for the existing Node.js ULUGBEK service.
// Never serializes chat history, profiles, uploaded documents, credentials or local:// records.
const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");
const { gzipSync, gunzipSync } = require("node:zlib");

const DATA_DIR = path.resolve(process.env.ULUGBEK_DATA_DIR || path.join(__dirname, "..", "data"));
const KNOWLEDGE_FILE = path.join(DATA_DIR, "knowledge.json");
const OWNER = process.env.ARCHIVE_GITHUB_OWNER || "Ulugbek4801741";
const REPO = process.env.ARCHIVE_GITHUB_REPO || "ulugbek-ai";
const BRANCH = process.env.ARCHIVE_GITHUB_BRANCH || "public-knowledge-archive";
const API = "https://api.github.com";
const RAW = "https://raw.githubusercontent.com";
const INTERVAL_MS = Math.max(15 * 60_000, Number(process.env.PUBLIC_ARCHIVE_INTERVAL_MS) || 60 * 60_000);
const MAX_COMPRESSED = 20 * 1024 * 1024;
const LANGUAGES = new Set(["uz", "en", "ru"]);
const EMAIL = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const PHONE = /(?<!\w)\+?\d[\d ()-]{7,}\d(?!\w)/;
const SECRET = /(api[_ -]?key|access[_ -]?token|password|passwd|secret)\s*[:=]/i;
let timer = null;
let running = false;
let lastRestoreAt = null;
let lastPublishAt = null;
let lastError = null;
let restored = 0;
let published = 0;

function eligible(item) {
  if (!item || item.agent !== "AutonomousResearchAgent" || typeof item.source !== "string") return false;
  let url;
  try { url = new URL(item.source); } catch (_) { return false; }
  const language = url.hostname.split(".")[0];
  if (url.protocol !== "https:" || !LANGUAGES.has(language) ||
      url.hostname !== language + ".wikipedia.org" || !url.pathname.startsWith("/wiki/")) return false;
  const title = String(item.title || "").trim();
  const content = String(item.content || "").trim();
  if (!title || title.length > 500 || content.length < 80 || content.length > 12000) return false;
  if (EMAIL.test(title + "\n" + content) || PHONE.test(title + "\n" + content) || SECRET.test(title + "\n" + content)) return false;
  return { title, text: content, source_url: url.href, license: "CC BY-SA 4.0",
    rights_status: "open-license", language, collected_at: String(item.createdAt || new Date().toISOString()) };
}
async function readKnowledge() {
  try {
    const value = JSON.parse(await fs.readFile(KNOWLEDGE_FILE, "utf8"));
    return Array.isArray(value) ? value : [];
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}
function digest(data) { return crypto.createHash("sha256").update(data).digest("hex"); }
async function request(url, token, method = "GET", payload) {
  const headers = { "Accept": "application/vnd.github+json", "User-Agent": "ULUGBEK-AI-Public-Archive", "X-GitHub-Api-Version": "2022-11-28" };
  if (token) headers.Authorization = "Bearer " + token;
  if (payload) headers["Content-Type"] = "application/json";
  const response = await fetch(url, { method, headers, body: payload ? JSON.stringify(payload) : undefined, redirect: "error", signal: AbortSignal.timeout(30000) });
  if (!response.ok) {
    const error = new Error("GitHub archive HTTP " + response.status);
    error.status = response.status;
    throw error;
  }
  return response.status === 204 ? {} : response.json();
}
async function put(pathname, bytes, message, token) {
  const url = API + "/repos/" + OWNER + "/" + REPO + "/contents/" + pathname.split("/").map(encodeURIComponent).join("/");
  const payload = { message, content: Buffer.from(bytes).toString("base64"), branch: BRANCH };
  try {
    const current = await request(url + "?ref=" + encodeURIComponent(BRANCH), token);
    payload.sha = current.sha;
  } catch (error) {
    if (error.status !== 404) throw error;
  }
  return request(url, token, "PUT", payload);
}
async function publish() {
  const token = String(process.env.GITHUB_ARCHIVE_TOKEN || "").trim();
  if (!token) throw new Error("GITHUB_ARCHIVE_TOKEN sozlanmagan; public restore ishlashi mumkin, publish esa yo‘q.");
  const knowledge = await readKnowledge();
  const unique = new Map();
  for (const item of knowledge) {
    const record = eligible(item);
    if (record) unique.set(record.source_url, record);
  }
  const records = [...unique.values()].sort((a, b) => a.source_url.localeCompare(b.source_url));
  if (!records.length) return { published: 0, skipped: true, reason: "Arxivlash huquqi tasdiqlangan Wikipedia yozuvlari topilmadi." };
  const jsonl = Buffer.from(records.map(x => JSON.stringify(x)).join("\n") + "\n", "utf8");
  const compressed = gzipSync(jsonl, { level: 9, mtime: 0 });
  if (compressed.length > MAX_COMPRESSED) throw new Error("Arxiv 20 MiB limitdan oshdi.");
  const sha = digest(compressed);
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const archivePath = "snapshots/" + stamp + "-" + sha.slice(0, 12) + ".jsonl.gz";
  await put(archivePath, compressed, "Save public knowledge GZIP snapshot " + stamp, token);
  const manifest = { schema_version: 1, created_at: new Date().toISOString(), archive_path: archivePath,
    sha256: sha, compressed_bytes: compressed.length, records: records.length,
    format: "gzip-jsonl", license: "CC BY-SA 4.0", privacy: "public Wikipedia excerpts only" };
  await put("latest.json", Buffer.from(JSON.stringify(manifest, null, 2) + "\n"), "Update public archive manifest " + stamp, token);
  published = records.length;
  lastPublishAt = new Date().toISOString();
  return { published, archive: archivePath, sha256: sha };
}
async function restore() {
  const manifestUrl = RAW + "/" + OWNER + "/" + REPO + "/" + BRANCH + "/latest.json";
  const response = await fetch(manifestUrl, { headers: { "User-Agent": "ULUGBEK-AI-Public-Archive" }, redirect: "error", signal: AbortSignal.timeout(30000) });
  if (response.status === 404) return { restored: 0, empty: true };
  if (!response.ok) throw new Error("Public archive manifest HTTP " + response.status);
  const manifest = await response.json();
  if (manifest.schema_version !== 1 || manifest.format !== "gzip-jsonl" ||
      !/^snapshots\/[0-9TZ-]+-[a-f0-9]{12}\.jsonl\.gz$/.test(manifest.archive_path || "")) {
    throw new Error("Arxiv manifest formati noto‘g‘ri.");
  }
  const fileResponse = await fetch(RAW + "/" + OWNER + "/" + REPO + "/" + BRANCH + "/" + manifest.archive_path,
    { headers: { "User-Agent": "ULUGBEK-AI-Public-Archive" }, redirect: "error", signal: AbortSignal.timeout(60000) });
  if (!fileResponse.ok) throw new Error("GZIP arxivni yuklab bo‘lmadi: HTTP " + fileResponse.status);
  const compressed = Buffer.from(await fileResponse.arrayBuffer());
  if (compressed.length > MAX_COMPRESSED || digest(compressed) !== manifest.sha256) throw new Error("Arxiv hajmi yoki SHA-256 tekshiruvi xato.");
  const rows = gunzipSync(compressed, { maxOutputLength: 100 * 1024 * 1024 }).toString("utf8").split("\n").filter(Boolean).map(line => JSON.parse(line));
  if (rows.length !== Number(manifest.records)) throw new Error("Arxivdagi yozuvlar soni manifestga mos emas.");
  const restoredRecords = rows.map(row => {
    if (!row || row.rights_status !== "open-license" || row.license !== "CC BY-SA 4.0") throw new Error("Arxivda ruxsat etilmagan litsenziya bor.");
    const url = new URL(row.source_url);
    if (!LANGUAGES.has(url.hostname.split(".")[0]) || url.hostname !== url.hostname.split(".")[0] + ".wikipedia.org" ||
        url.protocol !== "https:" || !url.pathname.startsWith("/wiki/") ||
        EMAIL.test(row.title + "\n" + row.text) || PHONE.test(row.title + "\n" + row.text) || SECRET.test(row.title + "\n" + row.text)) {
      throw new Error("Arxiv yozuvi xavfsizlik tekshiruvidan o‘tmadi.");
    }
    return { id: digest(row.source_url).slice(0, 32), title: row.title, content: row.text, source: row.source_url,
      language: row.language, agent: "AutonomousResearchAgent", status: "pending-review",
      quality: "public-wikipedia-cc-by-sa-4.0-restored", licenseNote: "CC BY-SA 4.0; source link retained.",
      createdAt: row.collected_at };
  });
  const current = await readKnowledge();
  const bySource = new Map(current.map(item => [item.source, item]));
  let count = 0;
  for (const item of restoredRecords) {
    if (!bySource.has(item.source)) { bySource.set(item.source, item); count += 1; }
  }
  if (count) {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const temp = KNOWLEDGE_FILE + ".archive.tmp";
    await fs.writeFile(temp, JSON.stringify([...bySource.values()], null, 2), { mode: 0o600 });
    await fs.rename(temp, KNOWLEDGE_FILE);
  }
  restored = count;
  lastRestoreAt = new Date().toISOString();
  return { restored: count, archiveRecords: rows.length, sha256: manifest.sha256 };
}
async function cycle() {
  if (running) return;
  running = true;
  try {
    await restore();
    if (process.env.GITHUB_ARCHIVE_TOKEN) await publish();
    lastError = null;
  } catch (error) {
    lastError = String(error.message || error).slice(0, 220);
    console.error("Public knowledge archive:", lastError);
  } finally {
    running = false;
  }
}
function start() {
  if (timer) return status();
  void cycle();
  timer = setInterval(cycle, INTERVAL_MS);
  timer.unref?.();
  return status();
}
function stop() {
  if (timer) clearInterval(timer);
  timer = null;
}
function status() {
  return { enabled: Boolean(timer), running, branch: BRANCH, intervalMinutes: Math.round(INTERVAL_MS / 60000),
    restored, published, lastRestoreAt, lastPublishAt, lastError, publicOnly: true, gzip: true };
}
module.exports = { start, stop, cycle, restore, publish, status, eligible };
