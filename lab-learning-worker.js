"use strict";

// Continuous, API-key-free public knowledge retrieval.
// This stores sourced candidate notes; it does NOT train model weights or execute downloaded code.
const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");

const DATA_DIR = path.resolve(process.env.ULUGBEK_DATA_DIR || path.join(__dirname, "data"));
const FILE = path.join(DATA_DIR, "knowledge.json");
const STATE_FILE = path.join(DATA_DIR, "learning-worker-state.json");
const INTERVAL_MS = Math.max(60_000, Number(process.env.LEARNING_INTERVAL_MS) || 5 * 60_000);
const REQUEST_TIMEOUT_MS = 15_000;
const MAX_RESPONSE_BYTES = 1_000_000;
const MAX_KNOWLEDGE_ITEMS = 2000;
const TOPICS = [
  "JavaScript programming", "Node.js documentation", "web security",
  "HTML CSS accessibility", "HTTP APIs", "database fundamentals",
  "artificial intelligence", "machine learning", "software testing",
  "Git version control", "Android development", "Python programming"
];

let state = {
  enabled: true, running: false, startedAt: null, lastCycleAt: null,
  lastSuccessAt: null, cycles: 0, saved: 0, lastError: null, lastTopic: null
};
let timer = null;
let cursor = 0;
let inFlight = false;
let stopRequested = false;
let writeChain = Promise.resolve();

