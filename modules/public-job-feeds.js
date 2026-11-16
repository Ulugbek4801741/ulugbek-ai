"use strict";

// Read-only public job feeds. These endpoints publish structured vacancy records;
// no login, CAPTCHA bypass, scraping of private profiles, or application submission.
const FEED_TIMEOUT_MS = 6500;
const MAX_FEED_BYTES = 2_000_000;
const MAX_AGE_DAYS = 60;

function safeUrl(value) {
  try {
    const url = new URL(String(value || ""));
    if (url.protocol !== "https:" || url.username || url.password) return "";
    return url.href;
  } catch (_) { return ""; }
}

function clean(value, max = 12000) {
  return String(value || "").replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]*>/g, " ").replace(/&amp;/gi, "&").replace(/&nbsp;/gi, " ")
    .replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<").replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ").trim().slice(0, max);
}

function isRecent(value, now = Date.now(), maxAgeDays = MAX_AGE_DAYS) {
  const time = typeof value === "number"
    ? (value > 10_000_000_000 ? value : value * 1000)
    : Date.parse(String(value || ""));
  if (!Number.isFinite(time)) return false;
  const age = now - time;
  return age >= -24 * 60 * 60 * 1000 && age <= maxAgeDays * 24 * 60 * 60 * 1000;
}

async function getJson(url, fetchImpl, timeoutMs = FEED_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, {
      method: "GET",
      headers: { Accept: "application/json", "User-Agent": "ULUGBEK-AI-OpenJobSearch/1.0" },
      redirect: "error",
      signal: controller.signal
    });
    if (!response || !response.ok) throw new Error("Feed HTTP " + (response?.status || 0));
    const declared = Number(response.headers?.get?.("content-length") || 0);
    if (declared > MAX_FEED_BYTES) throw new Error("Feed hajmi limitdan katta");
    const raw = await response.text();
    if (Buffer.byteLength(raw, "utf8") > MAX_FEED_BYTES) throw new Error("Feed hajmi limitdan katta");
    return JSON.parse(raw);
  } finally { clearTimeout(timer); }
}

function normalizeRecord(record, provider, now = Date.now()) {
  if (!record || typeof record !== "object") return null;
  let title = "", company = "", location = "", description = "", url = "", apply = "", salary = "", published = "", remote = false;
  if (provider === "remotive") {
    title = record.title; company = record.company_name; location = record.candidate_required_location || "Remote";
    description = record.description; url = record.url; apply = record.url; salary = record.salary; published = record.publication_date;
    remote = true;
  } else if (provider === "remoteok") {
    title = record.position; company = record.company; location = record.location || "Remote";
    description = record.description; url = record.url; apply = record.apply_url || record.url;
    salary = record.salary || (record.salary_min || record.salary_max ? String(record.salary_min || "") + "-" + String(record.salary_max || "") : "");
    published = record.date || record.epoch; remote = true;
  } else if (provider === "arbeitnow") {
    title = record.title; company = record.company_name; location = record.location || (record.remote ? "Remote" : "");
    description = record.description; url = record.url; apply = record.url;
    salary = ""; published = record.created_at; remote = record.remote === true || /remote|worldwide|anywhere/i.test(location);
  } else return null;

  const listingUrl = safeUrl(url);
  const applicationUrl = safeUrl(apply);
  if (!listingUrl || !applicationUrl || !clean(title, 220) || !clean(company, 180) || !isRecent(published, now)) return null;
  if (provider === "arbeitnow" && !remote) return null;
  const content = [
    "Employer: " + clean(company, 180),
    "Location: " + clean(location || "Remote", 220),
    salary ? "Salary: " + clean(salary, 180) : "",
    "Published: " + String(published),
    clean(description, 10000)
  ].filter(Boolean).join("\n");
  return {
    title: clean(title, 220), company: clean(company, 180),
    location: clean(location || "Remote", 220), salary: clean(salary, 180),
    description: clean(description, 10000), content, url: listingUrl, applicationUrl,
    publishedAt: String(published), officialStatus: "published",
    officialProvider: provider, pageRead: true, remote: true,
    feedVerified: true
  };
}

function buildFeedQueries(message) {
  const text = String(message || "").toLowerCase();
  const terms = [];
  if (/python/.test(text)) terms.push("python");
  if (/javascript|js\b/.test(text)) terms.push("javascript");
  if (/typescript/.test(text)) terms.push("typescript");
  if (/backend/.test(text)) terms.push("backend");
  if (/frontend/.test(text)) terms.push("frontend");
  if (/android|kotlin/.test(text)) terms.push("android kotlin");
  if (/qa|tester|testchi/.test(text)) terms.push("qa tester");
  if (/dasturchi|dasturlash|developer|programmer|software engineer/.test(text) || !terms.length) terms.push("software developer");
  return [...new Set(terms)].slice(0, 3);
}

async function fetchPublicJobFeeds(message, options = {}) {
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  const now = options.now == null ? Date.now() : options.now;
  if (typeof fetchImpl !== "function") return { results: [], providers: [], failures: ["fetch-unavailable"] };
  const terms = buildFeedQueries(message);
  const requests = [
    ...terms.map(term => ["remotive", "https://remotive.com/api/remote-jobs?search=" + encodeURIComponent(term)]),
    ["remoteok", "https://remoteok.com/api"],
    ["arbeitnow", "https://www.arbeitnow.com/api/job-board-api"]
  ];
  const settled = await Promise.all(requests.map(async ([provider, url]) => {
    try {
      const data = await getJson(url, fetchImpl);
      const rows = provider === "remotive" ? data?.jobs
        : provider === "remoteok" ? (Array.isArray(data) ? data.filter(item => item && item.position) : [])
        : data?.data;
      if (!Array.isArray(rows)) throw new Error("Feed formati noto‘g‘ri");
      return { provider, rows, error: null };
    } catch (error) { return { provider, rows: [], error: String(error?.message || error).slice(0, 180) }; }
  }));
  const results = [], seen = new Set();
  for (const item of settled) {
    for (const row of item.rows) {
      const normalized = normalizeRecord(row, item.provider, now);
      if (!normalized) continue;
      const key = normalized.url.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      results.push(normalized);
    }
  }
  return {
    results,
    providers: settled.filter(item => item.rows.length).map(item => item.provider),
    failures: settled.filter(item => item.error).map(item => item.provider + ": " + item.error),
    feedsChecked: settled.length,
    fetchedRecords: settled.reduce((sum, item) => sum + item.rows.length, 0)
  };
}

module.exports = { safeUrl, clean, isRecent, normalizeRecord, buildFeedQueries, fetchPublicJobFeeds };
