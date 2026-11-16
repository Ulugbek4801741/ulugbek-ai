"use strict";

const currencyConverter = require("./currency-converter");
const publicJobFeeds = require("./public-job-feeds");

const JOB_INTENT = /(?:\bish\s*(?:top(?:ib)?\s*ber|qidir(?:ib)?\s*ber|kerak|o\s*rin(?:lar)?|vakans(?:iya|iyalar)?|izlay(?:apman|man)?|qidir)|\bvakans(?:iya|iyalar)\b|\bjob\s*(?:search|opening|vacanc(?:y|ies))\b|\bfind\s+(?:me\s+)?a?\s*jobs?\b|\bemployment\s+(?:opportunit|jobs?)|\bработ(?:а|у)\s*(?:найти|ищу|нужна)|\bваканси)/iu;

function isJobSearchRequest(value) {
  return JOB_INTENT.test(String(value || "").trim());
}

const LOCATION_HINT = /(?:\b(?:uzbekistan|uzbekiston|o'zbekiston|shveysariya|shveytsariya|switzerland|aqsh|amerika|usa|united states|germaniya|germany|kanada|canada|polsha|poland|rossiya|russia|qozog'iston|kazakhstan|turkiya|turkey|baa|uae|saudiya|saudi arabia|qatar|koreya|korea|yaponiya|japan|buyuk britaniya|britaniya|angliya|uk|united kingdom|fransiya|france|italiya|italy|ispaniya|spain|norvegiya|norway|shvetsiya|sweden|finlyandiya|finland|niderlandiya|netherlands|avstraliya|australia|chexiya|czechia|litva|lithuania|latviya|latvia|estoniya|estonia|ruminiya|romania|irlandiya|ireland|buxoro|kogon|toshkent|samarqand|navoiy|qarshi|andijon|farg'ona|namangan|nukus|urganch|jizzax|termiz|guliston|denov|olot|g'ijduvon)(?:da|ga|dan|ning|ni)?\b|\bnear me\b|\byaqin(?:imda| atrofda)\b|\bрядом со мной\b)/iu;

function hasLocationHint(value) {
  return LOCATION_HINT.test(String(value || "")) || isWorldwideRequest(value);
}

