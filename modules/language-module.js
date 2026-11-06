"use strict";

// Deterministic language routing and shared language-training instructions.
// This is a prompt/routing module, not a newly trained neural language model.
const LANGUAGE_RULES = {
  uz: { name: "O‘zbek tili", script: "lotin yoki kirill — foydalanuvchi ishlatgan yozuv", instruction: "O‘zbek tilida tabiiy, sodda va imlo jihatdan to‘g‘ri javob bering. Foydalanuvchi lotin yozuvida yozsa lotinda, kirillda yozsa kirillda yozing. O‘zbekcha atamalarni asossiz ruscha yoki inglizcha bilan almashtirmang." },
  en: { name: "English", script: "Latin", instruction: "Answer naturally in clear English. Match the user's level and explain uncommon terms when useful." },
  ru: { name: "Русский язык", script: "кириллица", instruction: "Отвечайте естественным, грамотным и понятным русским языком." },
  tr: { name: "Türkçe", script: "Latin", instruction: "Türkçe, doğal ve anlaşılır biçimde yanıt verin." },
  kk: { name: "Қазақ тілі", script: "кириллица или латиница пользователя", instruction: "Қазақ тілінде табиғи әрі түсінікті жауап беріңіз; пайдаланушы қолданған жазуды сақтаңыз." },
  unknown: { name: "Aniqlanmagan til", script: "foydalanuvchi yozuvi", instruction: "Til aniq bo‘lmasa, foydalanuvchi ishlatgan til va yozuvni saqlang; tushunarsiz bo‘lsa bitta qisqa aniqlashtiruvchi savol bering." }
};

const UZ_CYRILLIC_WORDS = /(?:менга|ёрдам|қандай|керак|билан|учун|сиз|биз|ишлайди|беринг|нима|қиласиз)/giu;
const RU_CYRILLIC_WORDS = /(?:что|как|пожалуйста|помоги|помогите|для|это|мне|нужно|можно|спасибо|здравствуйте|привет|почему|где|когда|хочу|умереть|самоубийство|навредить|себе|защитить|мошенничество)/giu;
const WORDS = {
  uz: /\b(salom|assalomu|alaykum|uchun|qanday|qil|kerak|menga|ber|bilan|haqida|yozib|tushuntir|iltimos|rahmat|o'zbek|o‘zbek|bo'lishi|bo‘lishi|mumkin|emas|men|siz|biz)\b/giu,
  en: /\b(the|and|what|how|please|help|with|from|this|that|you|your|can|could|would|should|hello|thanks|about|for|want|myself|hurt|suicide|die|prevent|someone|steal|credentials|poison|fraud|i|my|is|are|do|does)\b/giu,
  ru: /\b(что|как|пожалуйста|помоги|помогите|для|это|мне|нужно|можно|спасибо|здравствуйте|привет|почему|где|когда)\b/giu,
  tr: /\b(merhaba|nasıl|lütfen|yardım|için|nedir|teşekkür|ben|sen|siz|ile)\b/giu,
  kk: /\b(сәлем|қалай|өтінемін|көмек|үшін|рақмет|маған|керек|бұл)\b/giu
};

