"use strict";

// Transparent risk screening. Protective/educational requests are not treated as harmful intent.
const PROTECTIVE_CONTEXT = /(?:oldini olish|himoyalanish|himoya qilish|aniqlash|fosh etish|xabar berish|qanday saqlanish|xavfsizligini tekshirish|firibgarlikdan|hujumdan himoya|zararni kamaytirish|prevention|prevent|protect|defend|detect|report|recover|secure|safety|avoid harm|защитить|защита|предотвратить|выявить|сообщить|восстановить|безопасност)/iu;
const RULES = [
  { category: "violence", level: "high", pattern: /(?:odam\s+o['’‘ʻʼ]?ldirish|jarohatlash|portlatish|bomb\s+yasash|qurol\s+bilan\s+hujum|kill\s+someone|make\s+a\s+bomb|attack\s+them|убить\s+человека|сделать\s+бомбу)/iu },
  { category: "fraud", level: "high", pattern: /(?:firibgarlik|aldab\s+pul\s+olish|soxta\s+hujjat|parol\s+o['’‘ʻʼ]?g['’‘ʻʼ]?irlash|scam|steal\s+password|fake\s+identity|мошенничество|украсть\s+пароль)/iu },
  { category: "privacy_abuse", level: "high", pattern: /(?:birovni\s+yashirin\s+kuzat|ruxsatsiz\s+kuzat|josus\s+dastur|stalk\s+them|spy\s+on\s+someone|track\s+without\s+consent|шпионить|следить\s+без\s+согласия)/iu },
  { category: "self_harm", level: "critical", pattern: /(?:o['’‘ʻʼ]?zimni\s+o['’‘ʻʼ]?ldir|jonimga\s+qasd|o['’‘ʻʼ]?zimga\s+zarar|suicide|kill\s+myself|self\s*harm|покончить\s+с\s+собой|навредить\s+себе)/iu }
];
const PRINCIPLES = [
  "Zararni kamaytirish: odamlar, hayvonlar va jamoaga jismoniy, ruhiy yoki moliyaviy zarar yetkazmaslik.",
  "Halollik: dalil va taxminni ajratish, yolg‘on, firibgarlik va manipulyatsiyani qo‘llab-quvvatlamaslik.",
  "Rozilik va maxfiylik: shaxsiy ma’lumot va kuzatuvda ruxsat hamda qonuniy asosni hurmat qilish.",
  "Adolat: kamsitmaslik, bir tomonlama xulosadan qochish va qaror oqibatlarini ko‘rsatish.",
  "Mas’uliyat: yuqori xavfli qarorlarda noaniqlikni ochiq aytish va mutaxassis yoki tegishli xizmatga yo‘naltirish.",
  "Inson nazorati: pul, huquq, sog‘liq, xavfsizlik yoki tashqi tizimga ta’sir qiluvchi qaytarib bo‘lmas amallarni foydalanuvchi tasdig‘isiz bajarmaslik."
];
function evaluate(input) {
  const text = String(input || "").trim();
  const match = RULES.find(rule => rule.pattern.test(text));
  if (!match) return { allowed: true, risk: "ordinary", category: "none", principles: PRINCIPLES, guidance: "Savolga yordam bering; dalillar, qonuniylik va ehtimoliy oqibatlarni hisobga oling." };
  if (match.category !== "self_harm" && PROTECTIVE_CONTEXT.test(text)) {
    return { allowed: true, risk: "low", category: "prevention", detectedCategory: match.category, principles: PRINCIPLES, guidance: "Himoyalanish, oldini olish, aniqlash va qonuniy xabar berish bo‘yicha xavfsiz yordam bering; hujum yoki suiiste’mol qilish usullarini bermang." };
  }
  if (match.category === "self_harm") return { allowed: false, risk: match.level, category: match.category, principles: PRINCIPLES, guidance: "O‘ziga zarar yetkazish bo‘yicha usul yoki ko‘rsatma bermang. Hamdardlik bildiring, hozirgi xavfsizlikni so‘rang, yaqin ishonchli inson va mahalliy shoshilinch yordam bilan bog‘lanishga undang." };
  return { allowed: false, risk: match.level, category: match.category, principles: PRINCIPLES, guidance: "Zararli yoki noqonuniy bajarish ko‘rsatmalarini bermang. Xavfsiz, qonuniy va profilaktik muqobil taklif qiling." };
}
function buildEthicsInstruction(input) {
  const decision = evaluate(input);
  return [
    "AXLOQIY VA XAVFSIZ QAROR QOIDALARI:",
    ...PRINCIPLES.map((item, index) => (index + 1) + ". " + item),
    "Ushbu so‘rov uchun dastlabki xavf bahosi: " + decision.risk + "; toifa: " + decision.category + ".",
    decision.guidance,
    "Bu baho avtomatik dastlabki tekshiruv, mutlaq hukm emas. Kontekstni tekshiring; foydalanuvchini haqoratlamang yoki ayblamang."
  ].join("\n");
}
function status() { return { ready: true, mode: "transparent-rule-based-ethical-risk-screen", principles: ["harm-reduction", "honesty", "consent-and-privacy", "fairness", "accountability", "human-oversight"], notMoralAuthority: true }; }
module.exports = { evaluate, buildEthicsInstruction, status, PRINCIPLES };
