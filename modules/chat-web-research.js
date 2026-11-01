"use strict";

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
function safePublicUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (url.username || url.password) return null;
    const host = url.hostname.toLowerCase();
    if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") ||
        host === "127.0.0.1" || host === "::1" || host.startsWith("10.") ||
        host.startsWith("192.168.") || /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
        host === "169.254.169.254" || host === "0.0.0.0") return null;
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
        if (target) href = decodeURIComponent(target);
      }
    } catch (_) {}
    const url = safePublicUrl(href);
    const title = clean(match[2], 220);
    const snippet = clean(match[3], 650);
    if (url && title && snippet && !results.some(item => item.url === url)) {
      results.push({ title, url, snippet });
    }
  }
  return results;
}
function stripHtml(html) {
  const text = String(html || "")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|noscript|svg|iframe|form|nav|footer|header)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/article|\/section)[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#(\d+);/g, (_m, n) => {
      const point = Number(n);
      return point > 0 && point <= 0x10ffff ? String.fromCodePoint(point) : " ";
    })
    .replace(/&#x([0-9a-f]+);/gi, (_m, n) => {
      const point = parseInt(n, 16);
      return point > 0 && point <= 0x10ffff ? String.fromCodePoint(point) : " ";
    });
  return clean(text, MAX_PAGE_CHARS);
}
function isPrivateAddress(address) {
  const value = String(address || "").toLowerCase();
  if (value === "::1" || value === "::" || value.startsWith("fc") ||
      value.startsWith("fd") || value.startsWith("fe80:") ||
      value.startsWith("::ffff:127.") || value.startsWith("::ffff:10.") ||
      value.startsWith("::ffff:192.168.")) return true;
  const parts = value.split(".").map(Number);
  if (parts.length !== 4 || parts.some(n => !Number.isInteger(n) || n < 0 || n > 255)) return false;
  return parts[0] === 0 || parts[0] === 10 || parts[0] === 127 ||
    (parts[0] === 169 && parts[1] === 254) ||
    (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
    (parts[0] === 192 && parts[1] === 168) || parts[0] >= 224;
}
async function assertPublicHost(url) {
  const dns = require("node:dns/promises");
  const net = require("node:net");
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (net.isIP(host)) {
    if (isPrivateAddress(host)) throw new Error("Private address blocked");
    return;
  }
  const addresses = await dns.lookup(host, { all: true, verbatim: true });
  if (!addresses.length || addresses.some(item => isPrivateAddress(item.address))) {
    throw new Error("Non-public DNS address blocked");
  }
}
async function fetchPage(value) {
  let current = safePublicUrl(value);
  if (!current) return null;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      const url = new URL(current);
      await assertPublicHost(url);
      const response = await fetch(current, {
        headers: {
          "User-Agent": "ULUGBEK-AI-ResearchBot/0.2 (+public read-only page reader)",
          "Accept": "text/html, text/plain;q=0.9, application/xhtml+xml;q=0.9"
        },
        signal: controller.signal,
        redirect: "manual"
      });
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get("location");
        if (!location || hop === MAX_REDIRECTS) return null;
        current = safePublicUrl(new URL(location, current).href);
        if (!current) return null;
        continue;
      }
      if (!response.ok) return null;
      const type = (response.headers.get("content-type") || "").toLowerCase();
      if (!type.includes("text/html") && !type.includes("text/plain") &&
          !type.includes("application/xhtml+xml")) return null;
      const length = Number(response.headers.get("content-length") || 0);
      if (length > MAX_PAGE_BYTES) return null;
      const html = await response.text();
      if (Buffer.byteLength(html, "utf8") > MAX_PAGE_BYTES) return null;
      const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      const title = titleMatch ? clean(titleMatch[1], 240) : url.hostname;
      const content = type.includes("text/plain") ? clean(html, MAX_PAGE_CHARS) : stripHtml(html);
      if (content.length < 120) return null;
      return { title, url: current, content };
    }
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
async function search(query) {
  const q = clean(query, MAX_QUERY);
  if (q.length < 3) return [];
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const endpoint = "https://html.duckduckgo.com/html/?q=" + encodeURIComponent(q);
    const response = await fetch(endpoint, {
      headers: {
        "User-Agent": "ULUGBEK-AI-ChatResearch/0.3 (public read-only search)",
        "Accept": "text/html"
      },
      signal: controller.signal,
      redirect: "error"
    });
    if (!response.ok) throw new Error("Public search HTTP " + response.status);
    const html = await response.text();
    if (Buffer.byteLength(html, "utf8") > 1000000) throw new Error("Search response too large");
    return parseResults(html);
  } finally {
    clearTimeout(timeout);
  }
}
module.exports = { search, parseResults, safePublicUrl, fetchPage, stripHtml, isPrivateAddress };
