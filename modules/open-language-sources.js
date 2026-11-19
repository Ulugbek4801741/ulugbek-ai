"use strict";

const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");

const DATA_DIR = path.resolve(process.env.ULUGBEK_DATA_DIR || path.join(__dirname, "..", "data"));
const KNOWLEDGE_FILE = path.join(DATA_DIR, "knowledge.json");
const REFRESH_MS = 6 * 60 * 60 * 1000;
const MAX_PER_LANGUAGE = 20;
const LANGUAGE_CONFIG = [
  { code: "uz", api: "uzb", query: "salom", name: "O‘zbekcha", share: 60 },
  { code: "en", api: "eng", query: "hello", name: "English", share: 25 },
  { code: "ru", api: "rus", query: "привет", name: "Русский", share: 15 }
];
const SOURCE_CATALOG = [
  { id: "tatoeba", name: "Tatoeba", kind: "parallel-sentences-api", url: "https://api.tatoeba.org/v1/sentences", languages: ["uz","en","ru"], license: "CC BY 2.0 FR (verify sentence attribution)", mode: "api-sync", factualUse: false },
  { id: "universal-dependencies", name: "Universal Dependencies", kind: "annotated-grammar-treebanks", url: "https://universaldependencies.org/", languages: ["uz","en","ru"], license: "Each treebank has its own license; check before importing", mode: "catalog-only-until-license-checked", factualUse: false },
  { id: "opus", name: "OPUS", kind: "parallel-corpora", url: "https://opus.nlpl.eu/", languages: ["uz","en","ru"], license: "Varies by constituent corpus; check each corpus license", mode: "catalog-only-until-license-checked", factualUse: false },
  { id: "leipzig-corpora", name: "Leipzig Corpora Collection", kind: "monolingual-corpora", url: "https://corpora.uni-leipzig.de/", languages: ["uz","en","ru"], license: "Check dataset-specific terms before download", mode: "catalog-only-until-license-checked", factualUse: false },
  { id: "wikipedia", name: "Wikipedia", kind: "encyclopedia-language-text", url: "https://www.wikipedia.org/", languages: ["uz","en","ru"], license: "CC BY-SA 4.0; attribution and share-alike requirements", mode: "existing-approved-public-crawler", factualUse: false }
];
let lastSyncAt = null;
let lastError = null;
let lastAdded = 0;
let running = false;
let lastCounts = { uz: 0, en: 0, ru: 0 };

function clean(value, max = 1200) {
  return String(value || "").replace(/<[^>]*>/g, " ").replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, " ").trim().slice(0, max);
}
function safeSentence(item, language) {
  const text = clean(item?.text || item?.sentence || "", 1200);
  if (text.length < 12 || text.length > 1200 || /(?:<script|javascript:|api[_ -]?key|password|secret token)/iu.test(text)) return null;
  const id = String(item?.id || item?.sentence_id || "").replace(/[^0-9]/g, "");
  if (!id) return null;
  const username = clean(item?.owner?.username || item?.user?.username || item?.username || "Tatoeba contributor", 100);
  return {
    id: crypto.createHash("sha256").update("tatoeba:" + id + ":" + language).digest("hex"),
    title: "Tatoeba " + language.toUpperCase() + " sentence #" + id,
    content: text,
    source: "https://tatoeba.org/en/sentences/show/" + id,
    language,
    agent: "AutonomousLanguageCorpusAgent",
    status: "pending-review",
    quality: "open-language-corpus-sentence-unverified",
    license: "CC BY 2.0 FR",
    attribution: username,
    factualUseAllowed: false,
    trainingScope: "language-patterns-only",
    createdAt: new Date().toISOString()
  };
}
async function readKnowledge(file = KNOWLEDGE_FILE) {
  try {
    const data = JSON.parse(await fs.readFile(file, "utf8"));
    return Array.isArray(data) ? data : [];
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}
async function writeKnowledge(items, file = KNOWLEDGE_FILE) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const temp = file + ".language.tmp";
  await fs.writeFile(temp, JSON.stringify(items.slice(-2000), null, 2), { mode: 0o600 });
  await fs.rename(temp, file);
}
async function fetchTatoeba(language, options = {}) {
  const config = LANGUAGE_CONFIG.find(item => item.code === language);
  if (!config) throw new Error("Unsupported language");
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  const url = new URL("https://api.tatoeba.org/v1/sentences");
  url.searchParams.set("lang", config.api);
  url.searchParams.set("q", config.query);
  url.searchParams.set("limit", String(MAX_PER_LANGUAGE));
  url.searchParams.set("showtrans", "all");
  const response = await fetchImpl(url.href, {
    headers: { Accept: "application/json", "User-Agent": "ULUGBEK-AI-Language-Corpus/1.0 (open dataset learning)" },
    redirect: "error",
    signal: AbortSignal.timeout(12000)
  });
  if (!response.ok) throw new Error("Tatoeba HTTP " + response.status);
  const raw = await response.text();
  if (Buffer.byteLength(raw, "utf8") > 1_000_000) throw new Error("Tatoeba response too large");
  const payload = JSON.parse(raw);
  const rows = Array.isArray(payload.data) ? payload.data :
    Array.isArray(payload.results) ? payload.results :
    Array.isArray(payload.sentences) ? payload.sentences : [];
  return rows.map(item => safeSentence(item, language)).filter(Boolean).slice(0, MAX_PER_LANGUAGE);
}
async function sync(options = {}) {
  if (running) return status();
  if (!options.force && lastSyncAt && Date.now() - Date.parse(lastSyncAt) < REFRESH_MS) return status();
  running = true;
  try {
    const fetchImpl = options.fetchImpl || globalThis.fetch;
    const current = await readKnowledge(options.knowledgeFile || KNOWLEDGE_FILE);
    const known = new Set(current.map(item => item?.source).filter(Boolean));
    const additions = [];
    const errors = [];
    for (const config of LANGUAGE_CONFIG) {
      try {
        const rows = await fetchTatoeba(config.code, { fetchImpl });
        let count = 0;
        for (const row of rows) {
          if (!known.has(row.source)) {
            known.add(row.source);
            additions.push(row);
            count++;
          }
        }
        lastCounts[config.code] = count;
      } catch (error) {
        errors.push(config.code + ": " + String(error.message || error).slice(0, 120));
        lastCounts[config.code] = 0;
      }
    }
    if (additions.length) await writeKnowledge([...current, ...additions], options.knowledgeFile || KNOWLEDGE_FILE);
    lastAdded = additions.length;
    lastSyncAt = new Date().toISOString();
    lastError = errors.length ? errors.join("; ") : null;
    return status();
  } finally {
    running = false;
  }
}
function status() {
  return {
    ready: true,
    module: "ulugbek-open-language-sources",
    connectedSources: ["tatoeba"],
    catalogSources: SOURCE_CATALOG,
    supportedLanguages: LANGUAGE_CONFIG.map(item => item.code),
    languagePriority: LANGUAGE_CONFIG.map(({ code, share }) => ({ language: code, sharePercent: share })),
    syncIntervalHours: 6,
    lastSyncAt,
    lastAdded,
    lastCounts,
    running,
    lastError,
    rightsPolicy: "Tatoeba text is stored as pending-review and used only for language-pattern statistics; never auto-approved as factual knowledge.",
    attributionRequired: true
  };
}
module.exports = { sync, status, fetchTatoeba, safeSentence, SOURCE_CATALOG, LANGUAGE_CONFIG };
