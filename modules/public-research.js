"use strict";

// Read-only, no-key public research through the fixed Wikipedia API.
// Retrieved text is untrusted context, never instructions or verified truth.
const MAX_RESULTS = 3;
const MAX_EXTRACT = 1800;
const TIMEOUT_MS = 9000;

function clean(value, max) {
  return String(value || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

async function searchPublicKnowledge(query) {
  const q = clean(query, 240);
  if (!q) return [];
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const url = new URL("https://en.wikipedia.org/w/api.php");
    url.search = new URLSearchParams({
      action: "query",
      generator: "search",
      gsrsearch: q,
      gsrnamespace: "0",
      gsrlimit: String(MAX_RESULTS),
      prop: "extracts",
      exintro: "1",
      explaintext: "1",
      exchars: String(MAX_EXTRACT),
      redirects: "1",
      format: "json"
    }).toString();
    const response = await fetch(url, {
      headers: { "User-Agent": "ULUGBEK-AI-Research/1.0 (public read-only; no API key)", "Accept": "application/json" },
      signal: controller.signal,
      redirect: "error"
    });
    if (!response.ok) throw new Error("Ochiq bilim manbasi HTTP " + response.status);
    const raw = await response.text();
    if (Buffer.byteLength(raw, "utf8") > 500000) throw new Error("Ochiq manba javobi juda katta.");
    const payload = JSON.parse(raw);
    const pages = Object.values(payload?.query?.pages || {}).slice(0, MAX_RESULTS);
    return pages.map(page => ({
      title: clean(page.title, 180),
      extract: clean(page.extract, MAX_EXTRACT),
      source: "https://en.wikipedia.org/?curid=" + encodeURIComponent(String(page.pageid)),
      status: "unverified-public-source"
    })).filter(item => item.title && item.extract);
  } finally {
    clearTimeout(timer);
  }
}

function needsResearch(message) {
  return /internet|manba|izlab|izla|tadqiq|yangilik|so'nggi|oxirgi|hozirgi|bugungi|202[5-9]|narx|qonun|ilmiy|o'rgan|taqqosla/i.test(String(message || ""));
}

module.exports = { searchPublicKnowledge, needsResearch };
