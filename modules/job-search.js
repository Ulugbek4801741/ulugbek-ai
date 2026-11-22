"use strict";

const JOB_INTENT = /(?:\bish\s*(?:top(?:ib)?\s*ber|qidir(?:ib)?\s*ber|kerak|o\s*rin(?:lar)?|vakans(?:iya|iyalar)?|izlay(?:apman|man)?|qidir)|\bvakans(?:iya|iyalar)\b|\bjob\s*(?:search|opening|vacanc(?:y|ies))\b|\bfind\s+(?:me\s+)?a?\s*jobs?\b|\bemployment\s+(?:opportunit|jobs?)|\bработ(?:а|у)\s*(?:найти|ищу|нужна)|\bваканси)/iu;

function isJobSearchRequest(value) {
  return JOB_INTENT.test(String(value || "").trim());
}

const LOCATION_HINT = /(?:\b(?:uzbekistan|uzbekiston|o'zbekiston|shveysariya|shveytsariya|switzerland|aqsh|amerika|usa|united states|germaniya|germany|kanada|canada|polsha|poland|rossiya|russia|qozog'iston|kazakhstan|turkiya|turkey|baa|uae|saudiya|saudi arabia|qatar|koreya|korea|yaponiya|japan|buyuk britaniya|britaniya|angliya|uk|united kingdom|fransiya|france|italiya|italy|ispaniya|spain|norvegiya|norway|shvetsiya|sweden|finlyandiya|finland|niderlandiya|netherlands|avstraliya|australia|chexiya|czechia|litva|lithuania|latviya|latvia|estoniya|estonia|ruminiya|romania|irlandiya|ireland|buxoro|kogon|toshkent|samarqand|navoiy|qarshi|andijon|farg'ona|namangan|nukus|urganch|jizzax|termiz|guliston|denov|olot|g'ijduvon)(?:da|ga|dan|ning|ni)?\b|\bnear me\b|\byaqin(?:imda| atrofda)\b|\bрядом со мной\b)/iu;

function hasLocationHint(value) {
  return LOCATION_HINT.test(String(value || ""));
}

function locationClarification() {
  return "Ish qidirishim uchun qaysi shahar yoki tumanda ish kerakligini yozing. Masalan: Kogon, Buxoro yoki Toshkent. Shundan keyin haqiqiy vakansiya manbalarini qidiraman.";
}

function buildJobSearchQuery(value) {
  const original = String(value || "").replace(/\s+/g, " ").trim().slice(0, 180);
  return [original, '"vakansiya" OR "ish o\'rni" OR "ishga qabul" ish beruvchi maosh', "jobs vacancies hiring employer salary"].filter(Boolean).join(" ");
}

