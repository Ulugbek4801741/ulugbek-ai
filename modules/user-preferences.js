"use strict";

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const LANGUAGES = {
  uz: { name: "o‘zbek", instruction: "JAVOB TILI USTUVORLIGI: foydalanuvchi doimiy ravishda o‘zbek tilini tanlagan. Barcha javoblarni o‘zbek tilida, foydalanuvchi ishlatgan lotin yoki kirill yozuvida yozing. Faqat foydalanuvchi aniq boshqa tilga tarjima yoki boshqa tilda javob so‘rasa, o‘sha bitta javob uchun tilni almashtiring." },
  en: { name: "ingliz", instruction: "JAVOB TILI USTUVORLIGI: foydalanuvchi doimiy ravishda ingliz tilini tanlagan. Barcha javoblarni ingliz tilida yozing, faqat aniq boshqa til so‘ralsa vaqtincha almashtiring." },
  ru: { name: "rus", instruction: "JAVOB TILI USTUVORLIGI: foydalanuvchi doimiy ravishda rus tilini tanlagan. Barcha javoblarni rus tilida yozing, faqat aniq boshqa til so‘ralsa vaqtincha almashtiring." }
};

function createUserPreferences(options = {}) {
  const filePath = options.filePath || path.join(process.env.ULUGBEK_DATA_DIR || path.join(__dirname, "..", "data"), "user-language-preferences.json");
  const maxEntries = 5000;
  let entries = {};
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) entries = parsed;
  } catch (_) {}

  function keyFor(sessionId) {
    const id = String(sessionId || "").trim();
    if (!/^[a-zA-Z0-9_-]{8,80}$/.test(id)) return "";
    return crypto.createHash("sha256").update(id).digest("hex");
  }

  function save() {
    const directory = path.dirname(filePath);
    fs.mkdirSync(directory, { recursive: true });
    const temporary = filePath + "." + process.pid + ".tmp";
    fs.writeFileSync(temporary, JSON.stringify(entries), { mode: 0o600 });
    fs.renameSync(temporary, filePath);
  }

  function detect(message) {
    const text = String(message || "").normalize("NFC").toLocaleLowerCase("uz");
    if (/(?:har doim|doimo|bundan buyon|bundan keyin|faqat|always|from now on).{0,50}(?:o['’‘ʻʼ]?zbek|узбек|uzbek).{0,35}(?:til|language|cha)?|(?:o['’‘ʻʼ]?zbekcha|узбекча).{0,35}(?:javob ber|gapir|yoz|answer|reply)|(?:javob ber|gapir|yoz).{0,35}(?:o['’‘ʻʼ]?zbekcha|узбекча)/iu.test(text)) return "uz";
    if (/(?:always|from now on|doimo|har doim).{0,50}(?:english|ingliz).{0,30}(?:answer|reply|til|language)?/iu.test(text)) return "en";
    if (/(?:always|from now on|doimo|har doim).{0,50}(?:russian|ruscha|русский).{0,30}(?:answer|reply|til|language)?/iu.test(text)) return "ru";
    return "";
  }

  function set(sessionId, language) {
    const key = keyFor(sessionId);
    if (!key || !LANGUAGES[language]) return false;
    entries[key] = { language, updatedAt: Date.now() };
    const sorted = Object.entries(entries).sort((a, b) => (b[1]?.updatedAt || 0) - (a[1]?.updatedAt || 0)).slice(0, maxEntries);
    entries = Object.fromEntries(sorted);
    try { save(); return true; } catch (_) { return false; }
  }

  function get(sessionId) {
    const key = keyFor(sessionId);
    const entry = key ? entries[key] : null;
    if (!entry || !LANGUAGES[entry.language]) return null;
    return { code: entry.language, ...LANGUAGES[entry.language] };
  }

  function apply(sessionId, message) {
    const requested = detect(message);
    if (requested) set(sessionId, requested);
    return { changed: Boolean(requested), preference: get(sessionId) };
  }

  return { detect, set, get, apply, status: () => ({ storedPreferences: Object.keys(entries).length, storage: "local-json", storesChatContent: false }) };
}

module.exports = { createUserPreferences, LANGUAGES };
