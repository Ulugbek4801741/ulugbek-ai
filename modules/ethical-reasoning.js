"use strict";

// A transparent, conservative ethical/safety decision aid, not a moral authority.
const RULES = [
  { category: "violence", level: "high", pattern: /\b(odam o'ldirish|odam o‘ldirish|jarohatlash|portlatish|bomb yasash|qurol bilan hujum|kill someone|make a bomb|attack them|убить человека|сделать бомбу)\b/i },
  { category: "fraud", level: "high", pattern: /\b(firibgarlik|aldab pul olish|soxta hujjat|parol o'g'irlash|parol o‘g‘irlash|scam|steal password|fake identity|мошенничество|украсть пароль)\b/i },
  { category: "privacy_abuse", level: "high", pattern: /\b(birovni yashirin kuzat|ruxsatsiz kuzat|josus dastur|stalk them|spy on someone|track without consent|шпионить|следить без согласия)\b/i },
  { category: "self_harm", level: "critical", pattern: /\b(o'zimni o'ldir|o‘zimni o‘ldir|jonimga qasd|o'zimga zarar|o‘zimga zarar|suicide|kill myself|self harm|покончить с собой|навредить себе)\b/i }
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
