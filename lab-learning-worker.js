"use strict";

// Continuous, API-key-free public knowledge retrieval.
// Candidate notes are reviewed before chat use. Downloaded code is never executed.
const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");
const { readPublicPage, normalizePublicUrl } = require("./modules/public-web-reader");
const { buildProvenance } = require("./modules/knowledge-provenance");

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
  lastTopic: null, lastLanguage: null, openWebSaved: 0,
  lastOpenWebAt: null, lastOpenWebError: null
};
let timer = null;
let cursor = 0;
const topicCursors = { uz: 0, en: 0, ru: 0 };
let inFlight = false;
let stopRequested = false;
let writeChain = Promise.resolve();
const visitedPages = new Set();
let visitedLoaded = false;
let stateWriteChain = Promise.resolve();

async function loadVisitedPages() {
  if (visitedLoaded) return;
  try {
    const saved = JSON.parse(await fs.readFile(STATE_FILE, "utf8"));
    if (Array.isArray(saved.visitedPages)) {
      for (const url of saved.visitedPages) {
        if (typeof url === "string" && url.startsWith("https://")) visitedPages.add(url);
      }
    }
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  visitedLoaded = true;
}
async function markPageVisited(url) {
  await loadVisitedPages();
  if (visitedPages.has(url)) return false;
  // Mark before fetching: failed pages are not hammered repeatedly either.
  visitedPages.add(url);
  stateWriteChain = stateWriteChain.then(async () => {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const temp = STATE_FILE + ".tmp";
    await fs.writeFile(temp, JSON.stringify({
      visitedPages: [...visitedPages].slice(-20_000),
      updatedAt: new Date().toISOString()
    }), { mode: 0o600 });
    await fs.rename(temp, STATE_FILE);
  });
  await stateWriteChain;
  return true;
}

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
// All crawler HTTP requests share one queue: never parallelize requests.
// A one-second gap is a minimum, not permission to ignore stricter site rules.
const MIN_REQUEST_GAP_MS = 1000;
const ROBOTS_TIMEOUT_MS = 10000;
const robotsCache = new Map();
let requestQueue = Promise.resolve();
let lastHttpRequestAt = 0;
const hostBlockedUntil = new Map();

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, Math.max(0, ms)));
}
function retryAfterMs(value) {
  if (!value) return 60 * 60 * 1000;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.min(seconds * 1000, 24 * 60 * 60 * 1000);
  const date = Date.parse(value);
  return Number.isFinite(date) ? Math.max(0, Math.min(date - Date.now(), 24 * 60 * 60 * 1000)) : 60 * 60 * 1000;
}
function robotsAllows(robotsText, targetUrl) {
  const pathAndQuery = new URL(targetUrl).pathname + new URL(targetUrl).search;
  const groups = [];
  let current = null;
  for (const rawLine of String(robotsText || "").split(/\r?\n/)) {
    const line = rawLine.split("#", 1)[0].trim();
    if (!line || !line.includes(":")) continue;
    const split = line.indexOf(":");
    const key = line.slice(0, split).trim().toLowerCase();
    const value = line.slice(split + 1).trim();
    if (key === "user-agent") {
      if (!current || current.rulesStarted) {
        current = { agents: [], rules: [], crawlDelay: 0, rulesStarted: false };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
    } else if (current && (key === "allow" || key === "disallow")) {
      current.rulesStarted = true;
      if (value) current.rules.push({ allow: key === "allow", path: value });
    } else if (current && key === "crawl-delay") {
      const seconds = Number(value);
      if (Number.isFinite(seconds) && seconds >= 0) current.crawlDelay = Math.min(seconds * 1000, 60 * 60 * 1000);
    }
  }
  const productToken = "ulugbek-ai-openknowledge";
  const matching = groups.filter(group => group.agents.some(agent =>
    agent !== "*" && productToken.startsWith(agent)
  ));
  const selected = matching.length ? matching : groups.filter(group => group.agents.includes("*"));
  if (!selected.length) return { allowed: true, delayMs: 0 };
  const rules = selected.flatMap(group => group.rules)
    .filter(rule => pathAndQuery.startsWith(rule.path))
    .sort((a, b) => b.path.length - a.path.length);
  const delayMs = Math.max(...selected.map(group => group.crawlDelay), 0);
  return { allowed: !rules.length || rules[0].allow, delayMs };
}
async function fetchRobots(host) {
  if (robotsCache.has(host)) return robotsCache.get(host);
  const promise = (async () => {
    const robotsUrl = "https://" + host + "/robots.txt";
    await wait(Math.max(0, lastHttpRequestAt + MIN_REQUEST_GAP_MS - Date.now()));
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), ROBOTS_TIMEOUT_MS);
    try {
      const response = await fetch(robotsUrl, {
        headers: {
          "User-Agent": "ULUGBEK-AI-OpenKnowledge/1.2 (public read-only research)",
          "Accept": "text/plain"
        },
        signal: controller.signal,
        redirect: "error"
      });
      lastHttpRequestAt = Date.now();
      if (response.status === 403 || response.status === 429) {
        hostBlockedUntil.set(host, Date.now() + retryAfterMs(response.headers.get("retry-after")));
        return { denied: true, text: "" };
      }
      if (response.status === 404) return { denied: false, text: "" };
      if (!response.ok) return { denied: true, text: "" };
      const text = await response.text();
      if (Buffer.byteLength(text, "utf8") > 100000) return { denied: true, text: "" };
      return { denied: false, text };
    } finally {
      clearTimeout(timeout);
    }
  })();
  robotsCache.set(host, promise);
  return promise;
}
async function fetchPublicJsonNow(url, signal) {
  const parsed = new URL(url);
  if (parsed.protocol !== "https:" || !ALLOWED_WIKIPEDIA_HOSTS.has(parsed.hostname)) {
    throw new Error("Tadqiqot manbasi ruxsat etilgan domen ro‘yxatida emas.");
  }
  const blockedUntil = hostBlockedUntil.get(parsed.hostname) || 0;
  if (blockedUntil > Date.now()) throw new Error("Manba 403/429 cheklovi sababli vaqtincha to‘xtatildi.");
  const robots = await fetchRobots(parsed.host);
  if (robots.denied) throw new Error("Manba robots.txt yoki HTTP cheklovi sababli o‘qilmadi.");
  const policy = robotsAllows(robots.text, parsed.href);
  if (!policy.allowed) throw new Error("Sahifa robots.txt qoidasi bilan taqiqlangan.");
  const gap = Math.max(MIN_REQUEST_GAP_MS, policy.delayMs);
  await wait(Math.max(0, lastHttpRequestAt + gap - Date.now()));
  const response = await fetch(parsed, {
    headers: {
      "User-Agent": "ULUGBEK-AI-OpenKnowledge/1.2 (public read-only research)",
      "Accept": "application/json"
    },
    signal,
    redirect: "error"
  });
  lastHttpRequestAt = Date.now();
  if (response.status === 403 || response.status === 429) {
    hostBlockedUntil.set(parsed.hostname, Date.now() + retryAfterMs(response.headers.get("retry-after")));
    throw new Error("Manba 403/429 qaytardi; chetlab o‘tish yoki qayta-qayta urinish to‘xtatildi.");
  }
  return readJsonResponse(response);
}
async function fetchPublicJson(url, signal) {
  const task = requestQueue.then(() => fetchPublicJsonNow(url, signal));
  requestQueue = task.catch(() => {});
  return task;
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
      const pageKey = base + "/wiki/" + encodeURIComponent(title.replace(/ /g, "_"));
      await loadVisitedPages();
      if (visitedPages.has(pageKey)) continue;
      const item = await fetchPublicJson(summaryUrl, controller.signal);
      const content = clean(item.extract, 4000);
      const source = item.content_urls?.desktop?.page;
      if (!content || typeof source !== "string" ||
          !source.startsWith(base + "/wiki/") || known.has(source)) continue;
      await markPageVisited(pageKey);

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
        ...buildProvenance({ url: source, content, sourceType: "wikipedia-summary" }),
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
function parseOpenWebResults(html) {
  const results = [];
  const pattern = /<a[^>]*class=["'][^"']*result__a[^"']*["'][^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = pattern.exec(String(html || ""))) && results.length < 5) {
    try {
      let href = match[1].replace(/&amp;/g, "&").replace(/&quot;/g, '"');
      const candidate = new URL(href, "https://html.duckduckgo.com");
      if (candidate.hostname.endsWith("duckduckgo.com")) {
        const target = candidate.searchParams.get("uddg");
        if (target) href = target;
      }
      const safe = normalizePublicUrl(href);
      const title = clean(match[2].replace(/<[^>]*>/g, " "), 180);
      if (safe && title && !results.some(item => item.url === safe.href)) {
        results.push({ title, url: safe.href });
      }
    } catch (_) {}
  }
  return results;
}

async function researchOpenWeb(topic, language) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const endpoint = "https://html.duckduckgo.com/html/?q=" + encodeURIComponent(topic);
    // Search pages use the same HTTPS, DNS, robots.txt, redirect, timeout,
    // response-size and per-host pacing checks as destination pages.
    const searchPage = await readPublicPage(endpoint);
    const results = parseOpenWebResults(searchPage.html);
    const current = await readKnowledge();
    const known = new Set(current.map(item => item.source).filter(Boolean));
    const additions = [];
    for (const result of results.slice(0, 2)) {
      if (stopRequested) break;
      try {
        const page = await readPublicPage(result.url);
        if (known.has(page.source)) continue;
        const entry = {
          id: crypto.randomUUID(),
          title: clean(page.title || result.title, 180),
          content: clean(page.content, 8000),
          source: page.source,
          language,
          agent: "AutonomousOpenWebResearchAgent",
          status: "pending-review",
          quality: "public-web-page-unverified",
          fetchedAt: page.fetchedAt,
          contentType: page.contentType,
          ...buildProvenance({ url: page.source, content: page.content, fetchedAt: page.fetchedAt, sourceType: "public-web-page" }),
          createdAt: new Date().toISOString()
        };
        known.add(page.source);
        additions.push(entry);
      } catch (error) {
        state.lastOpenWebError = clean(error.message, 200);
      }
    }
    if (additions.length) {
      await writeKnowledge([...current, ...additions]);
      state.saved += additions.length;
      state.openWebSaved += additions.length;
    }
    state.lastOpenWebAt = new Date().toISOString();
    return additions.length;
  } catch (error) {
    state.lastOpenWebError = clean(error.name === "AbortError" ? "Ochiq internet qidiruvi vaqti tugadi." : error.message, 200);
    return 0;
  } finally {
    clearTimeout(timeout);
  }
}

