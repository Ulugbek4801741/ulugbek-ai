"use strict";

// Federated, read-only discovery over public scholarly APIs.
// API records are evidence metadata, not proof that a publisher's full text is open.
const DEFAULT_TIMEOUT_MS = 9000;
const MAX_RESPONSE_BYTES = 1_500_000;
const USER_AGENT = "ULUGBEK-AI-OpenResearch/1.0 (public scholarly discovery)";

function clean(value, max = 5000) {
  return String(value || "").replace(/<[^>]*>/g, " ").replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&").replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'")
    .replace(/\s+/g, " ").trim().slice(0, max);
}
function safeUrl(value) {
  try {
    const url = new URL(String(value || ""));
    return url.protocol === "https:" && !url.username && !url.password ? url.href : "";
  } catch (_) { return ""; }
}
function yearFrom(value) {
  const match = String(value || "").match(/(?:19|20)\d{2}/);
  return match ? Number(match[0]) : null;
}
function authorsFrom(items) {
  return (Array.isArray(items) ? items : []).slice(0, 8).map(item =>
    clean(typeof item === "string" ? item : [item?.given, item?.family].filter(Boolean).join(" "), 120)
  ).filter(Boolean).join(", ");
}
function normalizeRecord(record) {
  if (!record || !record.title || !record.url) return null;
  const url = safeUrl(record.url);
  if (!url) return null;
  const abstract = clean(record.abstract || "", 4200);
  const parts = [
    record.title,
    record.authors ? "Mualliflar: " + record.authors : "",
    record.year ? "Yil: " + record.year : "",
    record.doi ? "DOI: " + record.doi : "",
    abstract ? "Annotatsiya: " + abstract : "",
    record.openAccessUrl ? "Ochiq nusxa: " + record.openAccessUrl : "",
    record.description ? "Tavsif: " + clean(record.description, 1800) : ""
  ].filter(Boolean);
  return {
    title: clean(record.title, 260),
    snippet: parts.join("\n").slice(0, 5200),
    url,
    pageRead: true,
    recordRead: true,
    sourceType: "scholarly-api-record",
    provider: record.provider,
    year: record.year || null,
    doi: record.doi || null,
    openAccess: Boolean(record.openAccessUrl),
    openAccessUrl: safeUrl(record.openAccessUrl || ""),
    qualityScore: Number(record.qualityScore) || 3
  };
}
async function getJson(url, options = {}) {
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  if (typeof fetchImpl !== "function") throw new Error("fetch-unavailable");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs || DEFAULT_TIMEOUT_MS);
  try {
    const response = await fetchImpl(url, {
      signal: controller.signal,
      headers: { "Accept": "application/json, application/xml, text/xml;q=0.9", "User-Agent": USER_AGENT }
    });
    if (!response || !response.ok) throw new Error("http-" + (response?.status || "unknown"));
    const text = await response.text();
    if (Buffer.byteLength(text, "utf8") > MAX_RESPONSE_BYTES) throw new Error("response-too-large");
    return text;
  } finally { clearTimeout(timeout); }
}
async function json(url, options) { return JSON.parse(await getJson(url, options)); }
function queryUrl(base, params) {
  const url = new URL(base);
  for (const [key, value] of Object.entries(params)) if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
  return url.href;
}
async function crossrefSearch(query, options) {
  const data = await json(queryUrl("https://api.crossref.org/works", {
    "query.bibliographic": query, rows: options.perSource, "select": "title,author,published,created,DOI,URL,abstract,link,type"
  }), options);
  return (data.message?.items || []).map(item => normalizeRecord({
    provider: "Crossref", title: item.title?.[0], authors: authorsFrom(item.author),
    year: yearFrom(item.published?.["date-parts"]?.[0]?.[0] || item.created?.["date-time"]),
    doi: item.DOI, url: item.URL, abstract: item.abstract,
    openAccessUrl: item.license?.some(license => /creativecommons\.org|publicdomain|creativecommons/i.test(license.URL || "")) ?
      (item.link || []).find(link => /pdf/i.test(link["content-type"] || ""))?.URL : "",
    qualityScore: 3
  })).filter(Boolean);
}
async function europePmcSearch(query, options) {
  const data = await json(queryUrl("https://www.ebi.ac.uk/europepmc/webservices/rest/search", {
    query, format: "json", pageSize: options.perSource, resultType: "core"
  }), options);
  return (data.resultList?.result || []).map(item => {
    const fullText = item.fullTextUrlList?.fullTextUrl || [];
    const open = fullText.find(link => /pmc|pdf|fullText/i.test((link.site || "") + " " + (link.documentStyle || "")))?.url;
    const landing = item.pmcid ? "https://europepmc.org/articles/" + encodeURIComponent(item.pmcid) :
      item.doi ? "https://doi.org/" + encodeURIComponent(item.doi) : "https://europepmc.org/article/MED/" + encodeURIComponent(item.id || "");
    return normalizeRecord({
      provider: "Europe PMC", title: item.title, authors: item.authorString,
      year: yearFrom(item.firstPublicationDate || item.pubYear), doi: item.doi,
      url: landing, abstract: item.abstractText, openAccessUrl: item.isOpenAccess === "Y" ? open : "",
      qualityScore: 4
    });
  }).filter(Boolean);
}
async function arxivSearch(query, options) {
  const url = queryUrl("https://export.arxiv.org/api/query", {
    search_query: "all:" + query.replace(/[^\p{L}\p{N}\s-]/gu, " ").trim().split(/\s+/).slice(0, 8).join("_"),
    start: 0, max_results: options.perSource
  });
  const xml = await getJson(url, options);
  const entries = xml.match(/<entry>[\s\S]*?<\/entry>/g) || [];
  return entries.map(entry => {
    const value = tag => clean((entry.match(new RegExp("<" + tag + "(?:\\s[^>]*)?>([\\s\\S]*?)<\\/" + tag + ">", "i")) || [,""])[1], 3000);
    const id = value("id");
    return normalizeRecord({
      provider: "arXiv", title: value("title"), authors: (entry.match(/<author>[\s\S]*?<name>([\s\S]*?)<\/name>[\s\S]*?<\/author>/g) || []).map(x => clean((x.match(/<name>([\s\S]*?)<\/name>/) || [,""])[1], 100)).join(", "),
      year: yearFrom(value("published")), url: id, abstract: value("summary"),
      openAccessUrl: id ? id.replace(/abs\//, "pdf/") + ".pdf" : "", qualityScore: 3
    });
  }).filter(Boolean);
}
async function zenodoSearch(query, options) {
  const data = await json(queryUrl("https://zenodo.org/api/records", { q: query, size: options.perSource }), options);
  return (data.hits?.hits || []).map(item => normalizeRecord({
    provider: "Zenodo", title: item.metadata?.title, authors: authorsFrom(item.metadata?.creators?.map(x => x.name)),
    year: yearFrom(item.metadata?.publication_date), doi: item.doi,
    url: item.links?.html || item.links?.self, description: item.metadata?.description,
    openAccessUrl: item.metadata?.access_right === "open" ? item.files?.find(f => f.links?.self)?.links?.self : "",
    qualityScore: 4
  })).filter(Boolean);
}
async function openLibrarySearch(query, options) {
  const data = await json(queryUrl("https://openlibrary.org/search.json", {
    q: query, limit: options.perSource,
    fields: "key,title,author_name,first_publish_year,edition_count,ebook_access"
  }), options);
  return (data.docs || []).map(item => {
    const key = String(item.key || "");
    const landing = key.startsWith("/works/") ? "https://openlibrary.org" + key : "";
    return normalizeRecord({
      provider: "Open Library", title: item.title,
      authors: authorsFrom(item.author_name), year: item.first_publish_year,
      url: landing, description: "Nashrlar soni: " + (item.edition_count || 0) +
        "; elektron kirish: " + clean(item.ebook_access || "ko'rsatilmagan", 80),
      qualityScore: 2
    });
  }).filter(Boolean);
}
async function doajSearch(query, options) {
  const endpoint = "https://doaj.org/api/search/articles/" + encodeURIComponent(query) +
    "?page=1&pageSize=" + options.perSource;
  const data = await json(endpoint, options);
  return (data.results || []).map(item => {
    const bib = item.bibjson || {};
    const doi = (bib.identifier || []).find(x => String(x.type || "").toLowerCase() === "doi")?.id;
    const link = (bib.link || []).find(x => safeUrl(x.url));
    return normalizeRecord({
      provider: "DOAJ", title: bib.title,
      authors: authorsFrom(bib.author?.map(x => x.name)),
      year: yearFrom(bib.year), doi, url: link?.url || (doi ? "https://doi.org/" + doi : ""),
      abstract: bib.abstract, openAccessUrl: link?.url, qualityScore: 4
    });
  }).filter(Boolean);
}
async function coreSearch(query, options) {
  const apiKey = process.env.CORE_API_KEY || "";
  if (!apiKey) return [];
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs || DEFAULT_TIMEOUT_MS);
  try {
    const response = await fetchImpl("https://api.core.ac.uk/v3/search/works", {
      method: "POST", signal: controller.signal,
      headers: { "Authorization": "Bearer " + apiKey, "Content-Type": "application/json",
        "Accept": "application/json", "User-Agent": USER_AGENT },
      body: JSON.stringify({ q: query, limit: options.perSource })
    });
    if (!response?.ok) throw new Error("http-" + (response?.status || "unknown"));
    const text = await response.text();
    if (Buffer.byteLength(text, "utf8") > MAX_RESPONSE_BYTES) throw new Error("response-too-large");
    const data = JSON.parse(text);
    return (data.results || []).map(item => {
      const doi = item.doi || (item.identifiers || []).find(x => /^10\./.test(String(x))) || "";
      const download = safeUrl(item.downloadUrl || item.fullTextUrl);
      return normalizeRecord({
        provider: "CORE", title: item.title, authors: authorsFrom(item.authors?.map(x => x.name || x)),
        year: yearFrom(item.yearPublished || item.publishedDate), doi,
        url: item.links?.find(x => x.type === "display")?.url || item.sourceFulltextUrls?.[0] ||
          (doi ? "https://doi.org/" + doi : item.id ? "https://core.ac.uk/works/" + item.id : ""),
        abstract: item.abstract, openAccessUrl: download, qualityScore: 4
      });
    }).filter(Boolean);
  } finally { clearTimeout(timeout); }
}
async function openAlexSearch(query, options) {
  const apiKey = process.env.OPENALEX_API_KEY || "";
  if (!apiKey) return [];
  const data = await json(queryUrl("https://api.openalex.org/works", {
    search: query, "per-page": options.perSource, api_key: apiKey
  }), options);
  return (data.results || []).map(item => {
    let abstract = "";
    const index = item.abstract_inverted_index;
    if (index && typeof index === "object") {
      const words = [];
      for (const [word, positions] of Object.entries(index)) for (const position of positions || []) words[position] = word;
      abstract = words.filter(Boolean).join(" ");
    }
    const location = item.best_oa_location || item.primary_location || {};
    return normalizeRecord({
      provider: "OpenAlex", title: item.title,
      authors: authorsFrom((item.authorships || []).map(x => x.author?.display_name)),
      year: item.publication_year, doi: item.doi,
      url: location.landing_page_url || item.doi || item.id,
      abstract, openAccessUrl: item.open_access?.is_oa ? location.pdf_url : "",
      qualityScore: 4
    });
  }).filter(Boolean);
}
async function searchOpenResearch(query, options = {}) {
  const text = clean(query, 260);
  if (!text) return { results: [], providers: [], failedProviders: [] };
  const config = { perSource: Math.max(2, Math.min(6, Number(options.perSource) || 4)), ...options };
  const providers = [
    ["Crossref", crossrefSearch],
    ["Europe PMC", europePmcSearch],
    ["arXiv", arxivSearch],
    ["Zenodo", zenodoSearch],
    ["DOAJ", doajSearch],
    ["Open Library", openLibrarySearch],
    ["CORE", coreSearch],
    ["OpenAlex", openAlexSearch]
  ];
  const settled = await Promise.all(providers.map(async ([name, fn]) => {
    if (name === "CORE" && !process.env.CORE_API_KEY) return { name, results: [], ok: true, skipped: true };
    if (name === "OpenAlex" && !process.env.OPENALEX_API_KEY) return { name, results: [], ok: true, skipped: true };
    try { return { name, results: await fn(text, config), ok: true }; }
    catch (error) { return { name, results: [], ok: false, error: error.name || "provider-error" }; }
  }));
  const seen = new Set();
  const results = [];
  for (const item of settled.flatMap(x => x.results)) {
    const key = item.doi ? "doi:" + item.doi.toLowerCase() : item.url;
    if (seen.has(key)) continue;
    seen.add(key); results.push(item);
  }
  results.sort((a, b) => Number(b.openAccess) - Number(a.openAccess) ||
    b.qualityScore - a.qualityScore || (b.year || 0) - (a.year || 0));
  return {
    results: results.slice(0, Math.max(3, Math.min(12, Number(options.limit) || 8))),
    providers: settled.filter(x => x.ok && !x.skipped).map(x => x.name),
    skippedProviders: settled.filter(x => x.skipped).map(x => x.name),
    failedProviders: settled.filter(x => !x.ok).map(x => x.name)
  };
}
async function searchUniversities(query, options = {}) {
  const text = clean(query, 180);
  if (!text) return { results: [], providers: [], failedProviders: [] };
  const params = { query: text, "page": 1, "page_size": Math.max(3, Math.min(8, Number(options.limit) || 5)) };
  const settled = await Promise.all([
    (async () => {
      const data = await json(queryUrl("https://api.ror.org/v2/organizations", params), options);
      return (data.items || []).map(item => ({
        title: clean(item.names?.find(x => x.types?.includes("ror_display"))?.value || item.name, 240),
        snippet: [
          "Tashkilot turi: " + clean((item.types || []).join(", "), 160),
          "Davlat: " + clean(item.country?.country_name, 120),
          "Holati: " + clean(item.status, 60),
          "Rasmiy sayt: " + safeUrl(item.links?.find(x => x.type === "website")?.value || item.links?.[0]?.value)
        ].join("\n"),
        url: safeUrl(item.links?.find(x => x.type === "website")?.value || item.links?.[0]?.value) || safeUrl(item.id),
        pageRead: true, recordRead: true, sourceType: "institution-registry-record",
        provider: "Research Organization Registry (ROR)", qualityScore: 4
      })).filter(x => x.title && x.url);
    })()
  ].map(p => p.then(results => ({ ok: true, results })).catch(error => ({ ok: false, results: [], error: error.name || "provider-error" }))));
  return {
    results: settled.flatMap(x => x.results).slice(0, params.page_size),
    providers: settled.filter(x => x.ok).map(() => "ROR"),
    failedProviders: settled.filter(x => !x.ok).map(() => "ROR")
  };
}
function isUniversityQuery(value) {
  return /universit|university|oliy\s+ta.?lim|institut|kutubxona|library|research\s+center|ilmiy\s+markaz/iu.test(String(value || ""));
}
module.exports = { clean, safeUrl, normalizeRecord, searchOpenResearch, searchUniversities, isUniversityQuery };
