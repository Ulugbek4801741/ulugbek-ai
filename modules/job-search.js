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
  return "Ish qidirishni boshlashim uchun qaysi davlat yoki shaharda ish kerakligini yozing. Masalan: O‘zbekistonda, Buxoroda yoki Shveysariyada. Shundan keyin alohida vakansiyalarni tekshiraman.";
}

function buildJobSearchQueries(value) {
  const original = String(value || "").replace(/\s+/g, " ").trim().slice(0, 180);
  const suffixes = [
    "vakansiya ish o'rni ish beruvchi lavozim telefon maosh talablar",
    "bo'sh ish o'rinlari ishga qabul qilinadi aloqa raqami",
    "jobs vacancies hiring employer contact phone salary",
    "site:hh.uz OR site:ishkop.uz OR site:olx.uz OR site:ish.uz"
  ];
  return [...new Set([original, ...suffixes.map(suffix => original + " " + suffix)])].filter(Boolean);
}
function buildJobSearchQuery(value) {
  return buildJobSearchQueries(value).slice(0, 2).join(" ");
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
function extractPhones(value) {
  const text = String(value || "");
  const matches = text.match(/(?:\+?\s*998[\s().-]?(?:\d[\s().-]?){9}|(?:\+?\s*\d{1,3}[\s().-]?)?(?:\(?\d{2,4}\)?[\s().-]?){2,4}\d{2,4})/g) || [];
  return [...new Set(matches.map(item => item.replace(/[().\s-]+/g, "").replace(/^00/, "+")).filter(item => {
    const digits = item.replace(/\D/g, "");
    return digits.length >= 9 && digits.length <= 15;
  }))].slice(0, 4);
}
function extractEmails(value) {
  return [...new Set((String(value || "").match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || []).map(x => x.toLowerCase()))].slice(0, 3);
}
function extractSalary(value) {
  const text = String(value || "");
  const patterns = [
    /(?:maosh|ish haqi|salary|зарплат[аы])[^.!?\n]{0,100}/iu,
    /(?:\d[\d\s.,]{2,}\s*(?:so'm|som|uzs|сум|руб(?:лей)?|₽|usd|eur|\$|€))[^.!?\n]{0,35}/iu,
    /(?:\$|€)\s?\d[\d\s.,]{2,}(?:\s*[-–—]\s*(?:\$|€)?\s?\d[\d\s.,]{2,})?/u
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return cleanText(match[0], 180);
  }
  return "";
}
function extractLabeledValue(text, labels) {
  const source = cleanText(text, 12000);
  const escape = value => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const labelPattern = (Array.isArray(labels) ? labels : []).map(escape).join("|");
  if (!labelPattern) return "";
  const nextLabels = "ish beruvchi|kompaniya|tashkilot|company|employer|manzil|joylashuv|location|address|maosh|ish haqi|salary|talablar|malaka talablari|requirements|qualifications|vazifalar|telefon|tel|aloqa|email|e-mail|contact|apply|ish grafigi|ish vaqti|jadval|schedule|working hours|tajriba|ish tajribasi|experience";
  const match = source.match(new RegExp("(?:^|\\s)(?:" + labelPattern + ")\\s*[:：-]\\s*([^.!?]{2,150}?)(?=\\s+(?:" + nextLabels + ")\\s*[:：-]|[.!?]|$)", "iu"));
  return match ? cleanText(match[1], 160) : "";
}
function isCategoryPage(url) {
  try {
    const path = new URL(url).pathname.replace(/\/+$/, "").toLowerCase();
    return /^\/(?:oz\/)?(?:rabota|jobs?|vacancies|search|q|vakansii?)$/.test(path);
  } catch (_) { return true; }
}
function extractJobDetails(item, message) {
  const text = String(item?.snippet || "");
  const phones = extractPhones(text);
  const emails = extractEmails(text);
  const salary = extractSalary(text);
  const employer = extractLabeledValue(text, ["ish beruvchi", "kompaniya", "tashkilot", "company", "employer", "работодатель"]);
  const location = extractLabeledValue(text, ["manzil", "joylashuv", "location", "address", "город", "адрес"]);
  const requirements = extractLabeledValue(text, ["talablar", "malaka talablari", "requirements", "qualifications", "требования"]);
  const schedule = extractLabeledValue(text, ["ish grafigi", "ish vaqti", "jadval", "schedule", "working hours", "график работы"]);
  const experience = extractLabeledValue(text, ["tajriba", "ish tajribasi", "experience", "стаж"]);
  const apply = /(?:ariza|murojaat|bog'lan|aloqa|telefon|apply|contact|отклик|связаться)/iu.test(text);
  const jobSignals = (/(?:vakans|bo'sh ish|ish o'rni|lavozim|talablar|vazifalar|tajriba|ish grafigi|ishga qabul|jobs?|position|requirements|responsibilit|employment|зарплат|ваканси|должност|обязанност)/iu.test(text) ? 1 : 0) +
    (salary ? 1 : 0) + (phones.length || emails.length || apply ? 1 : 0) +
    (/(?:talab qilinadi|kerak bo'ladi|experience|full.?time|part.?time|ish vaqti)/iu.test(text) ? 1 : 0);
  return {
    title: cleanText(item?.title, 220),
    employer,
    location: location || "",
    salary,
    requirements,
    schedule,
    experience,
    phones,
    emails,
    contactAvailable: phones.length > 0 || emails.length > 0 || apply,
    jobSignals,
    listingSpecific: Boolean(item?.pageRead && !isCategoryPage(item.url) && text.length >= 240 && jobSignals >= 2),
    activeStatus: /(?:vakansiya yopildi|e'lon yopildi|qabul tugadi|позиция закрыта|vacancy closed|no longer accepting)/iu.test(text) ? "closed-or-expired-indicator-found" : "not-independently-confirmed"
  };
}
function formatJobResults(results) {
  if (!results.length) return "Qidiruv sahifalari ochildi, ammo alohida vakansiya sifatida tekshirish mumkin bo‘lgan e’lonlar topilmadi. Saytlarning umumiy sahifalarini ish o‘rni deb ko‘rsatmayman. Boshqa kasb yoki yaqin hududni ham qo‘shib qidirish mumkin.";
  const lines = results.map((item, index) => {
    const details = [
      (index + 1) + ". " + item.title,
      "Ish beruvchi: " + (item.employer || "Sahifada aniq ko‘rsatilmagan"),
      "Hudud: " + (item.location || "Sahifada aniq ko‘rsatilmagan"),
      "Maosh: " + (item.salary || "Sahifada ko‘rsatilmagan"),
      "Talablar: " + (item.requirements || "Sahifada batafsil ko‘rsatilmagan"),
      "Ish vaqti: " + (item.schedule || "Sahifada ko‘rsatilmagan"),
      "Tajriba: " + (item.experience || "Sahifada ko‘rsatilmagan"),
      "Telefon: " + (item.phones.length ? item.phones.join(", ") : "Sahifada topilmadi"),
      "Email: " + (item.emails.length ? item.emails.join(", ") : "Sahifada topilmadi"),
      "E’lon holati: " + (item.activeStatus === "closed-or-expired-indicator-found" ? "Yopilgan yoki muddati o‘tgan bo‘lishi mumkin" : "Sahifa o‘qildi, lekin ish beruvchi hali ham qabul qilayotganini tasdiqlash kerak"),
      "Tekshiruv: " + (item.contactAvailable ? "Aloqa usuli sahifada topildi" : "Aloqa ma’lumoti ochiq sahifada topilmadi")
    ];
    return details.join("\n");
  }).join("\n\n");
  return "ULUGBEK AI " + results.length + " ta alohida vakansiya sahifasini ochib tekshirdi. Quyida faqat sahifasi o‘qilgan e’lonlar berilgan. Topilmagan telefon, maosh yoki ish beruvchi ma’lumoti taxmin qilinmadi.\n\n" + lines;
}

async function searchJobs(message, webSearch, options = {}) {
  if (!webSearch || typeof webSearch.search !== "function") {
    return { ok: false, results: [], reply: "ULUGBEK AI internet qidiruv moduliga ulana olmadi." };
  }
  const limit = Math.max(1, Math.min(10, Number(options.limit) || 10));
  const queries = buildJobSearchQueries(message);
  const batches = await Promise.all(queries.map(async query => {
    try { const value = await webSearch.search(query); return Array.isArray(value) ? value : []; }
    catch (_) { return null; }
  }));
  const candidates = [];
  const seen = new Set();
  for (const batch of batches) {
    if (!batch) continue;
    for (const item of batch) {
      const url = String(item?.url || "").trim();
      if (!url || seen.has(url)) continue;
      seen.add(url);
      candidates.push(item);
    }
  }
  if (batches.every(batch => batch === null)) {
    return { ok: false, results: [], reply: "ULUGBEK AI ish vakansiyalarini qidirishda internet manbasiga ulana olmadi. Keyinroq qayta urinib ko‘ring." };
  }
  const pages = await Promise.all(candidates.slice(0, Math.max(20, limit * 3)).map(async item => {
    if (typeof webSearch.fetchPage !== "function") return null;
    try {
      const page = await webSearch.fetchPage(item.url);
      if (!page) return null;
      const content = decodeHtmlEntities(String(page.content || "").replace(/<[^>]*>/g, " ")).replace(/[ \t]+/g, " ").replace(/\n\s*/g, "\n").trim().slice(0, 12000);
      const combined = [content, item.snippet || ""].filter(Boolean).join("\n");
      const normalized = { title: cleanText(page.title || item.title, 220), snippet: combined, url: page.url || item.url, pageRead: true };
      const details = extractJobDetails(normalized, message);
      return details.listingSpecific ? { ...normalized, ...details, host: (() => { try { return new URL(normalized.url).hostname; } catch (_) { return ""; } })() } : null;
    } catch (_) { return null; }
  }));
  const usable = [], seenTitles = new Set(), hostCounts = new Map();
  for (const item of pages.filter(Boolean)) {
    const key = item.title.toLowerCase().replace(/[^a-z0-9а-яё]+/giu, " ").trim();
    if (!key || seenTitles.has(key)) continue;
    const hostCount = hostCounts.get(item.host) || 0;
    if (hostCount >= limit) continue;
    seenTitles.add(key); hostCounts.set(item.host, hostCount + 1);
    usable.push(item);
    if (usable.length >= limit) break;
  }
  return {
    ok: true,
    queries,
    results: usable,
    searchedPages: candidates.length,
    openedPages: pages.filter(Boolean).length,
    reply: formatJobResults(usable)
  };
}

module.exports = {
  isJobSearchRequest, hasLocationHint, locationClarification,
  buildJobSearchQuery, buildJobSearchQueries, searchJobs,
  cleanText, decodeHtmlEntities, extractPhones, extractEmails,
  extractSalary, extractJobDetails, formatJobResults
};
