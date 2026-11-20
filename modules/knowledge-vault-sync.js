"use strict";

// Publishes only records with a known open license (currently Wikimedia CC BY-SA 4.0)
// to the separate private Knowledge Vault. User uploads and unlicensed pages are excluded.
const crypto = require("node:crypto");
const yazl = require("yazl");

const INTERVAL = Math.max(60 * 60 * 1000, Number(process.env.VAULT_SYNC_INTERVAL_MS) || 6 * 60 * 60 * 1000);
const MAX_BYTES = 20 * 1024 * 1024;
const LANGUAGES = new Set(["uz", "en", "ru"]);
let timer = null;
let active = false;
let latest = { enabled: false, status: "disabled", syncedAt: null, documents: 0, error: null };

function eligible(item) {
  if (!item || item.author !== "AutonomousResearchAgent" || typeof item.source !== "string") return false;
  try {
    const url = new URL(item.source);
    const language = url.hostname.split(".")[0];
    if (url.protocol !== "https:" || !LANGUAGES.has(language) ||
        url.hostname !== language + ".wikipedia.org" || !url.pathname.startsWith("/wiki/")) return false;
    const content = String(item.content || "").trim();
    if (content.length < 80 || content.length > 12000) return false;
    if (/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(content) ||
        /(?:api[_ -]?key|access[_ -]?token|password|secret)\s*[:=]/i.test(content)) return false;
    return { title: String(item.title || "").slice(0, 300), source: url.href,
      language, license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
      attribution: "Wikimedia contributors", fetchedAt: item.updatedAt || new Date().toISOString(),
      content, usage: "retrieval-only" };
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
  const parts = [];
  let total = 0;
  for await (const part of zip.outputStream) {
    total += part.length;
    if (total > MAX_BYTES) throw new Error("Knowledge ZIP exceeds 20 MiB.");
    parts.push(part);
  }
  return Buffer.concat(parts, total);
}
async function syncOnce(knowledgeStore) {
  if (active) return { skipped: true, reason: "sync already running" };
  if (!process.env.VAULT_URL || !process.env.VAULT_TOKEN) {
    latest = { ...latest, enabled: false, status: "not-configured" };
    return latest;
  }
  active = true;
  try {
    const exported = await knowledgeStore.exportDocuments();
    const unique = new Map();
    for (const item of exported) {
      const record = eligible(item);
      if (record) unique.set(record.source, record);
    }
    const documents = [...unique.values()].sort((a,b) => a.source.localeCompare(b.source));
    if (!documents.length) {
      latest = { enabled: true, status: "waiting-for-open-license-content", syncedAt: null, documents: 0, error: null };
      return latest;
    }
    const zip = await makeZip(documents);
    const sha256 = crypto.createHash("sha256").update(zip).digest("hex");
    const base = String(process.env.VAULT_URL).replace(/\/$/, "");
    const response = await fetch(base + "/api/vault/archive", {
      method: "PUT", headers: { Authorization: "Bearer " + process.env.VAULT_TOKEN,
        "Content-Type": "application/zip", "X-Archive-SHA256": sha256 },
      body: zip, signal: AbortSignal.timeout(60000)
    });
    if (!response.ok) throw new Error("Vault returned HTTP " + response.status);
    const result = await response.json();
    latest = { enabled: true, status: "synced", syncedAt: new Date().toISOString(),
      documents: documents.length, bytes: zip.length, sha256, archive: result.archive?.key || null, error: null };
    return latest;
  } catch (error) {
    latest = { ...latest, enabled: true, status: "error", error: String(error.message || error).slice(0, 180) };
    return latest;
  } finally { active = false; }
}
function start(knowledgeStore) {
  if (timer) return status();
  if (!process.env.VAULT_URL || !process.env.VAULT_TOKEN) return status();
  timer = setInterval(() => { void syncOnce(knowledgeStore); }, INTERVAL);
  if (timer.unref) timer.unref();
  setTimeout(() => { void syncOnce(knowledgeStore); }, 15000).unref?.();
  latest = { ...latest, enabled: true, status: "scheduled" };
  return status();
}
function status() { return { ...latest, intervalMs: INTERVAL, destination: process.env.VAULT_URL ? "private-second-server" : null }; }
module.exports = { start, syncOnce, status, eligible };
