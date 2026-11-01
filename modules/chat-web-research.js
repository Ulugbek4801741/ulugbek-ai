"use strict";

const dns = require("node:dns/promises");
const net = require("node:net");
const http = require("node:http");
const https = require("node:https");

const MAX_QUERY = 240;
const TIMEOUT_MS = 10000;
const MAX_RESULTS = 5;
const MAX_PAGE_BYTES = 900000;
const MAX_PAGE_CHARS = 12000;
const MAX_REDIRECTS = 3;

function clean(value, max = 800) {
  return String(value || "").replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&").replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">").replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ").trim().slice(0, max);
}
function isPrivateAddress(address) {
  let value = String(address || "").toLowerCase().split("%")[0];
  if (net.isIP(value) === 6) {
    if (value.startsWith("::ffff:")) return isPrivateAddress(value.slice(7));
    if (value === "::" || value === "::1" || value.startsWith("fc") ||
        value.startsWith("fd") || /^fe[89ab]/.test(value) ||
        value.startsWith("ff") || value.startsWith("2001:db8:")) return true;
    return false;
  }
  if (net.isIP(value) !== 4) return true;
  const p = value.split(".").map(Number), a = p[0], b = p[1], c = p[2];
  return a === 0 || a === 10 || a === 127 || a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) || (a === 192 && b === 0 && c === 0) ||
    (a === 192 && b === 0 && c === 2) || (a === 198 && (b === 18 || b === 19 || b === 51)) ||
    (a === 203 && b === 0 && c === 113);
}
function safePublicUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (url.username || url.password) return null;
    const host = url.hostname.toLowerCase().replace("[", "").replace("]", "");
    if (!host || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) return null;
    if (net.isIP(host) && isPrivateAddress(host)) return null;
    return url.href;
  } catch (_) { return null; }
}
function parseResults(html) {
  const results = [];
  const pattern = /<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]{0,1800}?<a[^>]*class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = pattern.exec(String(html || ""))) && results.length < MAX_RESULTS) {
    let href = clean(match[1], 2000);
    try {
      const candidate = new URL(href, "https://html.duckduckgo.com");
      if (candidate.hostname.endsWith("duckduckgo.com")) {
        const target = candidate.searchParams.get("uddg");
        if (target) href = target;
      }
    } catch (_) {}
    const url = safePublicUrl(href);
    const title = clean(match[2], 220), snippet = clean(match[3], 650);
    if (url && title && snippet && !results.some(item => item.url === url)) results.push({ title, url, snippet });
  }
  return results;
}
function stripHtml(html) {
  const text = String(html || "")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|noscript|svg|iframe|form|nav|footer|header)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/article|\/section)[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#(\d+);/g, (_m, n) => { const p = Number(n); return p > 0 && p <= 0x10ffff ? String.fromCodePoint(p) : " "; })
    .replace(/&#x([0-9a-f]+);/gi, (_m, n) => { const p = parseInt(n, 16); return p > 0 && p <= 0x10ffff ? String.fromCodePoint(p) : " "; });
  return clean(text, MAX_PAGE_CHARS);
}
async function resolvePublicHost(host) {
  if (net.isIP(host)) {
    if (isPrivateAddress(host)) throw new Error("Private address blocked");
    return [{ address: host, family: net.isIP(host) }];
  }
  const records = await dns.lookup(host, { all: true, verbatim: true });
  if (!records.length || records.some(item => isPrivateAddress(item.address))) throw new Error("Non-public DNS address blocked");
  return records;
}
// Use the already-validated DNS address for the actual socket connection.
// This prevents fetch() from resolving the hostname a second time (DNS rebinding).
function requestPinned(url, addresses, timeoutMs = TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    const transport = url.protocol === "https:" ? https : http;
    const chosen = addresses[0];
    const req = transport.request(url, {
      method: "GET",
      agent: false,
      headers: {
        "User-Agent": "ULUGBEK-AI-PublicResearch/1.0 (+read-only; contact: site owner via published policy)",
        "Accept": "text/html, text/plain;q=0.9, application/xhtml+xml;q=0.9"
      },
      lookup: (_hostname, _options, callback) => callback(null, chosen.address, chosen.family)
    }, response => {
      const chunks = [];
      let size = 0;
      response.on("data", chunk => {
        size += chunk.length;
        if (size > MAX_PAGE_BYTES) {
          req.destroy(new Error("Response size limit exceeded"));
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
    req.setTimeout(timeoutMs, () => req.destroy(new Error("Request timeout")));
    req.on("error", reject);
    req.end();
  });
}
async function fetchPage(value) {
  let current = safePublicUrl(value);
  if (!current) return null;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const url = new URL(current);
    try {
      const addresses = await resolvePublicHost(url.hostname.replace("[", "").replace("]", ""));
      const response = await requestPinned(url, addresses);
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.location;
        if (!location || hop === MAX_REDIRECTS) return null;
        current = safePublicUrl(new URL(location, current).href);
        if (!current) return null;
        continue;
      }
      if (response.status < 200 || response.status >= 300) return null;
      const type = String(response.headers["content-type"] || "").toLowerCase();
      if (!type.includes("text/html") && !type.includes("text/plain") && !type.includes("application/xhtml+xml")) return null;
      const titleMatch = response.body.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      const title = titleMatch ? clean(titleMatch[1], 240) : url.hostname;
      const content = type.includes("text/plain") ? clean(response.body, MAX_PAGE_CHARS) : stripHtml(response.body);
      if (content.length < 120) return null;
      return { title, url: current, content };
    } catch (_) { return null; }
  }
  return null;
}
async function search(query) {
  const q = clean(query, MAX_QUERY);
  if (q.length < 3) return [];
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const endpoint = "https://html.duckduckgo.com/html/?q=" + encodeURIComponent(q);
    const response = await fetch(endpoint, {
      method: "GET",
      headers: { "User-Agent": "ULUGBEK-AI-PublicResearch/1.0 (read-only search)", "Accept": "text/html" },
      signal: controller.signal,
      redirect: "error"
    });
    if (!response.ok) throw new Error("Public search HTTP " + response.status);
    const html = await response.text();
    if (Buffer.byteLength(html, "utf8") > 1000000) throw new Error("Search response too large");
    return parseResults(html);
  } finally { clearTimeout(timeout); }
}
module.exports = { search, parseResults, safePublicUrl, fetchPage, stripHtml, isPrivateAddress, resolvePublicHost };