function decodeHtmlEntities(value) {
  let text = String(value || "");
  for (let i = 0; i < 3; i += 1) {
    const decoded = text
      .replace(/&amp;/gi, "&")
      .replace(/&quot;/gi, '"')
      .replace(/&apos;|&#39;/gi, "'")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&nbsp;/gi, " ")
      .replace(/&#(\d+);/g, (_match, code) => {
        const point = Number(code);
        return point > 0 && point <= 0x10ffff ? String.fromCodePoint(point) : " ";
      })
      .replace(/&#x([0-9a-f]+);/gi, (_match, code) => {
        const point = parseInt(code, 16);
        return point > 0 && point <= 0x10ffff ? String.fromCodePoint(point) : " ";
      });
    if (decoded === text) break;
    text = decoded;
  }
  return text;
}
function cleanText(value, max = 650) {
  return decodeHtmlEntities(value).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

const JOB_SIGNAL = /(?:\bvacanc(?:y|ies)\b|vakans|ish\s*o['’‘ʻ]?rni|ishga\s*qabul|ishchi\s*kerak|ish\s*bor|bo['’‘ʻ]?sh\s*ish|xodim\s*kerak|работа|ваканси|сотрудник|job\s*opening|job\s*vacanc|career|hiring|recruit(?:ment)?|employment|apply\s*now)/iu;
const NON_JOB_SIGNAL = /(?:stock\s*photo|rasm\s*galereya|photo\s*gallery|tourist\s*attraction|mausoleum|travel\s*guide|weather|ob[- ]?havo|wikipedia|map\s*of)/iu;

function isRelevantJobResult(item) {
  const title = cleanText(item?.title, 300);
  const snippet = cleanText(item?.snippet, 1200);
  const url = String(item?.url || "");
  if (!title || !/^https?:\/\//i.test(url)) return false;
  if (/\.(?:jpe?g|png|gif|webp|svg|mp4|webm)(?:[?#]|$)/i.test(url)) return false;
  if (NON_JOB_SIGNAL.test(title) && !JOB_SIGNAL.test(snippet)) return false;
  return JOB_SIGNAL.test(title + " " + snippet);
}

async function searchJobs(message, webSearch, options = {}) {
  if (!webSearch || typeof webSearch.search !== "function") {
    return { ok: false, results: [], reply: "ULUGBEK AI internet qidiruv moduliga ulana olmadi. Keyinroq qayta urinib ko‘ring." };
  }
  const limit = Math.max(1, Math.min(8, Number(options.limit) || 5));
  let found;
  try {
    found = await webSearch.search(buildJobSearchQuery(message));
  } catch (_) {
    return { ok: false, results: [], reply: "ULUGBEK AI vakansiyalarni qidirishda internet manbasiga ulana olmadi. Keyinroq qayta urinib ko‘ring." };
  }
  const candidates = (Array.isArray(found) ? found : []).filter(isRelevantJobResult);
  const seen = new Set();
  const unique = candidates.filter(item => {
    const key = String(item.url).split("#")[0].replace(/\/$/, "");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, Math.min(12, limit * 2));
  const results = await Promise.all(unique.map(async item => {
    let page = null;
    if (typeof webSearch.fetchPage === "function") {
      try { page = await webSearch.fetchPage(item.url); } catch (_) {}
    }
    const title = cleanText(page?.title || item.title, 220);
    const snippet = cleanText(page?.content || item.snippet, 900);
    const result = { title, snippet, url: page?.url || item.url, pageRead: Boolean(page) };
    return isRelevantJobResult(result) ? result : null;
  }));
  const usable = results.filter(Boolean).slice(0, limit);
  if (!usable.length) {
    return {
      ok: true, results: [],
      reply: "Kechirasiz, hozircha aynan ish vakansiyasi ekanini ko‘rsatadigan ishonchli e’lon topilmadi. Kogon haqidagi rasmlar, sayyohlik sahifalari yoki umumiy qidiruv sahifalarini ish o‘rni deb ko‘rsatmayman. Boshqa ish turi yoki Kogon bilan birga Buxoroni ham qidirishimiz mumkin."
    };
  }
  const lines = usable.map((item, index) => [
    (index + 1) + ". " + item.title,
    item.snippet || "E’lon tafsilotlari manba sahifasida ko‘rsatilgan.",
    "Manba: " + item.url,
    "Tekshiruv: " + (item.pageRead ? "sahifa matni ochildi; ish beruvchi bilan vakansiya hanuz ochiqligini tasdiqlang" : "faqat qidiruv parchasi olindi; e’lon mustaqil tasdiqlanmagan")
  ].join("\n")).join("\n\n");
  return {
    ok: true, results: usable,
    reply: "Tushundim. " + usable.length + " ta ishga oid e’lon topildi. Quyida faqat vakansiyaga aloqador natijalarni ko‘rsataman. Maosh yoki ish shartlari manbada aniq yozilmagan bo‘lsa, ularni taxmin qilmayman.\n\n" + lines + "\n\nEslatma: e’lonning hali ochiqligi va maoshini ish beruvchi bilan tasdiqlang."
  };
}

module.exports = { isJobSearchRequest, hasLocationHint, locationClarification, buildJobSearchQuery, searchJobs, cleanText, decodeHtmlEntities, isRelevantJobResult };
