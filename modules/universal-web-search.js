"use strict";

const PLATFORM_HINTS = [
  { pattern: /\b(youtube|ютуб)\b|youtube\.com/i, domain: "site:youtube.com" },
  { pattern: /\b(facebook|фейсбук)\b|facebook\.com/i, domain: "site:facebook.com" },
  { pattern: /\b(telegram|телеграм)\b|t\.me/i, domain: "(site:t.me OR site:telegram.org)" },
  { pattern: /\b(instagram|инстаграм)\b|instagram\.com/i, domain: "site:instagram.com" },
  { pattern: /\b(tiktok|тик-ток)\b|tiktok\.com/i, domain: "site:tiktok.com" },
  { pattern: /\b(google|гугл)\b|google\.com/i, domain: "site:google.com" }
];

const JOB_INTENT = /\bish\s*(?:top(?:ib)?\s*ber|qidir(?:ib)?\s*ber|kerak|o\s*rin(?:lar)?|vakans(?:iya|iyalar)?|izlay(?:apman|man)?|qidir)|\bvakans(?:iya|iyalar)\b|\bjob\s*(?:search|opening|vacanc(?:y|ies))\b|\bfind\s+(?:me\s+)?a?\s*jobs?\b|\bemployment\s+(?:opportunit|jobs?)|\bработ(?:а|у)\s*(?:найти|ищу|нужна)|\bваканси/iu;
const LINK_INTENT = /(?:\blink\b|\bssilka\b|\bhavola\b|\bmanzilini\b|\bwebsite\b|\bweb.?sayt\b|\bsaytini\b|\bkanal(?:ini)?\b|\bakkaunt(?:ini)?\b|\bprofil(?:ini)?\b|\bvideo(?:sini)?\b|\btop(?:ib)?\s*ber|\bqidir(?:ib)?\s*ber|\bfind\b|\bsearch\b|\bwhere\s+can\s+i\b)/iu;

function detectSearchIntent(value) {
  const text = String(value || "").trim();
  const isJobSearch = JOB_INTENT.test(text);
  const isLinkSearch = LINK_INTENT.test(text);
  const platforms = PLATFORM_HINTS.filter(item => item.pattern.test(text)).map(item => item.domain);
  return { shouldSearch: isJobSearch || isLinkSearch, isJobSearch, isLinkSearch, platforms };
}

function buildUniversalSearchQuery(value) {
  const original = String(value || "").replace(/\s+/g, " ").trim().slice(0, 180);
  const intent = detectSearchIntent(original);
  const hints = [];
  if (intent.isJobSearch) hints.push("vakansiya ish o'rinlari ish beruvchi maosh ishga qabul jobs vacancies employer salary hiring");
  if (intent.platforms.length) hints.push(intent.platforms.join(" "));
  if (intent.isLinkSearch) hints.push("official website official page link");
  return [original, ...hints].filter(Boolean).join(" ").slice(0, 500);
}

function cleanText(value, max = 650) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, max);
}

async function searchWeb(message, webSearch, options = {}) {
  if (!webSearch || typeof webSearch.search !== "function") {
    return { ok: false, results: [], reply: "ULUGBEK AI internet qidiruv moduliga ulana olmadi." };
  }
  const limit = Math.max(1, Math.min(8, Number(options.limit) || 6));
  let found;
  try {
    found = await webSearch.search(buildUniversalSearchQuery(message));
  } catch (_) {
    return { ok: false, results: [], reply: "ULUGBEK AI internet qidiruv manbasiga ulana olmadi. Keyinroq qayta urinib ko'ring." };
  }
  const candidates = Array.isArray(found) ? found.slice(0, limit) : [];
  const results = await Promise.all(candidates.map(async item => {
    let page = null;
    if (typeof webSearch.fetchPage === "function" && item.url) {
      try { page = await webSearch.fetchPage(item.url); } catch (_) {}
    }
    return {
      title: cleanText(page?.title || item.title, 220),
      snippet: cleanText(page?.content || item.snippet, 1100),
      url: page?.url || item.url,
      pageRead: Boolean(page)
    };
  }));
  const usable = results.filter(item => item.title && item.url);
  if (!usable.length) {
    return {
      ok: true,
      results: [],
      reply: "ULUGBEK AI hozircha ochiq internetdan mos natija topolmadi. Bu ma'lumot mavjud emas degani emas: boshqa kalit so'zlar bilan qidirib ko'ring yoki manba vaqtincha ishlamayotgan bo'lishi mumkin."
    };
  }
  const lines = usable.map((item, index) => [
    (index + 1) + ". " + item.title,
    item.snippet || "Sahifa tafsilotlarini havola orqali ko'ring.",
    "Havola: " + item.url,
    "Manba holati: " + (item.pageRead ? "sahifa ochildi; mazmuni ko'rib chiqildi" : "qidiruv parchasi; sahifa to'liq tekshirilmagan")
  ].join("\n")).join("\n\n");
  const label = detectSearchIntent(message).isJobSearch ? "ish va vakansiya" : "internet";
  return {
    ok: true,
    results: usable,
    reply: "ULUGBEK AI " + label + " qidiruvida " + usable.length + " ta ochiq manba topdi. Muhim ma'lumotlarni manbaning o'zida qayta tekshiring.\n\n" + lines
  };
}

module.exports = { detectSearchIntent, buildUniversalSearchQuery, searchWeb, cleanText };
