"use strict";

// Continuous, API-key-free public knowledge retrieval.
// Candidate notes are reviewed before chat use. Downloaded code is never executed.
const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");

const DATA_DIR = path.resolve(process.env.ULUGBEK_DATA_DIR || path.join(__dirname, "data"));
const FILE = path.join(DATA_DIR, "knowledge.json");
const STATE_FILE = path.join(DATA_DIR, "learning-worker-state.json");
const INTERVAL_MS = Math.max(60_000, Number(process.env.LEARNING_INTERVAL_MS) || 60_000);
const REQUEST_TIMEOUT_MS = 15_000;
const MAX_RESPONSE_BYTES = 1_000_000;
const MAX_KNOWLEDGE_ITEMS = 2000;

// O‘zbek tili ustuvor: 12/20 sikl, ingliz tili 5/20, rus tili 3/20.
const LANGUAGE_PLAN = [
  "uz","uz","en","uz","ru","uz","en","uz","uz","ru",
  "uz","en","uz","uz","ru","en","uz","uz","en","uz"
];
const TOPICS = {
  uz: [
    "O‘zbekiston tarixi", "o‘zbek tili va adabiyoti", "matematika asoslari",
    "informatika va dasturlash", "sun’iy intellekt", "tabiiy fanlar",
    "O‘zbekiston geografiyasi", "iqtisodiyot asoslari", "tibbiyot asoslari",
    "kiberxavfsizlik", "ta’lim va pedagogika", "muhandislik texnologiyalari"
  ],
  en: [
    "JavaScript programming", "Node.js documentation", "web security",
    "artificial intelligence", "machine learning", "software testing",
    "database fundamentals", "Android development"
  ],
  ru: [
    "информатика и программирование", "искусственный интеллект",
    "наука и технологии", "кибербезопасность", "математика",
    "история Узбекистана"
  ]
};
const ALLOWED_WIKIPEDIA_HOSTS = new Set([
  "uz.wikipedia.org", "en.wikipedia.org", "ru.wikipedia.org"
]);

let state = {
  enabled: true, running: false, startedAt: null, lastCycleAt: null,
  lastSuccessAt: null, cycles: 0, saved: 0, lastError: null,
  lastTopic: null, lastLanguage: null
};
let timer = null;
let cursor = 0;
const topicCursors = { uz: 0, en: 0, ru: 0 };
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
  if (parsed.protocol !== "https:" || !ALLOWED_WIKIPEDIA_HOSTS.has(parsed.hostname)) {
    throw new Error("Tadqiqot manbasi ruxsat etilgan domen ro‘yxatida emas.");
  }
  const response = await fetch(parsed, {
    headers: {
      "User-Agent": "ULUGBEK-AI-OpenKnowledge/1.2 (public read-only research)",
      "Accept": "application/json"
    },
    signal,
    redirect: "error"
  });
  return readJsonResponse(response);
}
async function learnTopic(topic, language = "uz") {
  if (!Object.hasOwn(TOPICS, language)) throw new Error("Qo‘llab-quvvatlanmaydigan til.");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const base = "https://" + language + ".wikipedia.org";
    const url = new URL(base + "/w/api.php");
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
      const summaryUrl = base + "/api/rest_v1/page/summary/" +
        encodeURIComponent(title.replace(/ /g, "_"));
      const item = await fetchPublicJson(summaryUrl, controller.signal);
      const content = clean(item.extract, 4000);
      const source = item.content_urls?.desktop?.page;
      if (!content || typeof source !== "string" ||
          !source.startsWith(base + "/wiki/") || known.has(source)) continue;

      known.add(source);
      additions.push({
        id: crypto.randomUUID(),
        title: clean(item.title || title, 180),
        content,
        source,
        language,
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
    state.lastLanguage = language;
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
  const language = LANGUAGE_PLAN[cursor++ % LANGUAGE_PLAN.length];
  const topics = TOPICS[language];
  const topic = topics[topicCursors[language]++ % topics.length];
  try {
    await learnTopic(topic, language);
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
    languagePriority: [
      { language: "uz", name: "O‘zbek", sharePercent: 60 },
      { language: "en", name: "Ingliz", sharePercent: 25 },
      { language: "ru", name: "Rus", sharePercent: 15 }
    ],
    sourceAllowlist: [...ALLOWED_WIKIPEDIA_HOSTS],
    mode: "continuous-multilingual-public-read-only-knowledge-retrieval",
    writesToExternalSites: false,
    executesDownloadedCode: false,
    chatUsesOnlyApprovedKnowledge: true,
    modelWeightsRetrained: false,
    uptimeGuarantee: "host-process-and-persistent-storage-dependent",
    note: "O‘zbekcha 60%, inglizcha 25%, ruscha 15% navbat bilan o‘rganiladi. Manbalar tekshirilmagan nomzod sifatida saqlanadi; chat faqat tasdiqlangan yozuvlardan foydalanadi. Bu model vaznlarini o‘qitmaydi."
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
async function researchQuestion(query) {
  const question = clean(query, 500);
  if (!question || question.length < 3) return [];
  const languages = ["uz", "en", "ru"];
  const collected = [];
  const current = await readKnowledge();
  const known = new Set(current.map(item => item.source).filter(Boolean));

  for (const language of languages) {
    if (stopRequested) break;
    const base = "https://" + language + ".wikipedia.org";
    const searchUrl = new URL(base + "/w/api.php");
    searchUrl.search = new URLSearchParams({
      action: "query", list: "search", srsearch: question,
      srlimit: "2", format: "json"
    }).toString();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const payload = await fetchPublicJson(searchUrl.href, controller.signal);
      const hits = Array.isArray(payload?.query?.search) ? payload.query.search.slice(0, 2) : [];
      const summaries = await Promise.all(hits.map(async hit => {
        const title = clean(hit.title, 180);
        if (!title) return null;
        const url = base + "/api/rest_v1/page/summary/" + encodeURIComponent(title.replace(/ /g, "_"));
        const item = await fetchPublicJson(url, controller.signal);
        const content = clean(item.extract, 4000);
        const source = item.content_urls?.desktop?.page;
        if (!content || typeof source !== "string" || !source.startsWith(base + "/wiki/")) return null;
        return {
          id: crypto.randomUUID(), title: clean(item.title || title, 180),
          content, source, language, agent: "OnDemandResearchAgent",
          status: "pending-review", quality: "live-public-summary-unverified",
          createdAt: new Date().toISOString()
        };
      }));
      for (const item of summaries.filter(Boolean)) {
        collected.push(item);
        if (!known.has(item.source)) {
          known.add(item.source);
          current.push(item);
        }
      }
    } catch (error) {
      state.lastError = clean(error.name === "AbortError" ? "Internet qidiruvi vaqti tugadi." : error.message, 240);
    } finally {
      clearTimeout(timeout);
    }
  }

  if (collected.length) {
    await writeKnowledge(current);
    state.saved += collected.length;
    state.lastOnDemandSearchAt = new Date().toISOString();
    state.lastOnDemandSearchLanguages = [...new Set(collected.map(item => item.language))];
  }
  return collected;
}
function buildLocalReply(query, hits) {
  return require("./native-cognition").respond(query, hits);
}
module.exports = { start, stop, status, cycle, learnTopic, searchKnowledge, researchQuestion, buildLocalReply };
