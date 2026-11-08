"use strict";

// Optional Qdrant + multilingual embedding service. BM25 remains the safe fallback.
const crypto = require("node:crypto");

const embeddingUrl = () => String(process.env.EMBEDDING_API_URL || "").replace(/\/$/, "");
const qdrantUrl = () => String(process.env.QDRANT_URL || "").replace(/\/$/, "");
const collection = process.env.QDRANT_COLLECTION || "ulugbek_knowledge_v1";
const dimension = Number(process.env.EMBEDDING_DIMENSION || 1024);

function headers(json = true) {
  const out = {};
  if (json) out["content-type"] = "application/json";
  if (process.env.QDRANT_API_KEY) out["api-key"] = process.env.QDRANT_API_KEY;
  return out;
}
function pointId(value) {
  const hex = crypto.createHash("sha256").update(value).digest("hex").slice(0, 32);
  return hex.slice(0,8)+"-"+hex.slice(8,12)+"-5"+hex.slice(13,16)+"-a"+hex.slice(17,20)+"-"+hex.slice(20,32);
}
async function request(url, options = {}) {
  const response = await fetch(url, { ...options, signal: AbortSignal.timeout(20000) });
  const body = await response.text();
  if (!response.ok) throw new Error("Vector service HTTP " + response.status + ": " + body.slice(0, 240));
  return body ? JSON.parse(body) : {};
}
function configured() { return Boolean(embeddingUrl() && qdrantUrl()); }

async function embed(texts) {
  if (!embeddingUrl()) throw new Error("EMBEDDING_API_URL is not configured");
  const output = [];
  for (let offset = 0; offset < texts.length; offset += 32) {
    const batch = texts.slice(offset, offset + 32);
    const result = await request(embeddingUrl() + "/embed", {
      method: "POST",
      headers: { "content-type": "application/json", ...(process.env.EMBEDDING_API_TOKEN ? { authorization: "Bearer " + process.env.EMBEDDING_API_TOKEN } : {}) },
      body: JSON.stringify({ texts: batch })
    });
    if (!Array.isArray(result.vectors) || result.vectors.length !== batch.length ||
        result.vectors.some(v => !Array.isArray(v) || v.length !== dimension)) {
      throw new Error("Embedding model returned an unexpected vector shape");
    }
    output.push(...result.vectors);
  }
  return output;
}
async function ensureCollection() {
  const base = qdrantUrl() + "/collections/" + encodeURIComponent(collection);
  try { await request(base, { headers: headers(false) }); return; }
  catch (error) {
    if (!String(error.message).includes("HTTP 404")) throw error;
  }
  try {
    await request(base, { method: "PUT", headers: headers(), body: JSON.stringify({
      vectors: { size: dimension, distance: "Cosine" },
      optimizers_config: { indexing_threshold: 10000 }
    }) });
  } catch (error) {
    if (!String(error.message).includes("HTTP 409")) throw error;
  }
}
async function upsertDocument(chunks) {
  if (!configured()) return { enabled: false, indexed: 0 };
  if (!chunks.length) return { enabled: true, indexed: 0 };
  await ensureCollection();
  const vectors = await embed(chunks.map(item => item.text));
  const points = chunks.map((item, i) => ({
    id: pointId(item.id),
    vector: vectors[i],
    payload: {
      document_id: item.documentId, title: item.title, author: item.author,
      source: item.source, language: item.language, content: item.text,
      chunk_index: item.chunkIndex, content_hash: item.contentHash,
      updated_at: item.updatedAt
    }
  }));
  const documentId = chunks[0].documentId;
  await request(qdrantUrl() + "/collections/" + encodeURIComponent(collection) + "/points/delete?wait=true", {
    method: "POST", headers: headers(), body: JSON.stringify({ filter: { must: [{ key: "document_id", match: { value: documentId } }] } })
  });
  await request(qdrantUrl() + "/collections/" + encodeURIComponent(collection) + "/points?wait=true", {
    method: "PUT", headers: headers(), body: JSON.stringify({ points })
  });
  return { enabled: true, indexed: points.length };
}
async function search(query, limit = 6) {
  if (!configured()) return [];
  await ensureCollection();
  const [vector] = await embed([query]);
  const result = await request(qdrantUrl() + "/collections/" + encodeURIComponent(collection) + "/points/search", {
    method: "POST", headers: headers(),
    body: JSON.stringify({ vector, limit: Math.max(1, Math.min(Number(limit) || 6, 12)),
      with_payload: true, score_threshold: Number(process.env.VECTOR_SCORE_THRESHOLD || 0.25) })
  });
  return (result.result || []).map(item => ({
    title: item.payload.title, author: item.payload.author, source: item.payload.source,
    language: item.payload.language, content: item.payload.content,
    score: item.score, chunkIndex: item.payload.chunk_index,
    documentId: item.payload.document_id, updatedAt: item.payload.updated_at,
    retrieval: "multilingual-vector"
  }));
}
async function status() {
  if (!configured()) return { enabled: false, engine: "bm25-fallback", reason: "Embedding API and Qdrant URL are not both configured" };
  try {
    const result = await request(qdrantUrl() + "/collections/" + encodeURIComponent(collection), { headers: headers(false) });
    return { enabled: true, engine: "BAAI/bge-m3 + Qdrant cosine", model: "BAAI/bge-m3",
      dimension, collection, points: result.result?.points_count ?? null };
  } catch (error) {
    return { enabled: true, ready: false, engine: "BAAI/bge-m3 + Qdrant cosine", error: error.message.slice(0, 200) };
  }
}
module.exports = { configured, upsertDocument, search, status };
