"use strict";

// Persistent, dependency-free hybrid lexical retrieval for ULUGBEK AI.
// Append-only JSONL storage avoids rewriting a growing corpus on every ingestion.
const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");
const vectorIndex = require("./vector-knowledge");
const { Pool } = require("pg");
const DATABASE_URL = String(process.env.DATABASE_URL || "").trim();
const DB_MAX_CHUNKS = Math.max(1000, Math.min(Number(process.env.KNOWLEDGE_DB_MAX_CHUNKS) || 10000, 50000));
let pool = null;
let dbInitialized = false;
let dbError = null;

function getPool() {
  if (!DATABASE_URL) return null;
  if (!pool) {
    pool = new Pool({
      connectionString: DATABASE_URL,
      max: 2,
      connectionTimeoutMillis: 7000,
      idleTimeoutMillis: 10000,
      keepAlive: true
    });
    pool.on("error", error => { dbError = String(error.message || error).slice(0, 180); });
  }
  return pool;
}
async function ensureDatabase() {
  if (!DATABASE_URL) return false;
  if (dbInitialized) return true;
  const db = getPool();
  await db.query(`
    CREATE TABLE IF NOT EXISTS ulugbek_knowledge_chunks (
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL,
      title TEXT NOT NULL,
      author TEXT NOT NULL DEFAULT '',
      source TEXT NOT NULL,
      language TEXT NOT NULL DEFAULT 'auto',
      content_hash TEXT NOT NULL,
      chunk_index INTEGER NOT NULL,
      chunk_count INTEGER NOT NULL,
      text TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL,
      usage TEXT NOT NULL DEFAULT 'retrieval-only'
    )
  `);
  await db.query("CREATE INDEX IF NOT EXISTS ulugbek_knowledge_document_idx ON ulugbek_knowledge_chunks (document_id, updated_at DESC)");
  await db.query("CREATE INDEX IF NOT EXISTS ulugbek_knowledge_source_idx ON ulugbek_knowledge_chunks (source)");
  dbInitialized = true;
  dbError = null;
  return true;
}
function mapDatabaseRow(row) {
  return {
    id: row.id, documentId: row.document_id, title: row.title, author: row.author,
    source: row.source, language: row.language, contentHash: row.content_hash,
    chunkIndex: Number(row.chunk_index), chunkCount: Number(row.chunk_count), text: row.text,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(), usage: row.usage
  };
}

const ROOT = path.resolve(process.env.ULUGBEK_KNOWLEDGE_DIR ||
  path.join(process.env.ULUGBEK_DATA_DIR || path.join(__dirname, "..", "data"), "knowledge-base"));
