"use strict";

// Persistent, source-attributed cache of public pages read for user questions.
// This is retrieval memory, not model training and not a claim that every fact is verified.
const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");

const DATA_DIR = path.resolve(process.env.ULUGBEK_DATA_DIR || path.join(__dirname, "..", "data"));
const FILE = path.join(DATA_DIR, "research-cache.json");
const MAX_ITEMS = 1000;
const MAX_CONTENT = 8000;
const STOP_WORDS = new Set([
  "the","and","for","with","that","this","from","what","when","where","which","who","how","why",
  "are","was","were","is","in","on","at","to","of","a","an","or","as","by","be","can","do",
  "bu","shu","ular","uchun","bilan","qanday","qaysi","nima","kim","qachon","qayerda","nega",
  "haqida","kerak","ber","menga","iltimos","men","sen","siz","biz","va","yoki","ham","emas",
  "это","как","что","для","при","или","где","когда","почему","кто","она","они","его","ее"
]);
let writeChain = Promise.resolve();

function tokens(value) {
  return [...new Set(String(value || "").toLocaleLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(term => term.length > 2 && !STOP_WORDS.has(term)))];
}
function scoreEntry(query, item) {
  const queryTerms = tokens(query);
  if (!queryTerms.length) return 0;
  const title = tokens(item.title);
  const body = tokens(item.content);
  const titleSet = new Set(title);
  const bodySet = new Set(body);
  let score = 0;
  for (const term of queryTerms) {
    if (titleSet.has(term)) score += 3;
    else if (bodySet.has(term)) score += 1;
  }
  const coverage = queryTerms.filter(term => titleSet.has(term) || bodySet.has(term)).length;
  return coverage >= Math.min(2, queryTerms.length) ? score : 0;
}
async function readAll() {
  try {
    const data = JSON.parse(await fs.readFile(FILE, "utf8"));
    return Array.isArray(data) ? data.slice(-MAX_ITEMS) : [];
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}
async function save(results, query = "") {
  const candidates = (Array.isArray(results) ? results : []).filter(item =>
    item && item.pageRead === true && typeof item.url === "string" &&
    item.url.startsWith("https://") && typeof item.snippet === "string" &&
    item.snippet.trim().length >= 120
  ).slice(0, 8);
  if (!candidates.length) return { saved: 0 };
  const current = await readAll();
  const known = new Set(current.map(item => item.source));
  const additions = [];
  for (const item of candidates) {
    if (known.has(item.url)) continue;
    known.add(item.url);
    additions.push({
      id: crypto.randomUUID(),
      title: String(item.title || "Ochiq manba").slice(0, 220),
      content: item.snippet.slice(0, MAX_CONTENT),
      source: item.url,
      query: String(query || "").slice(0, 500),
      sourceHost: String(item.host || ""),
      sourceQuality: Number(item.qualityScore) || 1,
      status: "retrieved-unverified",
      fetchedAt: new Date().toISOString()
    });
  }
  if (!additions.length) return { saved: 0 };
  const next = [...current, ...additions].slice(-MAX_ITEMS);
  const snapshot = JSON.stringify(next, null, 2);
  writeChain = writeChain.then(async () => {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const temp = FILE + ".tmp";
    await fs.writeFile(temp, snapshot, { mode: 0o600 });
    await fs.rename(temp, FILE);
  });
  await writeChain;
  return { saved: additions.length };
}
async function search(query, limit = 5) {
  const items = await readAll();
  return items.map(item => ({ ...item, score: scoreEntry(query, item) }))
    .filter(item => item.score > 0 && item.status === "retrieved-unverified")
    .sort((a, b) => b.score - a.score || b.fetchedAt.localeCompare(a.fetchedAt))
    .slice(0, Math.max(1, Math.min(10, Number(limit) || 5)));
}
async function status() {
  const items = await readAll();
  return {
    ok: true,
    count: items.length,
    status: "retrieved-unverified",
    storage: FILE,
    maxItems: MAX_ITEMS,
    modelTraining: false,
    note: "Ochiq sahifalar manbasi bilan saqlanadi; bu model vaznlarini o‘qitmaydi va faktni avtomatik tasdiqlamaydi."
  };
}
module.exports = { tokens, scoreEntry, readAll, save, search, status };