function clean(value, max = 4000) {
  return String(value || "").replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&").replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'").replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">").replace(/\s+/g, " ").trim().slice(0, max);
}
async function readKnowledge() {
  try {
    const data = JSON.parse(await fs.readFile(FILE, "utf8"));
    return Array.isArray(data) ? data.slice(-MAX_KNOWLEDGE_ITEMS) : [];
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}
async function writeKnowledge(items) {
  const snapshot = JSON.stringify(items.slice(-MAX_KNOWLEDGE_ITEMS), null, 2);
  writeChain = writeChain.then(async () => {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const temp = FILE + ".learning.tmp";
    await fs.writeFile(temp, snapshot, { mode: 0o600 });
    await fs.rename(temp, FILE);
  });
  return writeChain;
}
async function readJsonResponse(response) {
  if (!response.ok) throw new Error("Ochiq manba HTTP " + response.status);
  const declared = Number(response.headers.get("content-length") || 0);
  if (declared > MAX_RESPONSE_BYTES) throw new Error("Manba javobi hajmi limitdan oshdi.");
  const raw = await response.text();
  if (Buffer.byteLength(raw, "utf8") > MAX_RESPONSE_BYTES) throw new Error("Manba javobi hajmi limitdan oshdi.");
  return JSON.parse(raw);
}
async function fetchPublicJson(url, signal) {
  const parsed = new URL(url);
  if (parsed.protocol !== "https:" || parsed.hostname !== "en.wikipedia.org") {
    throw new Error("Tadqiqot manbasi ruxsat etilgan domen ro‘yxatida emas.");
  }
  const response = await fetch(parsed, {
    headers: {
      "User-Agent": "ULUGBEK-AI-OpenKnowledge/1.1 (public read-only research)",
      "Accept": "application/json"
    },
    signal,
    redirect: "error"
  });
  return readJsonResponse(response);
}
async function learnTopic(topic) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const url = new URL("https://en.wikipedia.org/w/api.php");
    url.search = new URLSearchParams({
      action: "query", list: "search", srsearch: topic,
      srlimit: "3", format: "json"
    }).toString();
    const payload = await fetchPublicJson(url.href, controller.signal);
    const hits = Array.isArray(payload?.query?.search) ? payload.query.search.slice(0, 3) : [];
    const current = await readKnowledge();
    const known = new Set(current.map(item => item.source).filter(Boolean));
    const additions = [];

    for (const hit of hits) {
      if (stopRequested) break;
      const title = clean(hit.title, 180);
      if (!title) continue;
      const summaryUrl = "https://en.wikipedia.org/api/rest_v1/page/summary/" +
        encodeURIComponent(title.replace(/ /g, "_"));
      const item = await fetchPublicJson(summaryUrl, controller.signal);
      const content = clean(item.extract, 4000);
      const source = item.content_urls?.desktop?.page;
      if (!content || typeof source !== "string" ||
          !source.startsWith("https://en.wikipedia.org/wiki/") || known.has(source)) continue;

      known.add(source);
      additions.push({
        id: crypto.randomUUID(),
        title: clean(item.title || title, 180),
        content,
        source,
        agent: "AutonomousResearchAgent",
        status: "pending-review",
        quality: "public-encyclopedia-summary-unverified",
        licenseNote: "Manba litsenziyasi va attribution talablari tekshirilishi kerak.",
        createdAt: new Date().toISOString()
      });
    }

    if (additions.length) {
      await writeKnowledge([...current, ...additions]);
      state.saved += additions.length;
    }
    state.cycles += 1;
    state.lastTopic = topic;
    state.lastSuccessAt = new Date().toISOString();
    state.lastError = null;
    return additions.length;
  } finally {
    clearTimeout(timeout);
  }
}
async function cycle() {
  if (!state.enabled || stopRequested || inFlight) return;
  inFlight = true;
  state.running = true;
  state.lastCycleAt = new Date().toISOString();
  const topic = TOPICS[cursor++ % TOPICS.length];
  try {
    await learnTopic(topic);
  } catch (error) {
    state.lastError = clean(error.name === "AbortError" ? "Ochiq manba so‘rovi vaqti tugadi." : error.message, 240);
  } finally {
    inFlight = false;
    if (state.enabled && !stopRequested) {
      timer = setTimeout(cycle, INTERVAL_MS);
    } else {
      state.running = false;
    }
  }
}
function start() {
  if (state.enabled && (state.running || timer || inFlight)) return status();
  stopRequested = false;
  state.enabled = true;
  state.running = true;
  state.startedAt = state.startedAt || new Date().toISOString();
  state.lastError = null;
  void cycle();
  return status();
}
function stop() {
  stopRequested = true;
  state.enabled = false;
  if (timer) clearTimeout(timer);
  timer = null;
  if (!inFlight) state.running = false;
}
function status() {
  return {
    ...state,
    intervalMinutes: Math.round(INTERVAL_MS / 60_000),
    mode: "continuous-public-read-only-knowledge-retrieval",
    sourceAllowlist: ["en.wikipedia.org"],
    writesToExternalSites: false,
    executesDownloadedCode: false,
    chatUsesOnlyApprovedKnowledge: true,
    modelWeightsRetrained: false,
    uptimeGuarantee: "host-process-and-persistent-storage-dependent",
    note: "Manbalar tekshirilmagan nomzod sifatida saqlanadi. Chat faqat tasdiqlangan yozuvlardan foydalanadi. Bu model vaznlarini o‘qitmaydi."
  };
}
async function searchKnowledge(query, limit = 5) {
  const terms = clean(query, 500).toLocaleLowerCase()
    .split(/[^\p{L}\p{N}]+/u).filter(term => term.length > 2);
  if (!terms.length) return [];
  const items = await readKnowledge();
  return items.map(item => {
    const text = (item.title + " " + item.content).toLocaleLowerCase();
    const score = terms.reduce((count, term) => count + (text.includes(term) ? 1 : 0), 0);
    return { ...item, score };
  }).filter(item => item.score > 0 && item.status === "approved")
    .sort((a, b) => b.score - a.score).slice(0, Math.max(1, Math.min(10, limit)));
}
function buildLocalReply(query, hits) {
  return require("./native-cognition").respond(query, hits);
}
module.exports = { start, stop, status, cycle, learnTopic, searchKnowledge, buildLocalReply };