const FILE = path.join(ROOT, "chunks.jsonl");
const CHUNK_CHARS = 1800;
const OVERLAP_CHARS = 240;
let records = null;
let postings = null;
let lengths = [];
let averageLength = 1;
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
function buildIndex() {
  postings = new Map();
  lengths = new Array(records.length);
  let totalLength = 0;
  records.forEach((record, index) => {
    const bodyTerms = terms(record.text);
    lengths[index] = bodyTerms.length;
    totalLength += bodyTerms.length;
    const frequencies = new Map();
    for (const token of bodyTerms) frequencies.set(token, (frequencies.get(token) || 0) + 1);
    for (const [token, frequency] of frequencies) {
      if (!postings.has(token)) postings.set(token, new Map());
      postings.get(token).set(index, frequency);
    }
  });
  averageLength = records.length ? Math.max(1, totalLength / records.length) : 1;
}
async function load() {
  if (records) return records;
  if (DATABASE_URL) {
    try {
      await ensureDatabase();
      const result = await getPool().query(
        "SELECT id, document_id, title, author, source, language, content_hash, chunk_index, chunk_count, text, created_at, updated_at, usage FROM ulugbek_knowledge_chunks ORDER BY updated_at DESC LIMIT $1",
        [DB_MAX_CHUNKS]
      );
      records = result.rows.map(mapDatabaseRow);
      buildIndex();
      dbError = null;
      return records;
    } catch (error) {
      dbError = String(error.message || error).slice(0, 180);
      throw error;
    }
  }
  await fs.mkdir(ROOT, { recursive: true });
  let raw = "";
  try { raw = await fs.readFile(FILE, "utf8"); } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  const parsed = raw.split("\n").filter(Boolean).flatMap(line => {
    try {
      const item = JSON.parse(line);
      return item && item.id && item.text ? [item] : [];
    } catch (_) { return []; }
  });
  const latest = new Map();
  for (const item of parsed) {
    const previous = latest.get(item.documentId);
    if (!previous || String(item.updatedAt) > String(previous.updatedAt)) latest.set(item.documentId, item);
  }
  records = parsed.filter(item => latest.get(item.documentId)?.contentHash === item.contentHash);
  buildIndex();
  return records;
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
  const next = writeQueue.then(async () => {
    const current = await load();
    const remaining = current.filter(item => item.documentId !== id);
    const added = pieces.map((part, index) => ({
      id: hash(id + ":" + digest + ":" + index + ":" + part).slice(0, 32),
      documentId: id, title, author: String(input.author || "").slice(0, 200),
      source, language: String(input.language || "auto").slice(0, 24),
      contentHash: digest, chunkIndex: index, chunkCount: pieces.length,
      text: part, createdAt: now, updatedAt: now, usage: "retrieval-only"
    }));
    if (DATABASE_URL) {
      const db = getPool();
      await ensureDatabase();
      const client = await db.connect();
      try {
        await client.query("BEGIN");
        await client.query("DELETE FROM ulugbek_knowledge_chunks WHERE document_id = $1", [id]);
        for (const item of added) {
          await client.query(
            "INSERT INTO ulugbek_knowledge_chunks (id, document_id, title, author, source, language, content_hash, chunk_index, chunk_count, text, created_at, updated_at, usage) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) ON CONFLICT (id) DO UPDATE SET title=EXCLUDED.title, author=EXCLUDED.author, source=EXCLUDED.source, language=EXCLUDED.language, content_hash=EXCLUDED.content_hash, chunk_index=EXCLUDED.chunk_index, chunk_count=EXCLUDED.chunk_count, text=EXCLUDED.text, updated_at=EXCLUDED.updated_at, usage=EXCLUDED.usage",
            [item.id, item.documentId, item.title, item.author, item.source, item.language,
              item.contentHash, item.chunkIndex, item.chunkCount, item.text, item.createdAt, item.updatedAt, item.usage]
          );
        }
        await client.query("COMMIT");
        dbError = null;
      } catch (error) {
        try { await client.query("ROLLBACK"); } catch (_) {}
        dbError = String(error.message || error).slice(0, 180);
        throw error;
      } finally {
        client.release();
      }
    } else {
      await fs.mkdir(ROOT, { recursive: true });
      await fs.appendFile(FILE, added.map(item => JSON.stringify(item)).join("\n") + "\n", { encoding: "utf8", mode: 0o600 });
    }
    records = remaining.concat(added);
    buildIndex();
    let vector = { enabled: false, indexed: 0 };
    try { vector = await vectorIndex.upsertDocument(added); }
    catch (error) { vector = { enabled: true, indexed: 0, error: error.message.slice(0, 180) }; }
    return { ok: true, documentId: id, chunks: pieces.length, characters: text.length,
      source, contentHash: digest, vector };
  });
  writeQueue = next.catch(() => {});
  return next;
}
async function search(query, limit = 6) {
  const text = String(query || "").trim().slice(0, 1000);
  if (vectorIndex.configured()) {
    try {
      const semantic = await vectorIndex.search(text, limit);
      if (semantic.length) return semantic;
    } catch (error) {
      // Keep the service available with local BM25 if the optional vector stack is down.
      console.warn("Multilingual vector search fallback:", error.message);
    }
  }
  const queryTerms = [...new Set(terms(text))].slice(0, 18);
  if (!queryTerms.length) return [];
  const all = await load();
  const phrase = text.toLocaleLowerCase("und").replace(/\s+/g, " ");
  const scores = new Map();
  for (const token of queryTerms) {
    const found = postings.get(token);
    if (!found) continue;
    const df = found.size;
    const idf = Math.log(1 + (all.length - df + 0.5) / (df + 0.5));
    for (const [index, tf] of found) {
      const length = lengths[index] || 1;
      const denominator = tf + 1.2 * (0.25 + 0.75 * length / averageLength);
      const bm25 = idf * (tf * 2.2) / denominator;
      scores.set(index, (scores.get(index) || 0) + bm25);
    }
  }
  const ranked = [];
  for (const [index, baseScore] of scores) {
    const record = all[index];
    const titleTerms = terms(record.title);
    let score = baseScore + queryTerms.reduce((sum, token) => sum + (titleTerms.includes(token) ? 1.5 : 0), 0);
    if (phrase && record.title.toLocaleLowerCase("und").includes(phrase)) score += 5;
    if (phrase && record.text.toLocaleLowerCase("und").includes(phrase)) score += 1.5;
    ranked.push({ record, score });
  }
  return ranked.sort((a, b) => b.score - a.score || b.record.updatedAt.localeCompare(a.record.updatedAt))
    .slice(0, Math.max(1, Math.min(Number(limit) || 6, 12)))
    .map(({ record, score }) => ({
      title: record.title, author: record.author, source: record.source,
      language: record.language, content: record.text, score: Number(score.toFixed(4)),
      chunkIndex: record.chunkIndex, documentId: record.documentId, updatedAt: record.updatedAt
    }));
}
async function reindexVectors(limit = 500, offset = 0) {
  if (!vectorIndex.configured()) throw new Error("EMBEDDING_API_URL va QDRANT_URL sozlanmagan");
  const all = await load();
  const groups = new Map();
  for (const item of all) {
    if (!groups.has(item.documentId)) groups.set(item.documentId, []);
    groups.get(item.documentId).push(item);
  }
  const safeOffset = Math.max(0, Number(offset) || 0);
  const selected = [...groups.values()].slice(safeOffset, safeOffset + Math.max(1, Math.min(Number(limit) || 500, 2000)));
  let indexedDocuments = 0, indexedChunks = 0, errors = 0;
  for (const chunks of selected) {
    try {
      const result = await vectorIndex.upsertDocument(chunks);
      indexedDocuments += 1;
      indexedChunks += result.indexed || 0;
    } catch (_) { errors += 1; }
  }
  return { processedDocuments: selected.length, totalDocuments: groups.size,
    indexedDocuments, indexedChunks, errors, offset: safeOffset,
    nextOffset: safeOffset + selected.length < groups.size ? safeOffset + selected.length : null,
    remaining: Math.max(0, groups.size - safeOffset - selected.length) };
}

