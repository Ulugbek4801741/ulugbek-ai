"use strict";

// Transparent, deterministic decision-support. This is not consciousness or a trained LLM.
const GROUPS = {
  benefit: ["foyda", "yordam", "yaxshi", "rivoj", "imkoniyat", "tejam", "samar"],
  harm: ["zarar", "xavf", "yomon", "yo'qot", "buz", "kasallik", "jarohat"],
  fairness: ["adolat", "haq", "teng", "nohaq", "kamsit", "aldash", "firib"],
  safety: ["xavfsiz", "xavf", "maxfiy", "ruxsat", "rozilik", "shaxsiy"],
  responsibility: ["mas'ul", "javobgar", "oqibat", "majburiyat", "va'da"]
};
const CAUSE_MARKERS = ["agar", "sabab", "natija", "oqibat", "shuning uchun", "olib kel", "ta'sir"];
const DECISION_MARKERS = ["qilishim kerakmi", "qilsam", "qilaymi", "tanlash", "qaror", "maslahat", "to'g'rimi", "yaxshimi"];
function normalize(value) {
  return String(value || "").toLocaleLowerCase("uz")
    .replace(/[’‘ʻʼ`]/g, "'").replace(/[^\\p{L}\\p{N}\\s']/gu, " ");
}
function containsAny(text, terms) { return terms.filter(term => text.includes(term)); }
function analyze(query, evidence = []) {
  const text = normalize(query);
  const signals = {};
  for (const [name, terms] of Object.entries(GROUPS)) signals[name] = containsAny(text, terms);
  const isDecision = DECISION_MARKERS.some(x => text.includes(x));
  const isCausal = CAUSE_MARKERS.some(x => text.includes(x));
  const detectedFactors = [];
  if (signals.benefit.length) detectedFactors.push({ factor: "foyda", signals: signals.benefit });
  if (signals.harm.length) detectedFactors.push({ factor: "ehtimoliy zarar", signals: signals.harm });
  if (signals.fairness.length) detectedFactors.push({ factor: "adolat va halollik", signals: signals.fairness });
  if (signals.safety.length) detectedFactors.push({ factor: "xavfsizlik va rozilik", signals: signals.safety });
  if (signals.responsibility.length) detectedFactors.push({ factor: "mas'uliyat", signals: signals.responsibility });
  const evidenceCount = Array.isArray(evidence) ? evidence.length : 0;
  return {
    method: "transparent-rule-based-decision-check-v1",
    isDecisionQuestion: isDecision,
    requestsCauseEffect: isCausal,
    detectedFactors,
    evidenceCount,
    confidence: evidenceCount >= 2 ? "limited-evidence" : evidenceCount === 1 ? "single-source" : "no-evidence",
    checks: ["foyda va zarar", "adolat va halollik", "xavfsizlik va rozilik", "mas'uliyat", "qarshi dalillar"],
    limitation: "Qoidaviy tahlil; inson ongi yoki mustaqil axloqiy hukm emas."
  };
}
function explain(analysis) {
  if (!analysis.isDecisionQuestion && !analysis.requestsCauseEffect) return "";
  const factors = analysis.detectedFactors.map(x => x.factor).join(", ");
  return "Mulohaza: qarorning foydasi, ehtimoliy zarari, adolatliligi va xavfsizligini solishtirish kerak." +
    (factors ? " Savolda aniqlangan omillar: " + factors + "." : "") +
    " Oqibatlar vaziyatga bog'liq; dalil yetarli bo'lmasa qat'iy xulosa qilmayman.";
}
module.exports = { analyze, explain, normalize };
