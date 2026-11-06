"use strict";

// Generic HTTPS reader for publicly reachable pages. It never logs in, solves
// CAPTCHAs, follows authenticated links, executes page scripts, or downloads files.
const dns = require("node:dns").promises;
const https = require("node:https");
const net = require("node:net");

const MAX_BYTES = 1_000_000;
const TIMEOUT_MS = 12_000;
const MAX_REDIRECTS = 3;
const robotsCache = new Map();
const hostLastRequest = new Map();

function isPublicAddress(address) {
  const family = net.isIP(address);
  if (family === 4) {
    const p = address.split(".").map(Number);
    if (p.length !== 4 || p.some(n => n < 0 || n > 255)) return false;
    const [a,b] = p;
    return !(a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) || (a === 192 && b === 0) ||
      (a === 198 && (b === 18 || b === 19)));
  }
  if (family === 6) {
    const v = address.toLowerCase();
    return !(v === "::" || v === "::1" || v.startsWith("fc") ||
      v.startsWith("fd") || v.startsWith("fe8") || v.startsWith("fe9") ||
      v.startsWith("fea") || v.startsWith("feb") || v.startsWith("::ffff:"));
  }
  return false;
}

function normalizePublicUrl(value) {
  try {
    const url = new URL(String(value || ""));
    if (url.protocol !== "https:" || url.username || url.password ||
        url.port && url.port !== "443" || !url.hostname ||
        url.hostname.endsWith(".") || net.isIP(url.hostname)) return null;
    const host = url.hostname.toLowerCase();
    if (host === "localhost" || host.endsWith(".localhost") ||
        host.endsWith(".local") || host.endsWith(".internal")) return null;
    url.hash = "";
    return url;
  } catch (_) { return null; }
}

async function resolvePublicHost(hostname) {
  const records = await dns.lookup(hostname, { all: true, verbatim: true });
  if (!records.length || records.some(item => !isPublicAddress(item.address))) {
    throw new Error("Domen ommaviy IP manziliga yechilmadi yoki ichki tarmoqqa yo‘naltirilgan.");
  }
  return records[0];
}

function requestPinned(url, address, pathName) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      protocol: "https:",
      hostname: url.hostname,
      servername: url.hostname,
      port: 443,
      method: "GET",
      path: pathName || (url.pathname + url.search),
      lookup: (_host, _options, callback) => callback(null, address.address, address.family),
      headers: {
        "User-Agent": "ULUGBEK-AI-OpenKnowledge/2.0 (public read-only research)",
        "Accept": "text/html,text/plain;q=0.9,*/*;q=0.1",
        "Accept-Encoding": "identity"
      },
      timeout: TIMEOUT_MS
    }, response => {
      const chunks = [];
      let bytes = 0;
      response.on("data", chunk => {
        bytes += chunk.length;
        if (bytes > MAX_BYTES) {
          req.destroy(new Error("Sahifa hajmi 1 MB limitdan oshdi."));
          return;
        }
        chunks.push(chunk);
      });
      response.on("end", () => resolve({
        status: response.statusCode || 0,
        headers: response.headers,
        body: Buffer.concat(chunks).toString("utf8")
      }));
    });
    req.on("timeout", () => req.destroy(new Error("Sahifani o‘qish vaqti tugadi.")));
    req.on("error", reject);
    req.end();
  });
}