function countMatches(text, pattern) {
  const flags = pattern.flags.includes("g") ? pattern.flags : pattern.flags + "g";
  return [...text.matchAll(new RegExp(pattern.source, flags))].length;
}
function detectLanguage(value) {
  const text = String(value || "").trim();
  if (!text) return { code: "unknown", confidence: 0, script: "unknown", explicit: false };
  const lower = text.toLocaleLowerCase();
  const explicit = [
    { code: "uz", pattern: /\b(o'zbekcha|o‘zbekcha|o'zbek tilida|o‘zbek tilida|узбекча|на узбекском)\b/i },
    { code: "en", pattern: /\b(in english|english please|на английском|инглиз тилида)\b/i },
    { code: "ru", pattern: /\b(in russian|по-русски|на русском|рус тилида)\b/i },
    { code: "tr", pattern: /\b(türkçe|turkce|по-турецки)\b/i },
    { code: "kk", pattern: /\b(қазақша|казахский язык|қазақ тілінде)\b/i }
  ].find(item => item.pattern.test(text));
  if (explicit) return { code: explicit.code, confidence: 1, script: scriptOf(text), explicit: true };

  const cyrillic = (text.match(/[\u0400-\u04FF]/g) || []).length;
  const latin = (text.match(/[A-Za-z]/g) || []).length;
  const uzCyrillic = (text.match(/[ўқғҳЎҚҒҲ]/g) || []).length;
  const kkCyrillic = (text.match(/[әіңүұөһӘІҢҮҰӨҺ]/g) || []).length;
  if (cyrillic > 0 && cyrillic >= latin) {
    if (kkCyrillic > 0) return { code: "kk", confidence: 0.82, script: "cyrillic", explicit: false };
    if (uzCyrillic > 0) return { code: "uz", confidence: 0.86, script: "cyrillic", explicit: false };
    const ruScore = countMatches(lower, RU_CYRILLIC_WORDS);
    const uzScore = countMatches(lower, UZ_CYRILLIC_WORDS);
    return ruScore > uzScore ? { code: "ru", confidence: 0.78, script: "cyrillic", explicit: false } :
      uzScore > 0 ? { code: "uz", confidence: 0.72, script: "cyrillic", explicit: false } :
      { code: "unknown", confidence: 0.35, script: "cyrillic", explicit: false };
  }
  if (latin > 0) {
    const scores = Object.entries(WORDS).map(([code, pattern]) => [code, countMatches(lower, pattern)]).sort((a, b) => b[1] - a[1]);
    const [code, score] = scores[0];
    if (score > 0) return { code, confidence: Math.min(0.95, 0.55 + score * 0.08), script: "latin", explicit: false };
    if (/[o‘'ʻ]zbek|sh|ch|g‘|q|x/i.test(text)) return { code: "uz", confidence: 0.52, script: "latin", explicit: false };
  }
  return { code: "unknown", confidence: 0.25, script: scriptOf(text), explicit: false };
}
function scriptOf(text) {
  const cyrillic = (String(text).match(/[\u0400-\u04FF]/g) || []).length;
  const latin = (String(text).match(/[A-Za-z]/g) || []).length;
  return cyrillic > latin ? "cyrillic" : latin > 0 ? "latin" : "unknown";
}
function requestedLanguage(value, detected = detectLanguage(value)) {
  return detected.code || "unknown";
}
function buildLanguageInstruction(value) {
  const detected = detectLanguage(value);
  const rule = LANGUAGE_RULES[detected.code] || LANGUAGE_RULES.unknown;
  return [
    "FOYDALANUVCHI TILI VA JAVOB SIYOSATI:",
    "Aniqlangan til: " + rule.name + "; yozuv: " + (detected.script || rule.script) + "; ishonch: " + detected.confidence + ".",
    rule.instruction,
    "Foydalanuvchi boshqa tilni aniq so‘rasa, aniqlangan til o‘rniga so‘ralgan tilni ishlating.",
    "Tarjima so‘ralganda asl ma’noni, ism va raqamlarni saqlang; tarjimani asl matn bilan aralashtirmang.",
    "Tilni aniqlash ishonchi past bo‘lsa, matnning tilini taxmin qilib qat’iy da’vo qilmang; foydalanuvchi yozgan tilga moslashishga harakat qiling.",
    "Javobda foydalanuvchi ishlatgan lotin/kirill yozuvini saqlang. Aralash tildagi xabarda asosiy tilni tanlang va texnik nomlarni asl ko‘rinishida qoldiring."
  ].join("\n");
}
function status() {
  return {
    ready: true,
    module: "ulugbek-language-router-v1",
    mode: "uzbek-core-with-translation-adapter; no separate foreign-language training",
    neuralModelTraining: false,
    supportedLanguages: Object.keys(LANGUAGE_RULES).filter(code => code !== "unknown"),
    defaultLanguage: "uz",
    scriptPreservation: true,
    allAgentsSharePolicy: true
  };
}
module.exports = { detectLanguage, requestedLanguage, buildLanguageInstruction, status, LANGUAGE_RULES };
