"use strict";

// Native symbolic cognition: no hosted AI, no model weights, no API key.
const STOP = new Set(("the and for with that this from into about which when where what who whom whose are was were been being have has had will would could should can may might not but or nor dan yoki uchun bilan bu shu bir uning ular qanday nima qachon qayerda kim haqida orqali ham esa edi bor yo‘q qaysi qayerda qayerga qayerdan").split(/\s+/));
function words(text) {
  return String(text || "").toLocaleLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .split(/\s+/).filter(x => x.length > 2 && !STOP.has(x));
}
function concepts(text) {
  const counts = new Map();
  for (const word of words(text)) counts.set(word, (counts.get(word) || 0) + 1);
  return [...counts].sort((a,b)=>b[1]-a[1]).slice(0,12).map(x=>x[0]);
}
function splitFacts(text) {
  return String(text || "").split(/(?<=[.!?])\s+|\n+/)
    .map(x=>x.trim()).filter(x=>x.length > 25 && x.length < 700).slice(0,20);
}
function reason(query, entries) {
  const q = new Set(words(query));
  const ranked = [];
  for (const entry of entries || []) {
    for (const fact of splitFacts(entry.content)) {
      const f = new Set(words(fact));
      let common = 0;
      for (const term of q) {
        const matched = [...f].some(candidate =>
          candidate === term ||
          (candidate.length >= 5 && term.length >= 5 &&
            Math.abs(candidate.length - term.length) <= 3 &&
            (candidate.startsWith(term) || term.startsWith(candidate)))
        );
        if (matched) common++;
      }
      const requiredOverlap = Math.min(2, q.size);
      if (common >= requiredOverlap && q.size > 0) ranked.push({
        fact, title: entry.title, source: entry.source,
        status: entry.status || "unknown",
        score: (common/q.size) + Math.min(common,5)*0.03,
        matchedTerms: common
      });
    }
  }
  ranked.sort((a,b)=>b.score-a.score);
  const seen = new Set();
  const facts = ranked.filter(x => {
    const key = x.fact.toLocaleLowerCase();
    if (seen.has(key)) return false;
    seen.add(key); return true;
  }).slice(0,3);
  return { method:"symbolic-retrieval-and-evidence-ranking", answerable:facts.length>0,
    queryConcepts:concepts(query), facts,
    inference:facts.length>1 ? "Bir nechta dalil solishtirildi." : "Bitta mos dalil topildi; keng xulosa uchun dalil yetarli emas." };
}
function normalizeInput(value) {
  return String(value || "").toLocaleLowerCase("uz")
    .replace(/[’‘ʻʼ`]/g, "'").replace(/[^\p{L}\p{N}\s']/gu, " ")
    .replace(/\s+/g, " ").trim();
}
function quickReply(query) {
  const math = require("./modules/math-engine").findExpression(query);
  if (math) {
    const answer = require("./modules/math-engine").formatNumber(math.result);
    return "Hisoblash: " + math.expression + " = " + answer + "\nJavob: " + answer + ".";
  }
  const q = normalizeInput(query);
  if (/^(o'zbekiston|uzbekiston|uzbekistan)$/.test(q)) {
    return "O‘zbekiston — Markaziy Osiyodagi mustaqil davlat. Poytaxti — Toshkent.";
  }
  if (/^(salom|assalomu alaykum|assalom alaykum|salom alaykum|hello|hi|hayrli tong|hayrli kun|hayrli kech)[!. ]*$/.test(q)) {
    return "Va alaykum assalom! Savolingizni yozing.";
  }
  if (/^(rahmat|katta rahmat|tashakkur)[!. ]*$/.test(q)) return "Arzimaydi!";
  if (/^(xayr|hayr|ko'rishguncha|ko'rishamiz)[!. ]*$/.test(q)) return "Xayr! Yana yozishingiz mumkin.";
  if (/(sen kimsan|siz kimsiz|isming nima|o'zing kimsan|uzing kimsan)/.test(q)) {
    return "Men ULUGBEK AI — mahalliy mantiqiy qoidalar va mavjud bilimlardan foydalanuvchi yordamchiman.";
  }
  if (/(nima qila olasan|nimalar qila olasan|imkoniyatlaring|vazifang nima)/.test(q)) {
    return "Savollarga mavjud bilimlar asosida javob beraman, ochiq manbalarni qidiraman va topilgan ma’lumotlarni tekshiruvga ajrataman.";
  }
  if (/(qanday o'rganasan|qanday organasan|o'zingni o'rgat|ozingni urgat|qayta o'qit|qayta oqit)/.test(q)) {
    return "Ochiq manbalardan ma’lumot qidiraman, qisqa yozuv sifatida saqlashga nomzod qilaman. Tasdiqlanmagan ma’lumotni ishonchli bilim deb ko‘rsatmayman. Bu model vaznlarini qayta o‘qitish emas.";
  }
  if (/(api kalit|tashqi api|ma'lumotlarim|maxfiylik|suhbatlarim)/.test(q)) {
    return "Hozirgi chat rejimi tashqi AI API’ga ulanmaydi. Serverdagi saqlash va hosting sozlamalarini alohida tekshirish kerak.";
  }
  return null;
}
function conciseEvidenceReply(facts) {
  const approved = facts.every(item => item.status === "approved");
  const label = approved ? "Tasdiqlangan bilimlar asosida" : "O‘qilgan ochiq manbalar asosida (hali mustaqil tasdiqlanmagan)";
  const lines = facts.slice(0,3).map(item => {
    const text = item.fact.replace(/\s+/g, " ").trim();
    return text.length > 260 ? text.slice(0,257).replace(/[ ,;:-]+$/, "") + "…" : text;
  });
  return label + ":\n" + lines.map(line => "• " + line).join("\n") +
    (facts.length === 1 ? "\n\nEslatma: bitta dalil topildi; umumiy xulosa uchun qo‘shimcha manba kerak." : "");
}
function respond(query, entries) {
  const quick = quickReply(query);
  if (quick) return { reply:quick, reasoning:{ method:"built-in-uzbek-dialogue", answerable:true, facts:[] } };
  const result = reason(query, entries);
  if (!result.answerable) return { reply:"Hozircha yetarli dalil topilmadi. Savolni aniqroq yozing yoki boshqa manba so‘rang.", reasoning:result };
  const sources = [...new Set(result.facts.map(x=>x.source).filter(Boolean))];
  return {
    reply: conciseEvidenceReply(result.facts) + (sources.length ? "\n\nManbalar: " + sources.slice(0,3).join(" | ") : ""),
    reasoning: result
  };
}
module.exports = { concepts, splitFacts, reason, respond, quickReply, normalizeInput, conciseEvidenceReply };
