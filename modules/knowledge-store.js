"use strict";
const fs = require("node:fs/promises");
const path = require("node:path");

const FILE = path.resolve(process.env.KNOWLEDGE_FILE || path.join(__dirname, "..", "data", "knowledge-base.json"));
const MAX_ITEMS = 5000;

async function readAll() {
  try {
    const data = JSON.parse(await fs.readFile(FILE, "utf8"));
    return Array.isArray(data.items) ? data.items : [];
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}
async function add(item) {
  if (!item || typeof item.text !== "string" || !item.text.trim()) return false;
  const items = await readAll();
  const key = String(item.url || item.title || item.text).slice(0, 1000);
  if (items.some(x => x.key === key)) return false;
  items.push({
    key, title: String(item.title || "Ochiq manba").slice(0, 180),
    text: item.text.trim().slice(0, 12000),
    url: String(item.url || "").slice(0, 1000),
    language: String(item.language || "unknown").slice(0, 12),
    source: String(item.source || "public").slice(0, 60),
    license: String(item.license || "Manba litsenziyasini tekshiring").slice(0, 160),
    savedAt: new Date().toISOString()
  });
  const trimmed = items.slice(-MAX_ITEMS);
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  const temp = FILE + ".tmp";
  await fs.writeFile(temp, JSON.stringify({ version: 1, items: trimmed }, null, 2), "utf8");
  await fs.rename(temp, FILE);
  return true;
}
function terms(text) {
  return String(text || "").toLocaleLowerCase().match(/[\\p{L}\\p{N}]{3,}/gu) || [];
}
async function search(query, limit = 5) {
  const q = [...new Set(terms(query))];
  if (!q.length) return [];
  const items = await readAll();
  return items.map(item => {
    const body = (item.title + " " + item.text).toLocaleLowerCase();
    const score = q.reduce((n, word) => n + (body.includes(word) ? 1 : 0), 0);
    return { ...item, score };
  }).filter(x => x.score > 0).sort((a,b) => b.score-a.score).slice(0, Math.min(10, Math.max(1, limit)));
}
async function stats() { return { count: (await readAll()).length, file: FILE }; }
module.exports = { add, search, stats, readAll };