async function cycle() {
  if (!state.enabled || stopRequested || inFlight) return;
  inFlight = true;
  state.running = true;
  state.lastCycleAt = new Date().toISOString();

  // Har siklda bitta til tanlanadi; Wikipedia va umumiy ochiq internetdan
  // cheklangan miqdorda sahifa olinadi. HTTP so‘rovlari ketma-ket bajariladi.
  const language = LANGUAGE_PLAN[cursor++ % LANGUAGE_PLAN.length];
  const topics = TOPICS[language];
  const topic = topics[topicCursors[language]++ % topics.length];
  try {
    let findings = 0;
    let openWebFindings = 0;
  let wikipediaError = null;
  state.lastOpenWebError = null;

  // Wikipedia and general public-web research are independent fallbacks.
  // A robots.txt denial on one site must never prevent trying other public sources.
  try {
    findings = await researchQuestion(topic);
  } catch (error) {
    wikipediaError = clean(error.name === "AbortError" ? "Wikipedia so‘rovi vaqti tugadi." : error.message, 180);
  }
  try {
    openWebFindings = await researchOpenWeb(topic, language);
  } catch (error) {
    state.lastOpenWebError = clean(error.name === "AbortError" ? "Ochiq internet qidiruvi vaqti tugadi." : error.message, 180);
  }

  state.cycles += 1;
  state.lastTopic = topic;
  state.lastLanguage = language;
  if ((Array.isArray(findings) ? findings.length : findings) || openWebFindings) {
    state.lastSuccessAt = new Date().toISOString();
    state.lastError = null;
  } else if (wikipediaError || state.lastOpenWebError) {
    state.lastError = [wikipediaError && "Wikipedia: " + wikipediaError, state.lastOpenWebError && "Ochiq internet: " + state.lastOpenWebError]
      .filter(Boolean).join(" | ").slice(0, 240);
  } else {
    // Search completed but no new readable pages were found; this is not a crash.
    state.lastError = null;
  }
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
    parallelLanguages: 1,
    maxCandidatesPerCycle: 6,
    languagePriority: [
      { language: "uz", name: "O‘zbek", sharePercent: 60 },
      { language: "en", name: "Ingliz", sharePercent: 25 },
      { language: "ru", name: "Rus", sharePercent: 15 }
    ],
    sourceAllowlist: [...ALLOWED_WIKIPEDIA_HOSTS],
    genericPublicHttpsWeb: true,
    openWebPagesSaved: state.openWebSaved,
    lastOpenWebAt: state.lastOpenWebAt,
    lastOpenWebError: state.lastOpenWebError,
    minimumRequestGapSeconds: 1,
    requestConcurrency: 1,
    robotsTxtEnforced: true,
    obeysCrawlDelay: true,
    pausesOnHttp403Or429: true,
    neverBypassesBlocks: true,
    mode: "continuous-multilingual-public-read-only-knowledge-retrieval",
    writesToExternalSites: false,
    executesDownloadedCode: false,
    chatUsesOnlyApprovedKnowledge: true,
    knowledgeProvenanceTracking: true,
    knowledgeContentHash: "sha256",
    unverifiedCandidatesRequireReview: true,
    modelWeightsRetrained: false,
    uptimeGuarantee: "host-process-and-persistent-storage-dependent",
    note: "Har siklda o‘zbek, ingliz yoki rus mavzusi bo‘yicha Wikipedia va umumiy ochiq HTTPS internet qidiriladi. Umumiy internetdan ko‘pi bilan 2 sahifa olinadi; robots.txt, DNS va HTTP cheklovlari tekshiriladi. Olingan yozuvlar pending-review holatida saqlanadi; chat faqat tasdiqlangan bilimlardan foydalanadi. Bu model vaznlarini o‘qitmaydi."
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
  const current = await readKnowledge();
  const known = new Set(current.map(item => item.source).filter(Boolean));
  const collected = [];
  await loadVisitedPages();

  // Sequential requests are important: each timeout starts only when its
  // request reaches the queue, so one slow language cannot cancel later ones.
  for (const language of languages) {
    if (stopRequested) break;
    const base = "https://" + language + ".wikipedia.org";
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const searchUrl = new URL(base + "/w/api.php");
      searchUrl.search = new URLSearchParams({
        action: "query", list: "search", srsearch: question,
        srlimit: "2", format: "json"
      }).toString();
      const payload = await fetchPublicJson(searchUrl.href, controller.signal);
      const hits = Array.isArray(payload?.query?.search) ? payload.query.search.slice(0, 2) : [];
      for (const hit of hits) {
        if (stopRequested) break;
        const title = clean(hit.title, 180);
        if (!title) continue;
        const url = base + "/api/rest_v1/page/summary/" + encodeURIComponent(title.replace(/ /g, "_"));
        const pageKey = base + "/wiki/" + encodeURIComponent(title.replace(/ /g, "_"));
        if (visitedPages.has(pageKey)) continue;
        const item = await fetchPublicJson(url, controller.signal);
        const content = clean(item.extract, 4000);
        const source = item.content_urls?.desktop?.page;
        if (!content || typeof source !== "string" || !source.startsWith(base + "/wiki/") || known.has(source)) continue;
        await markPageVisited(pageKey);
        known.add(source);
        collected.push({
          id: crypto.randomUUID(), title: clean(item.title || title, 180),
          content, source, language, agent: "OnDemandResearchAgent",
          status: "pending-review", quality: "live-public-summary-unverified",
          createdAt: new Date().toISOString()
        });
      }
    } catch (error) {
      state.lastError = clean(error.name === "AbortError" ? "Internet qidiruvi vaqti tugadi." : error.message, 240);
    } finally {
      clearTimeout(timeout);
    }
  }

  if (collected.length) {
    await writeKnowledge([...current, ...collected]);
    state.saved += collected.length;
    state.lastOnDemandSearchAt = new Date().toISOString();
    state.lastOnDemandSearchLanguages = [...new Set(collected.map(item => item.language))];
  }
  return collected;
}
function buildLocalReply(query, hits, context) {
  return require("./native-cognition").respond(query, hits, context);
}
module.exports = { start, stop, status, cycle, learnTopic, searchKnowledge, researchQuestion, researchOpenWeb, parseOpenWebResults, buildLocalReply, loadVisitedPages, robotsAllows };
