"use strict";

const PLATFORM_HINTS = [
  { pattern: /\b(youtube|ютуб)\b|youtube\.com/i, domain: "site:youtube.com" },
  { pattern: /\b(facebook|фейсбук)\b|facebook\.com/i, domain: "site:facebook.com" },
  { pattern: /(?:\btelegram\w*|\bтелеграм\w*)|t\.me/i, domain: "(site:t.me OR site:telegram.org)" },
  { pattern: /\b(instagram|инстаграм)\b|instagram\.com/i, domain: "site:instagram.com" },
  { pattern: /\b(tiktok|тик-ток)\b|tiktok\.com/i, domain: "site:tiktok.com" },
  { pattern: /\b(google|гугл)\b|google\.com/i, domain: "site:google.com" }
];
const JOB_INTENT = /\bish\s*(?:top(?:ib)?(?:\s*ber)?|qidir(?:ib)?\s*ber|kerak|o\s*rin(?:lar)?|vakans(?:iya|iyalar)?|izlay(?:apman|man)?|qidir)|\bvakans(?:iya|iyalar)\b|\bjob\s*(?:search|opening|vacanc(?:y|ies))\b|\bfind\s+(?:me\s+)?a?\s*jobs?\b|\bemployment\s+(?:opportunit|jobs?)|\bработ(?:а|у)\s*(?:найти|ищу|нужна)|\bваканси/iu;
const LINK_INTENT = /(?:\blink\w*|\bssilka\w*|\bhavola\w*|\bmanzil\w*|\bwebsite\w*|\bweb.?sayt\w*|\bsayt\w*|\bkanal\w*|\bakkaunt\w*|\bprofil\w*|\bvideo\w*|\btop(?:ib)?(?:\s*ber)?|\bqidir(?:ib)?(?:\s*ber)?|\bfind\b|\bsearch\b|\bwhere\s+can\s+i\b)/iu;
const LOCAL_ONLY = /^(?:salom|assalomu alaykum|assalom alaykum|salom alaykum|hello|hi|hayrli tong|hayrli kun|hayrli kech|rahmat|katta rahmat|tashakkur|xayr|hayr|ko'rishguncha|ko'rishamiz|sen kimsan|siz kimsiz|isming nima|o'zing kimsan|nima qila olasan|nimalar qila olasan)[!.?\s]*$/iu;
const MATH_ONLY = /^\s*[\d\s.,()+*/%^-]+\s*(?:=|\?)*\s*$/u;

function detectSearchIntent(value) {
  const text = String(value || "").trim();
  const isJobSearch = JOB_INTENT.test(text);
  const isLinkSearch = LINK_INTENT.test(text);
  const platforms = PLATFORM_HINTS.filter(item => item.pattern.test(text)).map(item => item.domain);
  const localOnly = !text || LOCAL_ONLY.test(text) || MATH_ONLY.test(text);
  return { shouldSearch: !localOnly, isJobSearch, isLinkSearch, platforms,
    reason: localOnly ? "local-dialogue-or-arithmetic" : isJobSearch ? "job-search" : isLinkSearch ? "link-discovery" : "general-question-research" };
}
function cleanText(value, max = 1200) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, max);
}
function buildUniversalSearchQueries(value) {
  const original = cleanText(value, 220);
  const intent = detectSearchIntent(original);
  const suffix = [];
  if (intent.isJobSearch) suffix.push("vakansiya ish o'rinlari ish beruvchi maosh shartlari jobs vacancies employer salary hiring");
  if (intent.platforms.length) suffix.push(intent.platforms.join(" "));
  if (intent.isLinkSearch) suffix.push("official website official page link");
  const queries = [original, [original, ...suffix].join(" ")];
  if (intent.isJobSearch) queries.push(original + " official employer careers application requirements");
  else if (intent.isLinkSearch) queries.push(original + " rasmiy sayt official contact");
  else {
    queries.push(original + " official information facts explanation");
    queries.push(original + " evidence research detailed answer");
  }
  return [...new Set(queries.map(q => cleanText(q, 500)).filter(Boolean))].slice(0, 3);
}
function buildUniversalSearchQuery(value) { return buildUniversalSearchQueries(value)[1] || cleanText(value, 500); }
function hostOf(value) {
  try { return new URL(value).hostname.toLowerCase().replace(/^www\./, ""); } catch (_) { return ""; }
}
function sourceQuality(item) {
  const host = hostOf(item.url);
  if (/\.gov(?:\.|$)|\.gov\.[a-z]{2,}$|\.go\.[a-z]{2,}$/.test(host)) return 5;
  if (/\.edu(?:\.|$)|\.ac\.[a-z]{2,}$/.test(host)) return 4;
  if (/who\.int$|un\.org$|europa\.eu$|worldbank\.org$|oecd\.org$/.test(host)) return 4;
  if (/wikipedia\.org$/.test(host)) return 2;
  return item.pageRead ? 2 : 1;
}
async function searchWeb(message, webSearch, options = {}) {
  if (!webSearch || typeof webSearch.search !== "function") return {
    ok: false, results: [], reply: "ULUGBEK AI internet qidiruv moduliga ulana olmadi.", error: "search-adapter-unavailable"
  };
  const limit = Math.max(3, Math.min(10, Number(options.limit) || 8));
  const queries = buildUniversalSearchQueries(message);
  let failedQueries = 0;
  const batches = await Promise.all(queries.map(async query => {
    try {
      const found = await webSearch.search(query);
      return Array.isArray(found) ? found : [];
    } catch (_) { failedQueries += 1; return []; }
  }));
  const candidates = [];
  const seenUrls = new Set();
  for (const batch of batches) for (const item of batch) {
    if (!item?.url || seenUrls.has(item.url)) continue;
    seenUrls.add(item.url);
    candidates.push(item);
  }
  if (!candidates.length) return {
    ok: failedQueries < queries.length, results: [], queries,
    error: failedQueries === queries.length ? "all-search-providers-failed" : undefined,
    reply: failedQueries === queries.length
      ? "Internet qidiruv manbalari hozircha javob bermadi. Keyinroq qayta urinib ko'ring."
      : "ULUGBEK AI bir nechta qidiruv so'rovi bilan izlandi, ammo hozircha mos ochiq manba topilmadi. Bu ma'lumot mavjud emas degani emas."
  };
  const pages = await Promise.all(candidates.slice(0, Math.min(15, limit * 2)).map(async item => {
    let page = null;
    if (typeof webSearch.fetchPage === "function") {
      try { page = await webSearch.fetchPage(item.url); } catch (_) {}
    }
    const url = page?.url || item.url;
    const result = {
      title: cleanText(page?.title || item.title, 220),
      snippet: cleanText(page?.content || item.snippet, page ? 5000 : 1400),
      url, pageRead: Boolean(page), host: hostOf(url)
    };
    result.qualityScore = sourceQuality(result);
    return result;
  }));
  const ranked = pages.filter(item => item.title && item.url).sort((a, b) =>
    Number(b.pageRead) - Number(a.pageRead) || b.qualityScore - a.qualityScore || b.snippet.length - a.snippet.length
  );
  const selected = [], hostCounts = new Map();
  for (const item of ranked) {
    const count = hostCounts.get(item.host) || 0;
    if (count >= 2) continue;
    selected.push(item); hostCounts.set(item.host, count + 1);
    if (selected.length >= limit) break;
  }
  return {
    ok: true, results: selected, queries,
    reply: "ULUGBEK AI " + queries.length + " xil qidiruv orqali " + selected.length +
      " ta turli ochiq manbani topdi; " + selected.filter(x => x.pageRead).length +
      " ta sahifaning matnini o'qidi. Manbalar hali mustaqil fakt sifatida tasdiqlanmagan."
  };
}
function evidenceEntries(results) {
  return (Array.isArray(results) ? results : []).map(item => ({
    title: item.title, content: item.snippet, source: item.url,
    status: item.pageRead ? "unverified-public-page-content" : "unverified-search-snippet",
    sourceQuality: item.qualityScore || 1
  }));
}
function formatEvidenceReply(results, reason = "") {
  const items = Array.isArray(results) ? results : [];
  if (!items.length) return "Savol bo'yicha bir nechta ochiq manbada izlandim, ammo hozircha ishonchli dalil topilmadi. Savolni aniqlashtirish yoki boshqa manba turini tekshirish kerak. Men javobni to'qib aytmayman.";
  const lines = items.map((item, index) =>
    (index + 1) + ". " + item.title + "\n" + (item.snippet || "Sahifa matni olinmadi.") +
    "\nManba: " + item.url + "\nHolati: " + (item.pageRead ? "sahifa matni o'qildi, faktlar mustaqil tekshirilishi kerak" : "faqat qidiruv parchasi")
  );
  return "Savolga javobni ishonchli shakllantirish uchun quyidagi dalillar topildi:\n\n" + lines.join("\n\n") +
    (reason ? "\n\nIzoh: " + reason : "") +
    "\n\nBu avtomatik xulosa emas: til modeli ulanmagan yoki dalillar yetarli bo'lmagan holatda manbalarni ko'rsataman, tasdiqlanmagan fikrni aniq javob deb bermayman.";
}
module.exports = { detectSearchIntent, buildUniversalSearchQuery, buildUniversalSearchQueries, searchWeb, cleanText, evidenceEntries, formatEvidenceReply };
