"use strict";

// Public web search adapter for ordinary chat. Search queries contain only the
// user's current question; chat history, account data and private memories are never sent.
const MAX_QUERY = 240;
const TIMEOUT_MS = 10000;
const MAX_RESULTS = 5;

function clean(value, max = 800) {
  return String(value || "").replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&").replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">").replace(/&nbsp;/g, " ")
    .replace(/\\s+/g, " ").trim().slice(0, max);
}
function safePublicUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (url.username || url.password) return null;
    const host = url.hostname.toLowerCase();
    if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") ||
        host === "127.0.0.1" || host === "::1" || host.startsWith("10.") ||
        host.startsWith("192.168.") || /^172\\.(1[6-9]|2\\d|3[01])\\./.test(host) ||
        host === "169.254.169.254" || host === "0.0.0.0") return null;
    return url.href;
  } catch (_) { return null; }
}
function parseResults(html) {
  const results = [];
  const pattern = /<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]+)"[^>]*>([\\s\\S]*?)<\\/a>[\\s\\S]{0,1800}?<a[^>]*class="[^"]*result__snippet[^"]*"[^>]*>([\\s\\S]*?)<\\/a>/gi;
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
async function search(query) {
  const q = clean(query, MAX_QUERY);
  if (q.length < 3) return [];
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const endpoint = "https://html.duckduckgo.com/html/?q=" + encodeURIComponent(q);
    const response = await fetch(endpoint, {
      headers: {
        "User-Agent": "ULUGBEK-AI-ChatResearch/0.2 (public read-only search)",
        "Accept": "text/html"
      },
      signal: controller.signal,
      redirect: "error"
    });
    if (!response.ok) throw new Error("Public search HTTP " + response.status);
    const html = await response.text();
    if (Buffer.byteLength(html, "utf8") > 1_000_000) throw new Error("Search response too large");
    return parseResults(html);
  } finally {
    clearTimeout(timeout);
  }
}
module.exports = { search, parseResults, safePublicUrl };
