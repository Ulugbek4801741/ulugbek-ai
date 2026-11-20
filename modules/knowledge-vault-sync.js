"use strict";

// Publishes and restores only Wikimedia CC BY-SA 4.0 research records.
// User uploads and unlicensed pages never enter this automated archive.
const crypto = require("node:crypto");
const yazl = require("yazl");
const yauzl = require("yauzl");

const INTERVAL = Math.max(60 * 60 * 1000, Number(process.env.VAULT_SYNC_INTERVAL_MS) || 6 * 60 * 60 * 1000);
const MAX_BYTES = 20 * 1024 * 1024;
const LANGUAGES = new Set(["uz", "en", "ru"]);
let timer = null, active = false;
let latest = { enabled: false, status: "disabled", syncedAt: null, documents: 0, restored: 0, error: null };

function eligible(item) {
  if (!item || item.agent !== "AutonomousResearchAgent" || typeof item.source !== "string") return false;
  try {
    const url = new URL(item.source), language = url.hostname.split(".")[0];
    if (url.protocol !== "https:" || !LANGUAGES.has(language) ||
        url.hostname !== language + ".wikipedia.org" || !url.pathname.startsWith("/wiki/")) return false;
    const content = String(item.content || "").trim();
    if (content.length < 80 || content.length > 12000 ||
        /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(content) ||
        /(?:api[_ -]?key|access[_ -]?token|password|secret)\s*[:=]/i.test(content)) return false;
    return { title: String(item.title || "").slice(0, 300), source: url.href, language,
      license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
      attribution: "Wikimedia contributors", createdAt: item.createdAt || new Date().toISOString(),
      content, agent: "AutonomousResearchAgent", status: item.status === "approved" ? "approved" : "pending-review",
      usage: "retrieval-only" };
  } catch (_) { return false; }
}
async function makeZip(documents) {
  const zip = new yazl.ZipFile();
  const manifest = { schema: "ulugbek-open-knowledge-v1", createdAt: new Date().toISOString(),
    documents: documents.length, sourcePolicy: "Wikimedia CC BY-SA 4.0 only",
    usage: "retrieval-only; archived code is never executed" };
  zip.addBuffer(Buffer.from(JSON.stringify(manifest, null, 2) + "\n"), "manifest.json");
  zip.addBuffer(Buffer.from(documents.map(x => JSON.stringify(x)).join("\n") + "\n"), "knowledge/documents.jsonl");
  zip.end();
  const parts = []; let total = 0;
  for await (const part of zip.outputStream) {
    total += part.length;
    if (total > MAX_BYTES) throw new Error("Knowledge ZIP exceeds 20 MiB.");
    parts.push(part);
  }
  return Buffer.concat(parts, total);
}
function readEntry(zipfile, entry) {
  return new Promise((resolve, reject) => {
    zipfile.openReadStream(entry, (error, stream) => {
      if (error) return reject(error);
      const chunks = []; let size = 0;
      stream.on("data", chunk => { size += chunk.length; if (size > MAX_BYTES) stream.destroy(new Error("ZIP entry too large.")); else chunks.push(chunk); });
      stream.on("error", reject);
      stream.on("end", () => resolve(Buffer.concat(chunks, size)));
    });
  });
}
async function parseZip(bytes) {
  return new Promise((resolve, reject) => {
    yauzl.fromBuffer(bytes, { lazyEntries: true, decodeStrings: true, validateEntrySizes: true, strictFileNames: true }, (error, zip) => {
      if (error) return reject(error);
      let found = false, done = false;
      zip.on("error", reject);
      zip.on("end", () => { if (!done) reject(new Error("ZIP knowledge JSONL not found.")); });
      zip.on("entry", async entry => {
        try {
          if (entry.fileName === "knowledge/documents.jsonl") {
            if (found || Number(entry.uncompressedSize) > MAX_BYTES) throw new Error("Invalid knowledge JSONL entry.");
            found = true;
            const raw = await readEntry(zip, entry);
            const rows = raw.toString("utf8").split("\n").filter(Boolean).map(line => JSON.parse(line));
            done = true; zip.close(); resolve(rows);
          } else zip.readEntry();
        } catch (err) { zip.close(); reject(err); }
      });
      zip.readEntry();
    });
  });
}
async function restore(base, token, learningWorker) {
  const response = await fetch(base + "/api/vault/latest", {
    headers: { Authorization: "Bearer " + token }, signal: AbortSignal.timeout(60000)
  });
  if (response.status === 404) return 0;
  if (!response.ok) throw new Error("Vault restore HTTP " + response.status);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (!bytes.length || bytes.length > MAX_BYTES) throw new Error("Vault archive size is invalid.");
  const digest = crypto.createHash("sha256").update(bytes).digest("hex");
  if (digest !== response.headers.get("x-archive-sha256")) throw new Error("Vault archive SHA-256 mismatch.");
  const records = await parseZip(bytes);
  const result = await learningWorker.importPublicKnowledge(records);
  return result.imported || 0;
}
async function syncOnce(learningWorker) {
  if (active) return { skipped: true, reason: "sync already running" };
  const base = String(process.env.VAULT_URL || "").replace(/\/$/, "");
  const token = String(process.env.VAULT_TOKEN || "");
  if (!base || !token) {
    latest = { ...latest, enabled: false, status: "not-configured" };
    return latest;
  }
  active = true;
  try {
    const restored = await restore(base, token, learningWorker);
    const exported = await learningWorker.exportPublicKnowledge();
    const unique = new Map();
    for (const item of exported) { const record = eligible(item); if (record) unique.set(record.source, record); }
    const documents = [...unique.values()].sort((a,b) => a.source.localeCompare(b.source));
    if (!documents.length) {
      latest = { enabled: true, status: "waiting-for-open-license-content", syncedAt: new Date().toISOString(), documents: 0, restored, error: null };
      return latest;
    }
    const zip = await makeZip(documents);
    const sha256 = crypto.createHash("sha256").update(zip).digest("hex");
    const response = await fetch(base + "/api/vault/archive", {
      method: "PUT", headers: { Authorization: "Bearer " + token, "Content-Type": "application/zip",
        "X-Archive-SHA256": sha256 }, body: zip, signal: AbortSignal.timeout(60000)
    });
    if (!response.ok) throw new Error("Vault upload HTTP " + response.status);
    const result = await response.json();
    latest = { enabled: true, status: "synced", syncedAt: new Date().toISOString(),
      documents: documents.length, restored, bytes: zip.length, sha256,
      archive: result.archive?.key || null, error: null };
    return latest;
  } catch (error) {
    latest = { ...latest, enabled: true, status: "error", error: String(error.message || error).slice(0, 180) };
    return latest;
  } finally { active = false; }
}
function start(learningWorker) {
  if (timer) return status();
  if (!process.env.VAULT_URL || !process.env.VAULT_TOKEN) return status();
  timer = setInterval(() => { void syncOnce(learningWorker); }, INTERVAL);
  if (timer.unref) timer.unref();
  const initial = setTimeout(() => { void syncOnce(learningWorker); }, 15000);
  if (initial.unref) initial.unref();
  latest = { ...latest, enabled: true, status: "scheduled" };
  return status();
}
function status() { return { ...latest, intervalMs: INTERVAL, destination: process.env.VAULT_URL ? "private-second-server" : null }; }
module.exports = { start, syncOnce, status, eligible, makeZip, parseZip };