function robotsAllows(text, pathname) {
  const groups = [];
  let group = null;
  for (const raw of String(text || "").split(/\r?\n/)) {
    const line = raw.split("#", 1)[0].trim();
    const i = line.indexOf(":");
    if (!line || i < 0) continue;
    const key = line.slice(0, i).trim().toLowerCase();
    const value = line.slice(i + 1).trim();
    if (key === "user-agent") {
      if (!group || group.rulesStarted) {
        group = { agents: [], rules: [], delayMs: 0, rulesStarted: false };
        groups.push(group);
      }
      group.agents.push(value.toLowerCase());
    } else if (group && (key === "allow" || key === "disallow")) {
      group.rulesStarted = true;
      if (value) group.rules.push({ allow: key === "allow", path: value });
    } else if (group && key === "crawl-delay") {
      const seconds = Number(value);
      if (Number.isFinite(seconds) && seconds >= 0) {
        group.delayMs = Math.max(group.delayMs, Math.min(seconds * 1000, 3600000));
      }
    }
  }
  const token = "ulugbek-ai-openknowledge";
  const specific = groups.filter(g => g.agents.some(a => a !== "*" && token.startsWith(a)));
  const selected = specific.length ? specific : groups.filter(g => g.agents.includes("*"));
  if (!selected.length) return { allowed: true, delayMs: 0 };
  const rules = selected.flatMap(g => g.rules).filter(rule => {
    const endAnchored = rule.path.endsWith("$");
    const rawPath = endAnchored ? rule.path.slice(0, -1) : rule.path;
    const pattern = rawPath.split("*")
      .map(part => part.replace(/[.*+?^${}()|[\]\\]/g, ch => "\\" + ch))
      .join(".*");
    return new RegExp("^" + pattern + (endAnchored ? "$" : "")).test(pathname);
  }).sort((x, y) =>
    y.path.replace(/[*$]/g, "").length - x.path.replace(/[*$]/g, "").length
  );
  const best = rules[0];
  return { allowed: !best || best.allow, delayMs: Math.max(0, ...selected.map(g => g.delayMs)) };
}
async function fetchRobots(url, address) {
  if (robotsCache.has(url.hostname)) return robotsCache.get(url.hostname);
  const promise = (async () => {
    const result = await requestPinned(url, address, "/robots.txt");
    hostLastRequest.set(url.hostname, Date.now());
    if (result.status === 404) return { text: "", denied: false };
    if (result.status === 401 || result.status === 403 || result.status === 429 ||
        result.status < 200 || result.status >= 300) {
      return { text: "", denied: true, reason: "robots.txt yoki server cheklovi" };
    }
    return { text: result.body, denied: false };
  })();
  robotsCache.set(url.hostname, promise);
  try { return await promise; } catch (error) { robotsCache.delete(url.hostname); throw error; }
}

function decodeEntities(value) {
  return String(value || "").replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<").replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Math.min(0x10ffff, Number(n))))
    .replace(/&#x([\da-f]+);/gi, (_, n) => String.fromCodePoint(Math.min(0x10ffff, parseInt(n,16))));
}

function extractReadablePage(html) {
  const source = String(html || "");
  const title = decodeEntities((source.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [,""])[1]
    .replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim().slice(0, 240);
  const text = decodeEntities(source
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|noscript|svg|nav|footer|header|form)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/article|\/section)[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, " "))
    .replace(/[\t\f\v ]+/g, " ").replace(/\n\s*\n+/g, "\n").trim();
  return { title: title || "Nomsiz sahifa", content: text.slice(0, 8000) };
}

async function readPublicPage(inputUrl) {
  let url = normalizePublicUrl(inputUrl);
  if (!url) throw new Error("Faqat HTTPS orqali ochiq, oddiy domenli sahifalar qabul qilinadi.");
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const address = await resolvePublicHost(url.hostname);
    const robots = await fetchRobots(url, address);
    if (robots.denied) throw new Error("Sayt robots.txt yoki HTTP qoidasi bu sahifani o‘qishga ruxsat bermadi.");
    const policy = robotsAllows(robots.text, url.pathname + url.search);
    if (!policy.allowed) throw new Error("Sayt robots.txt bu sahifani o‘qishga ruxsat bermadi.");
    const last = hostLastRequest.get(url.hostname) || 0;
    const waitMs = Math.max(0, last + Math.max(1000, policy.delayMs) - Date.now());
    if (waitMs) await new Promise(resolve => setTimeout(resolve, waitMs));
    const response = await requestPinned(url, address);
    hostLastRequest.set(url.hostname, Date.now());
    if ([301,302,303,307,308].includes(response.status)) {
      if (!response.headers.location || hop === MAX_REDIRECTS) throw new Error("Yo‘naltirishlar limiti tugadi.");
      const next = normalizePublicUrl(new URL(response.headers.location, url).href);
      if (!next) throw new Error("Sayt xavfsiz bo‘lmagan manzilga yo‘naltirmoqchi bo‘ldi.");
      url = next;
      continue;
    }
    if (response.status === 401 || response.status === 403 || response.status === 429) {
      throw new Error("Sayt kirishni chekladi; chetlab o‘tishga urinilmadi.");
    }
    if (response.status < 200 || response.status >= 300) {
      throw new Error("Sayt HTTP " + response.status + " javobini qaytardi.");
    }
    const type = String(response.headers["content-type"] || "").toLowerCase();
    if (!(type.includes("text/html") || type.includes("text/plain") || type.includes("application/xhtml"))) {
      throw new Error("Bu sahifa HTML yoki oddiy matn emas; fayllar yuklab olinmaydi.");
    }
    const page = extractReadablePage(response.body);
    if (page.content.length < 120) throw new Error("Sahifada o‘rganish uchun yetarli ochiq matn topilmadi.");
    return { ...page, source: url.href, fetchedAt: new Date().toISOString(), contentType: type };
  }
  throw new Error("Sahifani ochib bo‘lmadi.");
}

module.exports = { normalizePublicUrl, isPublicAddress, robotsAllows, extractReadablePage, readPublicPage };
