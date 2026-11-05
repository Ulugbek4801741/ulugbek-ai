"use strict";

// Rule-based affect recognition and response-style guidance.
// It models conversational cues; it does not claim the AI has subjective feelings.
const PATTERNS = [
  ["distress", /\b(yordam bering|qo'rqyapman|qo‘rqyapman|vahim|tushkun|yig'lay|yig‘lay|umidsiz|charchadim|qiynalyapman|azob|depress|panic|afraid|scared|anxious|hopeless|hurt|страшно|боюсь|тревож|плохо|безнадёж)\b/i],
  ["anger", /\b(jahlim|g'azab|g‘azab|asabim|nafrat|jinni|aldading|yolg'onchi|g'azablandim|angry|furious|hate|annoyed|mad|злюсь|бесит|ненавижу)\b/i],
  ["sadness", /\b(xafaman|xafa|yomon bo'ldim|yomon bo‘ldim|yo'qotdim|yo‘qotdim|sog'indim|sog‘indim|qayg'u|qayg‘u|sad|lonely|grief|miss you|печально|грустно|одинок)\b/i],
  ["joy", /\b(xursandman|quvonch|zo'r|zo‘r|ajoyib|muvaffaqiyat|tabrik|rahmat|happy|glad|great|wonderful|congratulations|рад|счастлив|отлично|спасибо)\b/i],
  ["confusion", /\b(tushunmadim|tushunmayapman|chalkash|anglamadim|qanday ishlaydi|nima degani|confused|don't understand|unclear|не понимаю|непонятно)\b/i],
  ["curiosity", /\b(qiziq|bilmoqchiman|o'rganmoqchiman|o‘rganmoqchiman|nega|nima uchun|qanday qilib|curious|learn|why|how does|интересно|хочу узнать)\b/i]
];
const GUIDANCE = {
  distress: "Juda ehtiyotkor, sokin va hamdard ohangda javob bering. Hukm qilmang. Muammoni kichik xavfsiz qadamlarga ajrating. Shoshilinch xavf alomatlari bo‘lsa, real inson va mahalliy favqulodda yordamga murojaat qilishni tavsiya qiling.",
  anger: "Tinch, hurmatli va himoyalanmaydigan ohangda javob bering. G‘azabni kuchaytirmang; fakt va yechimga qayting.",
  sadness: "Mehribon va qo‘llab-quvvatlovchi ohangda javob bering. Yo‘qotish yoki qayg‘uni kichraytirmang, majburan ijobiylik ko‘rsatmang.",
  joy: "Iliq va ijobiy ohangda javob bering; foydalanuvchining quvonchini e’tirof eting, lekin haddan tashqari oshirib yubormang.",
  confusion: "Sodda so‘zlar, qisqa jumlalar va ketma-ket bosqichlar bilan tushuntiring. Zarur bo‘lsa bitta aniqlashtiruvchi savol bering.",
  curiosity: "Qiziqishni qo‘llab-quvvatlang; tushunchani misol, dalil va amaliy mashq bilan tushuntiring.",
  neutral: "Xolis, hurmatli, aniq va foydali ohangda javob bering."
};
function detectEmotion(input) {
  const text = String(input || "").trim();
  if (!text) return { label: "neutral", confidence: 0, cues: [] };
  const found = PATTERNS.filter(([, pattern]) => pattern.test(text));
  if (!found.length) return { label: "neutral", confidence: 0.45, cues: [] };
  const [label] = found[0];
  return { label, confidence: Math.min(0.94, 0.62 + (found.length - 1) * 0.08), cues: found.map(([name]) => name) };
}
function responseGuidance(input) {
  const emotion = detectEmotion(input);
  return { emotion, instruction: GUIDANCE[emotion.label] || GUIDANCE.neutral };
}
function status() {
  return { ready: true, mode: "rule-based-conversational-affect-estimation", subjectiveFeelings: false, supportedSignals: PATTERNS.map(([label]) => label), safetyEscalation: "guidance-only" };
}
module.exports = { detectEmotion, responseGuidance, status };
