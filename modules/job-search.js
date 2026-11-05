"use strict";

const JOB_INTENT = /(?:\bish\s*(?:top(?:ib)?\s*ber|qidir(?:ib)?\s*ber|kerak|o\s*rin(?:lar)?|vakans(?:iya|iyalar)?|izlay(?:apman|man)?|qidir)|\bvakans(?:iya|iyalar)\b|\bjob\s*(?:search|opening|vacanc(?:y|ies))\b|\bfind\s+(?:me\s+)?a?\s*jobs?\b|\bemployment\s+(?:opportunit|jobs?)|\bработ(?:а|у)\s*(?:найти|ищу|нужна)|\bваканси)/iu;

function isJobSearchRequest(value) {
  return JOB_INTENT.test(String(value || "").trim());
}

const LOCATION_HINT = /(?:\b(?:uzbekistan|uzbekiston|o'zbekiston|shveysariya|shveytsariya|switzerland|aqsh|amerika|usa|united states|germaniya|germany|kanada|canada|polsha|poland|rossiya|russia|qozog'iston|kazakhstan|turkiya|turkey|baa|uae|saudiya|saudi arabia|qatar|koreya|korea|yaponiya|japan|buyuk britaniya|britaniya|angliya|uk|united kingdom|fransiya|france|italiya|italy|ispaniya|spain|norvegiya|norway|shvetsiya|sweden|finlyandiya|finland|niderlandiya|netherlands|avstraliya|australia|chexiya|czechia|litva|lithuania|latviya|latvia|estoniya|estonia|ruminiya|romania|irlandiya|ireland|buxoro|kogon|toshkent|samarqand|navoiy|qarshi|andijon|farg'ona|namangan|nukus|urganch|jizzax|termiz|guliston|denov|olot|g'ijduvon)(?:da|ga|dan|ning|ni)?\b|\bnear me\b|\byaqin(?:imda| atrofda)\b|\bрядом со мной\b/iu;

function hasLocationHint(value) {
  return LOCATION_HINT.test(String(value || ""));
}

function locationClarification() {
  return "Ish qidirishni boshlashim uchun qaysi davlat yoki shaharda ish kerakligini yozing. Masalan: O‘zbekistonda, Buxoroda yoki Shveysariyada. Shundan keyin mos vakansiyalarni qidiraman.";
}

function buildJobSearchQuery(value) {
  const original = String(value || "").replace(/\s+/g, " ").trim().slice(0, 180);
  return [original, "vakansiya ish o'rinlari ish beruvchi maosh ishga qabul", "jobs vacancies employer salary hiring"].filter(Boolean).join(" ");
}

function cleanText(value, max = 650) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, max);
}

async function searchJobs(message, webSearch, options = {}) {
  if (!webSearch || typeof webSearch.search !== "function") {
    return { ok: false, results: [], reply: "ULUGBEK AI internet qidiruv moduliga ulana olmadi." };
  }
  const limit = Math.max(1, Math.min(5, Number(options.limit) || 5));
  let found;
  try {
    found = await webSearch.search(buildJobSearchQuery(message));
  } catch (_) {
    return { ok: false, results: [], reply: "ULUGBEK AI ish vakansiyalarini qidirishda internet manbasiga ulana olmadi. Keyinroq qayta urinib ko'ring." };
  }
  const candidates = Array.isArray(found) ? found.slice(0, limit) : [];
  const results = await Promise.all(candidates.map(async item => {
    let page = null;
    if (typeof webSearch.fetchPage === "function" && item.url) {
      try { page = await webSearch.fetchPage(item.url); } catch (_) {}
    }
    return {
      title: cleanText(page?.title || item.title, 220),
      snippet: cleanText(page?.content || item.snippet, 900),
      url: page?.url || item.url,
      pageRead: Boolean(page)
    };
  }));
  const usable = results.filter(item => item.title && item.url);
  if (!usable.length) {
    return {
      ok: true,
      results: [],
      reply: "ULUGBEK AI hozircha qidiruv manbasidan mos vakansiya natijalarini ololmadi. Bu ish yo'q degani emas; qidiruv manbasi vaqtincha natija bermagan bo'lishi mumkin. Birozdan keyin boshqa so'zlar bilan urinib ko'ring."
    };
  }
  const lines = usable.map((item, index) => [
    (index + 1) + ". " + item.title,
    item.snippet ? item.snippet.slice(0, 650) : "E'lon tafsilotlari sahifada ko'rsatilgan.",
    "Manba: " + item.url,
    "Tekshiruv: " + (item.pageRead ? "sahifa ochildi; ish o'rni va ariza muddati ish beruvchi sahifasida qayta tekshirilsin" : "faqat qidiruv parchasi olindi; e'lon hali mustaqil tasdiqlanmagan")
  ].join("\n")).join("\n\n");
  return {
    ok: true,
    results: usable,
    reply: "ULUGBEK AI internetdan ishga oid " + usable.length + " ta natija topdi. E'lonning hali ochiqligi, viza, maosh va turar joy shartlarini ish beruvchining sahifasida tasdiqlang.\n\n" + lines
  };
}

module.exports = { isJobSearchRequest, hasLocationHint, locationClarification, buildJobSearchQuery, searchJobs };