async function status() {
  const all = await load();
  const docs = new Set(all.map(item => item.documentId));
  let bytes = 0;
  if (DATABASE_URL) {
    try {
      const result = await getPool().query("SELECT pg_total_relation_size('ulugbek_knowledge_chunks') AS bytes");
      bytes = Number(result.rows[0]?.bytes || 0);
    } catch (error) { dbError = String(error.message || error).slice(0, 180); }
  } else {
    try { bytes = (await fs.stat(FILE)).size; } catch (_) {}
  }
  const vector = await vectorIndex.status();
  return { ready: true, engine: vector.enabled && vector.ready !== false
      ? "multilingual-vector-with-bm25-fallback" : "ulugbek-inverted-index-bm25-v1",
    documents: docs.size, chunks: all.length, vocabulary: postings.size, bytes,
    storage: DATABASE_URL ? "neon-postgresql" : ROOT,
    persistentVolumeRequired: !DATABASE_URL,
    database: { configured: Boolean(DATABASE_URL), ready: Boolean(DATABASE_URL && dbInitialized && !dbError), error: dbError },
    vector };
}
async function exportDocuments() {
  const all = await load();
  const groups = new Map();
  for (const item of all) {
    if (!groups.has(item.documentId)) groups.set(item.documentId, []);
    groups.get(item.documentId).push(item);
  }
  return [...groups.values()].map(chunks => {
    chunks.sort((a, b) => Number(a.chunkIndex) - Number(b.chunkIndex));
    const first = chunks[0];
    return {
      title: first.title, author: first.author || "", source: first.source,
      language: first.language || "auto",
      content: chunks.map(item => item.text).join("\n\n"),
      contentHash: first.contentHash, chunks: chunks.length,
      updatedAt: first.updatedAt, usage: "retrieval-only"
    };
  });
}
module.exports = { ingest, search, status, splitText, terms, reindexVectors, exportDocuments };
