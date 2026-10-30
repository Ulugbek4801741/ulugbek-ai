"use strict";
const store = require("./knowledge-store");

const TOPICS = (process.env.KNOWLEDGE_TOPICS ||
  "artificial intelligence,machine learning,robotics,programming,mathematics,physics,biology,history,Uzbekistan,English language,Uzbek language,cybersecurity,renewable energy,business,education")
  .split(",").map(x => x.trim()).filter(Boolean).slice(0, 30);
const INTERVAL_MS = Math.max(6, Number(process.env.KNOWLEDGE_INTERVAL_HOURS || 24)) * 60 * 60 * 1000;
const LANGUAGES = (process.env.KNOWLEDGE_LANGUAGES || "uz,en").split(",").map(x => x.trim()).filter(x => /^[a-z-]{2,12}$/i.test(x)).slice(0, 3);
let timer = null;
let running = false;

async function fetchWiki(language, topic) {
  const endpoint = new URL("https://" + language + ".wikipedia.org/w/api.php");
  endpoint.search = new URLSearchParams({
    action: "query", format: "json", generator: "search", gsrsearch: topic,
    gsrlimit: "2", prop: "extracts|info", exintro: "1", explaintext: "1",
    exchars: "3500", inprop: "url"
  }).toString();
  const response = await fetch(endpoint, {
    method: "GET", redirect: "error",
    headers: { "User-Agent": "ULUGBEK-AI-KnowledgeBot/1.0 (read-only; contact: project maintainers)" },
    signal: AbortSignal.timeout(12000)
  });
  if (!response.ok) throw new Error("Wikipedia HTTP " + response.status);
  const data = await response.json();
  return Object.values(data?.query?.pages || {}).map(page => ({
    title: page.title, text: page.extract || "", url: page.fullurl || ("https://" + language + ".wikipedia.org/wiki/" + encodeURIComponent(page.title.replace(/ /g, "_"))),
    language, source: "Wikimedia Wikipedia", license: "CC BY-SA; attribution and share-alike terms apply"
  })).filter(x => x.text.length > 120);
}
async function runOnce() {
  if (running) return { skipped: true, reason: "already_running" };
  running = true;
  let saved = 0, errors = 0;
  try {
    for (const language of LANGUAGES) {
      for (const topic of TOPICS) {
        try {
          const pages = await fetchWiki(language, topic);
          for (const page of pages) if (await store.add(page)) saved++;
        } catch (_) { errors++; }
        await new Promise(resolve => setTimeout(resolve, 1100));
      }
    }
    return { ok: true, saved, errors, topics: TOPICS.length, languages: LANGUAGES };
  } finally { running = false; }
}
function start() {
  if (process.env.KNOWLEDGE_INGESTION_ENABLED !== "true" || timer) return false;
  runOnce().catch(() => {});
  timer = setInterval(() => runOnce().catch(() => {}), INTERVAL_MS);
  if (timer.unref) timer.unref();
  return true;
}
module.exports = { start, runOnce };
