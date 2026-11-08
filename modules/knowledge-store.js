"use strict";

// Persistent, dependency-free knowledge store for ULUGBEK AI.
// Store text chunks and metadata on the server's persistent data volume.
const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");

const ROOT = path.resolve(process.env.ULUGBEK_KNOWLEDGE_DIR ||
  path.join(process.env.ULUGBEK_DATA_DIR || path.join(__dirname, "..", "data"), "knowledge-base"));
const FILE = path.join(ROOT, "chunks.jsonl");
const CHUNK_CHARS = 1800;
const OVERLAP_CHARS = 240;
let records = null;
let writeQueue = Promise.resolve();

function hash(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}
function terms(value) {
  return (String(value || "").toLocaleLowerCase("und").match(/[\p{L}\p{N}][\p{L}\p{N}_'-]*/gu) || [])
    .filter(token => token.length > 1);
}
function splitText(value) {
  const text = String(value || "").replace(/\r/g, "").replace(/[\t ]+/g, " ").trim();
  const chunks = [];
  let start = 0;
  while (start < text.length) {
    let end = Math.min(text.length, start + CHUNK_CHARS);
    if (end < text.length) {
      const boundary = Math.max(text.lastIndexOf("\n", end), text.lastIndexOf(". ", end), text.lastIndexOf(" ", end));
      if (boundary > start + Math.floor(CHUNK_CHARS * 0.55)) end = boundary + 1;
    }
    const part = text.slice(start, end).trim();
    if (part.length >= 40) chunks.push(part);
    if (end >= text.length) break;
    start = Math.max(start + 1, end - OVERLAP_CHARS);
  }
  return chunks;
}
async function load() {
  if (records) return records;
  await fs.mkdir(ROOT, { recursive: true });
  let raw = "";
  try { raw = await fs.readFile(FILE, "utf8"); } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  records = raw.split("\n").filter(Boolean).flatMap(line => {
    try {
      const item = JSON.parse(line);
      return item && item.id && item.text ? [item] : [];
    } catch (_) { return []; }
  });
  return records;
}
async function persist(next) {
  await fs.mkdir(ROOT, { recursive: true });
  const temp = FILE + ".tmp";
  await fs.writeFile(temp, next.map(item => JSON.stringify(item)).join("\n") + (next.length ? "\n" : ""), { mode: 0o600 });
  await fs.rename(temp, FILE);
  records = next;
}
async function ingest(input = {}) {
  const title = String(input.title || "").trim().slice(0, 300);
  const text = String(input.content || "").trim();
  const source = String(input.source || "user://uploaded-text").trim().slice(0, 1200);
  if (!title) throw Object.assign(new Error("Bilim sarlavhasi kerak."), { statusCode: 400 });
  if (text.length < 80) throw Object.assign(new Error("Matn kamida 80 belgi bo‘lishi kerak."), { statusCode: 400 });
  if (text.length > 1_000_000) throw Object.assign(new Error("Bitta hujjat 1 MB dan oshmasligi kerak."), { statusCode: 413 });
  if (!/^(https:\/\/|user:\/\/|local:\/\/)/i.test(source)) {
    throw Object.assign(new Error("Manba HTTPS yoki ichki user://, local:// identifikatori bo‘lishi kerak."), { statusCode: 400 });
  }
  const digest = hash(source + "\n" + text);
  const id = hash(source).slice(0, 24);
  const now = new Date().toISOString();
  const pieces = splitText(text);
  const next = (await load()).filter(item => item.documentId !== id);
  pieces.forEach((part, index) => next.push({
    id: hash(id + ":" + index + ":" + part).slice(0, 32),
    documentId: id, title, author: String(input.author || "").slice(0, 200),
    source, language: String(input.language || "auto").slice(0, 24),
    contentHash: digest, chunkIndex: index, chunkCount: pieces.length,
    text: part, createdAt: now, updatedAt: now,
    usage: "retrieval-only"
  }));
  writeQueue = writeQueue.then(() => persist(next));
  await writeQueue;
  return { ok: true, documentId: id, chunks: pieces.length, characters: text.length, source, contentHash: digest };
}
function scoreRecord(record, queryTerms, queryPhrase) {
  const body = terms(record.text);
  const title = terms(record.title);
  const counts = new Map();
  for (const token of body) counts.set(token, (counts.get(token) || 0) + 1);
  let score = 0;
  for (const token of queryTerms) {
    const tf = counts.get(token) || 0;
    if (tf) score += (1 + Math.log(tf)) * (title.includes(token) ? 3.5 : 1);
  }
  const titleText = record.title.toLocaleLowerCase("und");
  const bodyText = record.text.toLocaleLowerCase("und");
  if (queryPhrase && titleText.includes(queryPhrase)) score += 7;
  if (queryPhrase && bodyText.includes(queryPhrase)) score += 2;
  return score / Math.sqrt(Math.max(1, body.length));
}
async function search(query, limit = 6) {
  const text = String(query || "").trim().slice(0, 1000);
  const queryTerms = [...new Set(terms(text))].slice(0, 18);
  if (!queryTerms.length) return [];
  const queryPhrase = text.toLocaleLowerCase("und").replace(/\s+/g, " ");
  const all = await load();
  return all.map(record => ({ record, score: scoreRecord(record, queryTerms, queryPhrase) }))
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score || b.record.updatedAt.localeCompare(a.record.updatedAt))
    .slice(0, Math.max(1, Math.min(Number(limit) || 6, 12)))
    .map(({ record, score }) => ({
      title: record.title, author: record.author, source: record.source,
      language: record.language, content: record.text, score: Number(score.toFixed(4)),
      chunkIndex: record.chunkIndex, documentId: record.documentId,
      updatedAt: record.updatedAt
    }));
}
async function status() {
  const all = await load();
  const docs = new Set(all.map(item => item.documentId));
  let bytes = 0;
  try { bytes = (await fs.stat(FILE)).size; } catch (_) {}
  return { ready: true, engine: "ulugbek-local-lexical-rag-v1", documents: docs.size,
    chunks: all.length, bytes, storage: ROOT, persistentVolumeRequired: true,
    vectorEmbeddings: false, note: "Local lexical retrieval is active; semantic embeddings can be added as a separate optional index." };
}
module.exports = { ingest, search, status, splitText, terms };
