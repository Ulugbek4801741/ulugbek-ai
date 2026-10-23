"use strict";

const express = require("express");
const fs = require("node:fs/promises");
const path = require("node:path");

const router = express.Router();
const DATA_DIR = path.join(__dirname, "data");
const KNOWLEDGE_FILE = path.join(DATA_DIR, "knowledge.json");
const MEMORY_FILE = path.join(DATA_DIR, "agent-memory.json");
const MAX_QUERY = 240;
const MAX_NOTE = 5000;
const MAX_ITEMS = 2000;
let queue = Promise.resolve();

function cleanText(value, max = 1000) {
  return String(value || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}
function decodeEntities(value) {
  return String(value || "")
    .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ");
}
async function readJson(file, fallback) {
  try {
    const raw = await fs.readFile(file, "utf8");
    const value = JSON.parse(raw);
    return value && typeof value === "object" ? value : fallback;
  } catch (error) {
    if (error.code === "ENOENT") return fallback;
    throw error;
  }
}
async function writeJson(file, value) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const task = queue.then(() => fs.writeFile(file, JSON.stringify(value, null, 2), "utf8"));
  queue = task.catch(() => {});
  return task;
}
function publicUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (url.username || url.password) return null;
    const host = url.hostname.toLowerCase();
    if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") ||
        host === "127.0.0.1" || host === "::1" || host.startsWith("10.") ||
        host.startsWith("192.168.") || /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
        host === "169.254.169.254" || host === "0.0.0.0") return null;
    return url;
  } catch (_) { return null; }
}
function parseSearchResults(html) {
  const results = [];
  const pattern = /<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]{0,1600}?<a[^>]*class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = pattern.exec(html)) && results.length < 8) {
    let href = decodeEntities(match[1]);
    try {
      const candidate = new URL(href, "https://html.duckduckgo.com");
      if (candidate.hostname.endsWith("duckduckgo.com")) {
        const target = candidate.searchParams.get("uddg");
        if (target) href = decodeURIComponent(target);
      }
    } catch (_) {}
    const safe = publicUrl(href);
    const title = cleanText(decodeEntities(match[2]), 240);
    const snippet = cleanText(decodeEntities(match[3]), 700);
    if (safe && title && snippet) results.push({ title, url: safe.href, snippet });
  }
  return results;
}

router.get("/status", async (_req, res) => {
  try {
    const knowledge = await readJson(KNOWLEDGE_FILE, []);
    const memories = await readJson(MEMORY_FILE, {});
    res.json({
      ok: true,
      mode: "public-web-search-and-local-json",
      apiKeyRequired: false,
      searchProvider: "DuckDuckGo HTML results",
      knowledgeCount: Array.isArray(knowledge) ? knowledge.length : 0,
      agentMemoryCount: Object.keys(memories).length,
      note: "Bu modul qidiruv natijalarini va foydalanuvchi tasdiqlagan yozuvlarni saqlaydi; til modelini qayta o‘qitmaydi."
    });
  } catch (_) {
    res.status(500).json({ error: "Laboratoriya holatini o‘qib bo‘lmadi." });
  }
});

router.post("/search", async (req, res) => {
  const query = typeof req.body?.query === "string" ? req.body.query.trim() : "";
  if (!query) return res.status(400).json({ error: "Qidiruv so‘zi bo‘sh bo‘lmasin." });
  if (query.length > MAX_QUERY) return res.status(413).json({ error: "Qidiruv 240 belgidan oshmasin." });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const endpoint = "https://html.duckduckgo.com/html/?q=" + encodeURIComponent(query);
    const response = await fetch(endpoint, {
      headers: { "User-Agent": "ULUGBEK-AI-Research-Lab/0.1 (public search; contact: project maintainer)", "Accept": "text/html" },
      signal: controller.signal,
      redirect: "error"
    });
    if (!response.ok) return res.status(502).json({ error: "Qidiruv xizmati javob bermadi. Keyinroq qayta urinib ko‘ring." });
    const html = (await response.text()).slice(0, 1_000_000);
    const results = parseSearchResults(html);
    return res.json({
      query,
      results,
      count: results.length,
      note: results.length
        ? "Manbalarni ochib tekshiring. Qidiruv parchasi o‘z-o‘zidan tasdiqlangan fakt hisoblanmaydi."
        : "Natija topilmadi yoki qidiruv sahifasi o‘zgargan. Keyinroq qayta urinib ko‘ring."
    });
  } catch (_) {
    return res.status(502).json({ error: "Internet qidiruvi hozir ishlamadi. Server internetga chiqa olishini tekshiring." });
  } finally {
    clearTimeout(timeout);
  }
});

router.get("/knowledge", async (_req, res) => {
  try {
    const entries = await readJson(KNOWLEDGE_FILE, []);
    res.json({ entries: Array.isArray(entries) ? entries.slice(-MAX_ITEMS).reverse() : [] });
  } catch (_) {
    res.status(500).json({ error: "Bilimlar bazasini o‘qib bo‘lmadi." });
  }
});

router.post("/knowledge", async (req, res) => {
  const title = cleanText(req.body?.title, 240);
  const content = cleanText(req.body?.content, MAX_NOTE);
  const source = publicUrl(req.body?.source);
  const agent = cleanText(req.body?.agent || "Research Agent", 80);
  if (!title || !content) return res.status(400).json({ error: "Sarlavha va ma’lumotni kiriting." });
  if (String(req.body?.content || "").length > MAX_NOTE) return res.status(413).json({ error: "Ma’lumot 5000 belgidan oshmasin." });
  try {
    const entries = await readJson(KNOWLEDGE_FILE, []);
    const entry = {
      id: require("node:crypto").randomUUID(),
      title, content, source: source ? source.href : "",
      agent, status: "human-reviewed",
      createdAt: new Date().toISOString()
    };
    const next = Array.isArray(entries) ? entries : [];
    next.push(entry);
    await writeJson(KNOWLEDGE_FILE, next.slice(-MAX_ITEMS));
    res.status(201).json({ entry });
  } catch (_) {
    res.status(500).json({ error: "Ma’lumotni saqlab bo‘lmadi." });
  }
});

router.get("/memory/:agent", async (req, res) => {
  const agent = cleanText(req.params.agent, 80);
  if (!agent) return res.status(400).json({ error: "Agent nomi noto‘g‘ri." });
  try {
    const memories = await readJson(MEMORY_FILE, {});
    res.json({ agent, memory: Array.isArray(memories[agent]) ? memories[agent].slice(-100) : [] });
  } catch (_) {
    res.status(500).json({ error: "Agent xotirasini o‘qib bo‘lmadi." });
  }
});

router.post("/memory/:agent", async (req, res) => {
  const agent = cleanText(req.params.agent, 80);
  const content = cleanText(req.body?.content, MAX_NOTE);
  if (!agent || !content) return res.status(400).json({ error: "Agent nomi va xotira matni kerak." });
  if (String(req.body?.content || "").length > MAX_NOTE) return res.status(413).json({ error: "Xotira 5000 belgidan oshmasin." });
  try {
    const memories = await readJson(MEMORY_FILE, {});
    const list = Array.isArray(memories[agent]) ? memories[agent] : [];
    const item = { id: require("node:crypto").randomUUID(), content, createdAt: new Date().toISOString() };
    memories[agent] = [...list, item].slice(-100);
    await writeJson(MEMORY_FILE, memories);
    res.status(201).json({ agent, item });
  } catch (_) {
    res.status(500).json({ error: "Agent xotirasini saqlab bo‘lmadi." });
  }
});

module.exports = router;
