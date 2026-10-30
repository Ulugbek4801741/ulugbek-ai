"use strict";

// API-key-free public knowledge worker. It stores sourced notes, not model weights.
const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");
const DATA_DIR = path.join(__dirname, "data");
const FILE = path.join(DATA_DIR, "knowledge.json");
const DURATION_MS = 60 * 60 * 1000;
const INTERVAL_MS = 5 * 60 * 1000;
const TOPICS = [
  "artificial intelligence", "machine learning", "computer programming",
  "renewable energy", "robotics", "mathematics", "physics",
  "biology", "world history", "economics", "cybersecurity", "Uzbekistan"
];
let state = { running: false, startedAt: null, endsAt: null, cycles: 0, saved: 0, lastError: null, lastTopic: null };
let timer = null;
let cursor = 0;
let chain = Promise.resolve();

function clean(value, max = 4000) {
  return String(value || "").replace(/<[^>]*>/g, " ").replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">").replace(/\s+/g, " ").trim().slice(0, max);
}
async function readKnowledge() {
  try {
    const data = JSON.parse(await fs.readFile(FILE, "utf8"));
    return Array.isArray(data) ? data : [];
  } catch (e) { if (e.code === "ENOENT") return []; throw e; }
}
async function writeKnowledge(items) {
  chain = chain.then(async () => {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const temp = FILE + ".learning.tmp";
    await fs.writeFile(temp, JSON.stringify(items.slice(-2000), null, 2), { mode: 0o600 });
    await fs.rename(temp, FILE);
  });
  return chain;
}
async function learnTopic(topic) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const url = new URL("https://en.wikipedia.org/w/api.php");
    url.search = new URLSearchParams({ action:"query", list:"search", srsearch:topic, srlimit:"3", format:"json" }).toString();
    const response = await fetch(url, {
      headers: { "User-Agent":"ULUGBEK-AI-OpenKnowledge/1.0 (public encyclopedia research)" },
      signal: controller.signal, redirect: "error"
    });
    if (!response.ok) throw new Error("Wikipedia qidiruvi HTTP " + response.status);
    const payload = await response.json();
    const hits = Array.isArray(payload?.query?.search) ? payload.query.search.slice(0,3) : [];
    const current = await readKnowledge();
    const known = new Set(current.map(x => x.source).filter(Boolean));
    const additions = [];
    for (const hit of hits) {
      const title = clean(hit.title, 180);
      if (!title) continue;
      const page = "https://en.wikipedia.org/api/rest_v1/page/summary/" + encodeURIComponent(title.replace(/ /g,"_"));
      const r = await fetch(page, { headers: { "User-Agent":"ULUGBEK-AI-OpenKnowledge/1.0" }, signal:controller.signal, redirect:"error" });
      if (!r.ok) continue;
      const item = await r.json();
      const content = clean(item.extract, 4000);
      const source = item.content_urls?.desktop?.page;
      if (!content || typeof source !== "string" || !source.startsWith("https://en.wikipedia.org/") || known.has(source)) continue;
      known.add(source);
      additions.push({
        id: crypto.randomUUID(), title: clean(item.title || title,180), content, source,
        agent:"AutonomousOpenKnowledge", status:"approved", quality:"public-encyclopedia-summary",
        createdAt:new Date().toISOString()
      });
    }
    if (additions.length) {
      await writeKnowledge([...current, ...additions]);
      state.saved += additions.length;
    }
    state.cycles++;
    state.lastTopic = topic;
    state.lastError = null;
    return additions.length;
  } finally { clearTimeout(timeout); }
}
async function cycle() {
  if (!state.running || Date.now() >= Date.parse(state.endsAt)) {
    stop();
    return;
  }
  const topic = TOPICS[cursor++ % TOPICS.length];
  try { await learnTopic(topic); }
  catch (e) { state.lastError = clean(e.message, 240); }
  if (state.running && Date.now() < Date.parse(state.endsAt)) {
    timer = setTimeout(cycle, INTERVAL_MS);
  } else stop();
}
function start() {
  if (state.running) return status();
  state = { running:true, startedAt:new Date().toISOString(),
    endsAt:new Date(Date.now()+DURATION_MS).toISOString(), cycles:0, saved:0,
    lastError:null, lastTopic:null };
  cycle();
  return status();
}
function stop() {
  state.running = false;
  if (timer) clearTimeout(timer);
  timer = null;
}
function status() { return { ...state, durationMinutes:60, intervalMinutes:5, mode:"public-source-knowledge-retrieval", modelWeightsRetrained:false }; }
function searchKnowledge(query, limit=5) {
  const terms = clean(query,500).toLocaleLowerCase().split(/[^\p{L}\p{N}]+/u).filter(x=>x.length>2);
  if (!terms.length) return [];
  return readKnowledge().then(items => items.map(item => {
    const text = (item.title+" "+item.content).toLocaleLowerCase();
    const score = terms.reduce((n,term)=>n+(text.includes(term)?1:0),0);
    return { ...item, score };
  }).filter(x=>x.score>0 && x.status==="approved").sort((a,b)=>b.score-a.score).slice(0,limit));
}
function buildLocalReply(query, hits) {
  return require("./native-cognition").respond(query, hits);
}
module.exports = { start, stop, status, searchKnowledge, buildLocalReply };