function isWorldwideRequest(value) {
  return /(?:dunyo\s*bo['’ʻ]ylab|butun\s*dunyo|worldwide|global(?:ly)?|remote\s*worldwide|anywhere\s*(?:in\s*the\s*world)?|all\s*countries|international(?:ly)?)/iu.test(String(value || ""));
}

function extractJobCriteria(value) {
  const text = String(value || "");
  const countMatch = text.match(/\b(\d{1,2})\s*(?:ta|dona|jobs?|vacancies|positions|ish\s*o['’ʻ]rin(?:i|lari)?)\b/iu);
  const count = countMatch ? Math.max(1, Math.min(25, Number(countMatch[1]))) : 15;
  const hourlyPatterns = [
    /(?:\$|USD\s*)\s*(\d{1,4}(?:[.,]\d{1,2})?)\s*(?:-|–|to)\s*(?:\$|USD\s*)?\d{1,4}(?:[.,]\d{1,2})?\s*(?:per\s*hour|\/\s*(?:h|hr|hour)|hourly|an\s*hour)/iu,
    /(?:\$|USD\s*)\s*(\d{1,4}(?:[.,]\d{1,2})?)\s*(?:per\s*hour|\/\s*(?:h|hr|hour)|hourly|an\s*hour)/iu,
    /(?:hourly\s*(?:pay|rate|salary)?|per\s*hour)\s*(?:of|:|is|at)?\s*(?:USD\s*|\$)?(\d{1,4}(?:[.,]\d{1,2})?)/iu,
    /soatiga\s*(?:kamida|min(?:imum)?)?\s*(?:USD\s*|\$)?(\d{1,4}(?:[.,]\d{1,2})?)\s*(?:AQSh\s*dollari|dollar|USD)/iu
  ];
  let minHourlyUsd = null;
  for (const pattern of hourlyPatterns) {
    const match = text.match(pattern);
    if (match) { minHourlyUsd = Number(String(match[1]).replace(",", ".")); break; }
  }
  return {
    requestedCount: count,
    minHourlyUsd: Number.isFinite(minHourlyUsd) ? minHourlyUsd : null,
    worldwide: isWorldwideRequest(text),
    requireActive: /(?:hozir|faol|active|currently\s*hiring|hiring\s*now|open\s*position|accepting\s*applications)/iu.test(text)
  };
}

function locationClarification() {
  return "Ish qidirishni boshlashim uchun qaysi davlat yoki shaharda ish kerakligini yozing. Masalan: O‘zbekistonda, Buxoroda yoki Shveysariyada. Shundan keyin alohida vakansiyalarni tekshiraman.";
}

function extractJobRole(value) {
  const text = String(value || "").toLowerCase();
  const roles = [
    { pattern: /(?:dasturchi|dasturlovchi|dasturlash|dastur\s+yozish|programmist|programmer|developer|software\s+engineer|software\s+developer)/iu, label: "Dasturchi", terms: "dasturchi dasturlash programmer developer software engineer software developer junior frontend backend Python JavaScript" },
    { pattern: /(?:frontend|front-end|front\s+end)/iu, label: "Frontend dasturchi", terms: "frontend developer front-end engineer JavaScript React" },
    { pattern: /(?:backend|back-end|back\s+end)/iu, label: "Backend dasturchi", terms: "backend developer back-end engineer Node.js Python Java" },
    { pattern: /(?:full[ -]?stack)/iu, label: "Full-stack dasturchi", terms: "full stack developer frontend backend" },
    { pattern: /(?:android\s+(?:dasturchi|developer)|kotlin\s+developer)/iu, label: "Android dasturchi", terms: "Android developer Kotlin Java mobile developer" },
    { pattern: /(?:qa\s+engineer|test(?:chi|er)|software\s+tester)/iu, label: "Dasturiy ta'minot testlovchisi", terms: "QA engineer software tester test automation" }
  ];
  return roles.find(role => role.pattern.test(text)) || null;
}

function buildJobSearchQueries(value) {
  const original = String(value || "").replace(/\s+/g, " ").trim().slice(0, 240);
  const role = extractJobRole(original);
  const criteria = extractJobCriteria(original);
  const suffixes = [
    "vakansiya ish o'rni ish beruvchi lavozim telefon maosh talablar",
    "bo'sh ish o'rinlari ishga qabul qilinadi aloqa raqami",
    "jobs vacancies hiring employer contact phone salary",
    "site:hh.uz OR site:ishkop.uz OR site:olx.uz OR site:ish.uz"
  ];
  const querySuffixes = criteria.worldwide ? suffixes.slice(0, 3) : suffixes;
  const queries = [original, ...querySuffixes.map(suffix => original + " " + suffix)];
  if (criteria.worldwide || criteria.minHourlyUsd !== null) {
    const pay = criteria.minHourlyUsd === null ? "" : ' "$' + criteria.minHourlyUsd + ' per hour" OR "' + criteria.minHourlyUsd + ' USD/hour"';
    queries.push("worldwide remote jobs" + pay + " hiring now apply");
    queries.push("international jobs remote" + pay + " open positions");
    queries.push("remote contract jobs" + pay + " currently accepting applications");
    queries.push("site:boards.greenhouse.io jobs" + pay + " remote");
    queries.push("site:jobs.lever.co" + pay + " remote hiring");
    queries.push("site:jobs.ashbyhq.com" + pay + " remote");
    queries.push("international on-site hybrid remote jobs" + pay + " hiring now apply");
    queries.push("jobs" + pay + " hiring now USA Canada UK Australia Europe Middle East Asia");
  }
  if (role) {
    if (/kogon/iu.test(original)) queries.push("Kogon " + role.terms + " Buxoro viloyati vakansiya ish beruvchi");
    queries.push(original + " " + role.terms + " vacancy jobs hiring");
    queries.push(original + " " + role.terms + " site:hh.uz OR site:linkedin.com/jobs OR site:ishkop.uz OR site:olx.uz");
  }
  return [...new Set(queries)].filter(Boolean).slice(0, 12);
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
  const pattern = /(?:\+?\s*998[\s().-]?(?:\d[\s().-]?){9}|(?:\+?\s*\d{1,3}[\s().-]?)?(?:\(?\d{2,4}\)?[\s().-]?){2,4}\d{2,4})/g;
  const matches = [...text.matchAll(pattern)];
  return [...new Set(matches.map(match => {
    const raw = match[0];
    const digits = raw.replace(/\D/g, "");
    const before = text.slice(Math.max(0, match.index - 35), match.index + 8);
    const hasContactContext = /(?:telefon|tel\.?|phone|call|aloqa|contact|whatsapp|viber)/iu.test(before);
    const hasCountryPrefix = /^\s*\+/.test(raw) || /^00/.test(digits) || digits.startsWith("998");
    if (digits.length < 9 || digits.length > 15 || (!hasContactContext && !hasCountryPrefix)) return "";
    return raw.replace(/[().\s-]+/g, "").replace(/^00/, "+");
  }).filter(Boolean))].slice(0, 4);
}
function extractEmails(value) {
  return [...new Set((String(value || "").match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || []).map(x => x.toLowerCase()))].slice(0, 3);
}

function extractTelegram(value) {
  const text = String(value || "");
  const urls = text.match(/https?:\/\/(?:t\.me|telegram\.me)\/[A-Za-z0-9_]{4,}/gi) || [];
  const handles = [...text.matchAll(/(?:telegram|tg|телеграм)\s*[:：]?\s*@([A-Za-z0-9_]{4,})/giu)].map(match => "@" + match[1]);
  return [...new Set([...urls, ...handles])].slice(0, 4);
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
function extractMinimumHourlyUsd(value, location = "") {
  const text = String(value || "");
  if (/(?:C\$|A\$|NZ\$|S\$|R\$|\b(?:CAD|AUD|NZD|SGD|EUR|GBP|CHF|PLN|INR|AED|ZAR|BRL|MXN)\b|€|£|₹|zł)/iu.test(text)) return null;
  if (/\$/.test(text) && !/(?:USD|US\$)/iu.test(text) && /(?:canada|australia|new\s*zealand|singapore)/iu.test(location)) return null;
  const patterns = [
    /(?:\$|USD\s*)\s*(\d{1,4}(?:[.,]\d{1,2})?)\s*(?:-|–|to)\s*(?:\$|USD\s*)?\d{1,4}(?:[.,]\d{1,2})?\s*(?:per\s*hour|\/\s*(?:h|hr|hour)|hourly|an\s*hour)/iu,
    /(?:\$|USD\s*)\s*(\d{1,4}(?:[.,]\d{1,2})?)\s*(?:per\s*hour|\/\s*(?:h|hr|hour)|hourly|an\s*hour)/iu,
    /(?:hourly\s*(?:pay|rate|salary)?|per\s*hour)\s*(?:of|:|is|at)?\s*(?:USD\s*|\$)?(\d{1,4}(?:[.,]\d{1,2})?)/iu,
    /soatiga\s*(?:kamida|min(?:imum)?)?\s*(?:USD\s*|\$)?(\d{1,4}(?:[.,]\d{1,2})?)\s*(?:AQSh\s*dollari|dollar|USD)/iu
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return Number(String(match[1]).replace(",", "."));
  }
  return null;
}
function hasActiveApplicationEvidence(value) {
  return /(?:apply\s*now|apply\s*for\s*this\s*(?:job|role|position)|submit\s*application|start\s*application|application\s*form|apply\s*today|apply\s*online|apply\s*here|\bapply\b|accepting\s*applications|applications?\s*are\s*open|ariza\s*topshirish|hozir\s*ariza\s*ber|откликнуться|подать\s*заявку)/iu.test(String(value || ""));
}

function extractJobDetails(item, message) {
  const text = String(item?.snippet || "");
  const phones = extractPhones(text);
  const emails = extractEmails(text);
  const telegram = extractTelegram(text);
  const salary = extractSalary(text);
  const location = extractLabeledValue(text, ["manzil", "joylashuv", "location", "address", "город", "адрес"]);
  const minimumHourlyUsd = extractMinimumHourlyUsd(text, location);
  const closed = /(?:vakansiya yopildi|e[’'‘]lon yopildi|qabul tugadi|позиция закрыта|vacancy closed|no longer accepting|applications? closed|position filled)/iu.test(text);
  const activeEvidence = item?.officialStatus === "published" || hasActiveApplicationEvidence(text);
  const employer = extractLabeledValue(text, ["ish beruvchi", "kompaniya", "tashkilot", "company", "employer", "работодатель"]);
  const requirements = extractLabeledValue(text, ["talablar", "malaka talablari", "requirements", "qualifications", "требования"]);
  const schedule = extractLabeledValue(text, ["ish grafigi", "ish vaqti", "jadval", "schedule", "working hours", "график работы"]);
  const experience = extractLabeledValue(text, ["tajriba", "ish tajribasi", "experience", "стаж"]);
  const apply = Boolean(item?.applicationUrl) || /(?:ariza|murojaat|bog'lan|aloqa|telefon|apply|contact|отклик|связаться)/iu.test(text);
  const jobSignals = (/(?:vakans|bo'sh ish|ish o'rni|lavozim|talablar|vazifalar|tajriba|ish grafigi|ishga qabul|jobs?|position|requirements|responsibilit|employment|зарплат|ваканси|должност|обязанност)/iu.test(text) ? 1 : 0) +
    (salary ? 1 : 0) + (phones.length || emails.length || apply ? 1 : 0) +
    (/(?:talab qilinadi|kerak bo'ladi|experience|full.?time|part.?time|ish vaqti)/iu.test(text) ? 1 : 0);
  return {
    title: cleanText(item?.title, 220),
    employer,
    location: location || "",
    salary,
    minimumHourlyUsd,
    requirements,
    schedule,
    experience,
    phones,
    emails,
    telegram,
    contactAvailable: phones.length > 0 || emails.length > 0 || telegram.length > 0 || apply,
    jobSignals,
    listingSpecific: Boolean(item?.officialStatus === "published" || (item?.pageRead && !isCategoryPage(item.url) && text.length >= 240 && jobSignals >= 2)),
    activeStatus: closed ? "closed-or-expired-indicator-found" : item?.officialStatus === "published" ? "official-board-published" : activeEvidence ? "active-application-evidence-found" : "not-independently-confirmed",
    activeEvidence,
    applicationUrl: item?.applicationUrl || ""
  };
}
function formatJobResults(results, message = "", criteria = extractJobCriteria(message)) {
  if (!results.length) {
    const role = extractJobRole(message);
    const place = /kogon/iu.test(message) ? "Kogon" : /buxoro/iu.test(message) ? "Buxoro" : "";
    if (role && place) return place + " hududida " + role.label.toLowerCase() +
      " bo‘yicha alohida vakansiya sahifasini ochib, tekshirish mumkin bo‘lgan e’lon topilmadi. Umumiy ish saytlari yoki aloqasiz vakansiyalarni ish o‘rni deb ko‘rsatmayman. Qidiruvni Buxoro shahri, masofaviy ish yoki boshqa dasturlash yo‘nalishlariga kengaytirish mumkin.";
    if (criteria.minHourlyUsd !== null) return "Hozircha soatiga kamida $" + criteria.minHourlyUsd + " to‘laydigan, sahifasi ochilgan va ariza qabul qilish belgisi tasdiqlangan vakansiya topilmadi. Maoshi noma’lum yoki faol ariza tugmasi ko‘rinmagan e’lonlarni ro‘yxatga qo‘shmadim.";
    return "Qidiruv sahifalari ochildi, ammo alohida vakansiya sifatida tekshirish mumkin bo‘lgan e’lonlar topilmadi. Saytlarning umumiy sahifalarini ish o‘rni deb ko‘rsatmayman. Boshqa kasb yoki yaqin hududni ham qo‘shib qidirish mumkin.";
  }
  const lines = results.map((item, index) => {
    const details = [
      (index + 1) + ". " + item.title,
      "Ish beruvchi: " + (item.employer || "Sahifada aniq ko‘rsatilmagan"),
      "Hudud: " + (item.location || "Sahifada aniq ko‘rsatilmagan"),
      "Maosh: " + (item.minimumHourlyUsd !== null && item.minimumHourlyUsd !== undefined ? (item.salaryConversion ? "$" + item.minimumHourlyUsd + " USD/soat (taxminiy konvertatsiya; asl: " + item.salaryConversion.original + ", kurs: " + (item.salaryConversion.rateDate || "joriy reference kurs") + ")" : "$" + item.minimumHourlyUsd + " USD/soat (e’londa ko‘rsatilgan eng kam stavka)") : (item.salary || "Sahifada ko‘rsatilmagan")),
      "Talablar: " + (item.requirements || "Sahifada batafsil ko‘rsatilmagan"),
      "Ish vaqti: " + (item.schedule || "Sahifada ko‘rsatilmagan"),
      "Tajriba: " + (item.experience || "Sahifada ko‘rsatilmagan"),
      "Telefon: " + (item.phones.length ? item.phones.join(", ") : "Sahifada topilmadi"),
      "Email: " + (item.emails.length ? item.emails.join(", ") : "Sahifada topilmadi"),
      "Telegram: " + (item.telegram?.length ? item.telegram.join(", ") : "Sahifada topilmadi"),
      "Vakansiya sahifasi: " + item.url,
      item.applicationUrl ? "Ariza topshirish: " + item.applicationUrl : "",
      "E’lon holati: " + (item.activeStatus === "closed-or-expired-indicator-found" ? "Yopilgan yoki muddati o‘tgan bo‘lishi mumkin" : item.activeStatus === "official-board-published" ? (item.feedVerified ? "Ochiq ish e’lonlari API’sida published; ish beruvchining yakuniy qabul holati mustaqil tasdiqlanmagan" : "Rasmiy ish e’lonlari tizimida e’lon qilingan") : "Sahifada ariza topshirish belgisi topildi; ish beruvchining yakuniy qabul holatini ariza sahifasida yana tekshiring"),
      "Tekshiruv: " + (item.contactAvailable ? "Aloqa usuli ochiq e’londa topildi" : "Aloqa ma’lumoti ochiq e’londa topilmadi")
    ];
    return details.join("\n");
  }).join("\n\n");
  const requested = Number(criteria.requestedCount) || results.length;
  const countNote = results.length < requested
    ? "\n\nSo‘ralgan " + requested + " ta ishning " + results.length + " tasi qat’iy tekshiruvdan o‘tdi. Yetishmagan natijalar o‘ylab topilmadi."
    : "";
  const feedCount = results.filter(item => item.feedVerified).length;
  const pageCount = results.length - feedCount;
  return "ULUGBEK AI " + results.length + " ta alohida vakansiya yozuvini tekshirdi: " +
    feedCount + " tasi ochiq ish e’lonlari API manbalaridan, " + pageCount +
    " tasi alohida sahifalarni o‘qish orqali. API’dagi published holati ish beruvchining hozir ham xodim olayotganini kafolatlamaydi; ariza havolasini yuborishdan oldin ochib tekshiring. Topilmagan telefon, Telegram, maosh yoki ish beruvchi ma’lumoti taxmin qilinmadi." +
    countNote + "\n\n" + lines;
}

async function mapWithConcurrency(items, concurrency, mapper) {
  const input = Array.isArray(items) ? items : [];
  const output = new Array(input.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(input.length, Math.max(1, concurrency)) }, async () => {
    while (cursor < input.length) {
      const index = cursor++;
      try { output[index] = await mapper(input[index], index); }
      catch (_) { output[index] = null; }
    }
  });
  await Promise.all(workers);
  return output;
}

async function searchJobs(message, webSearch, options = {}) {
  if (!webSearch || typeof webSearch.search !== "function") {
    return { ok: false, results: [], reply: "ULUGBEK AI internet qidiruv moduliga ulana olmadi." };
  }
  const criteria = extractJobCriteria(message);
  const limit = Math.max(1, Math.min(25, Number(options.limit) || criteria.requestedCount));
  const queries = buildJobSearchQueries(message);
  const feedPromise = publicJobFeeds.fetchPublicJobFeeds(message, options.feedOptions || {}).catch(error => ({ results: [], providers: [], failures: [String(error?.message || error)], feedsChecked: 0, fetchedRecords: 0 }));
  const requestedRole = extractJobRole(message);
  const requestedKogon = /kogon/iu.test(message);
  const roleEvidence = /(?:dasturchi|dasturlash|developer|programmer|software engineer|frontend|backend|javascript|python|kotlin|java|qa engineer|web developer)/iu;
  const locationEvidence = requestedKogon ? /(?:kogon|kog‘on|kogon tumani|buxoro viloyati)/iu : null;
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
  const pageCandidates = candidates.slice(0, Math.min(24, Math.max(12, limit * 2)));
  const pages = await mapWithConcurrency(pageCandidates, 5, async item => {
    if (typeof webSearch.fetchPage !== "function" && typeof webSearch.fetchOfficialJob !== "function") return null;
    try {
      let page = null;
      if (typeof webSearch.fetchOfficialJob === "function") page = await webSearch.fetchOfficialJob(item.url);
      if (!page && typeof webSearch.fetchPage === "function") page = await webSearch.fetchPage(item.url);
      if (!page) return null;
      const content = decodeHtmlEntities(String(page.content || "").replace(/<[^>]*>/g, " ")).replace(/[ \t]+/g, " ").replace(/\n\s*/g, "\n").trim().slice(0, 12000);
      const combined = [content, item.snippet || ""].filter(Boolean).join("\n");
      const normalized = { title: cleanText(page.title || item.title, 220), snippet: combined, url: page.url || item.url, pageRead: true, officialStatus: page.officialStatus || "", officialProvider: page.officialProvider || "", applicationUrl: page.applicationUrl || "" };
      const details = extractJobDetails(normalized, message);
      if (criteria.minHourlyUsd !== null && details.minimumHourlyUsd === null) {
        const converted = await currencyConverter.convertHourlyPayToUsd(combined, details.location, {
          fetchRates: typeof webSearch.fetchExchangeRates === "function" ? webSearch.fetchExchangeRates : undefined
        });
        if (converted) {
          details.minimumHourlyUsd = converted.usdPerHour;
          if (converted.currency !== "USD") details.salaryConversion = converted;
        }
      }
      const relevanceText = normalized.title + " " + combined;
      if (requestedRole && !roleEvidence.test(relevanceText)) return null;
      if (locationEvidence && !locationEvidence.test(relevanceText)) return null;
      if (!["active-application-evidence-found", "official-board-published"].includes(details.activeStatus)) return null;
      if (criteria.minHourlyUsd !== null && (details.minimumHourlyUsd === null || details.minimumHourlyUsd < criteria.minHourlyUsd)) return null;
      return details.listingSpecific ? { ...normalized, ...details, host: (() => { try { return new URL(normalized.url).hostname; } catch (_) { return ""; } })() } : null;
    } catch (_) { return null; }
  });
  const feeds = await feedPromise;
  const feedResults = (feeds.results || []).filter(item => {
    const content = [item.title, item.company, item.location, item.salary, item.description].join(" ");
    if (requestedRole && !roleEvidence.test(content)) return false;
    if (locationEvidence && !locationEvidence.test(content)) return false;
    if (criteria.minHourlyUsd !== null) {
      const hourly = extractMinimumHourlyUsd(content, item.location);
      if (hourly === null || hourly < criteria.minHourlyUsd) return false;
      item.minimumHourlyUsd = hourly;
    } else {
      item.minimumHourlyUsd = extractMinimumHourlyUsd(content, item.location);
    }
    const details = extractJobDetails({ title: item.title, snippet: item.content, url: item.url, pageRead: true, officialStatus: "published", applicationUrl: item.applicationUrl }, message);
    Object.assign(item, details, { title: item.title, url: item.url, host: (() => { try { return new URL(item.url).hostname; } catch (_) { return ""; } })(), feedVerified: true, officialProvider: item.officialProvider });
    return true;
  });
  const usable = [], seenTitles = new Set(), hostCounts = new Map();
  for (const item of [...feedResults, ...pages.filter(Boolean)]) {
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
    requestedRole: requestedRole?.label || null,
    criteria,
    results: usable,
    searchedPages: candidates.length,
    openedPages: pages.filter(Boolean).length,
    feedsChecked: feeds.feedsChecked || 0,
    feedProviders: feeds.providers || [],
    fetchedFeedRecords: feeds.fetchedRecords || 0,
    feedVerifiedVacancies: feedResults.length,
    verifiedListingsCount: usable.length,
    feedFailures: feeds.failures || [],
    reply: formatJobResults(usable, message, criteria)
  };
}

module.exports = {
  isJobSearchRequest, hasLocationHint, locationClarification,
  buildJobSearchQuery, buildJobSearchQueries, searchJobs,
  cleanText, decodeHtmlEntities, extractPhones, extractEmails,
  extractSalary, extractMinimumHourlyUsd, hasActiveApplicationEvidence, extractJobCriteria, isWorldwideRequest, extractJobDetails, formatJobResults, extractJobRole
};
