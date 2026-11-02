"use strict";
const multilingual = require("./modules/multilingual");

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
  }).slice(0,5);
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
  const q = normalizeInput(query);
  const raw = String(query || "").trim();
  if (/^(salom|assalomu alaykum|assalom alaykum|hello|hi|hola|bonjour|hallo|ciao|merhaba|привет|здравствуйте|مرحبا|नमस्ते|你好|こんにちは|안녕하세요)[!.? ]*$/iu.test(raw)) {
    return multilingual.phrase(query, "hello");
  }
  if (/^(rahmat|katta rahmat|tashakkur|thanks|thank you|gracias|merci|danke|grazie|teşekkürler)[!.? ]*$/iu.test(q)) {
    return multilingual.phrase(query, "thanks");
  }
  if (/^(xayr|hayr|ko'rishguncha|ko'rishamiz|goodbye|bye|adiós|au revoir|再见|さようなら)[!.? ]*$/iu.test(q)) {
    return multilingual.phrase(query, "thanks");
  }
  if (/(qanday o'rganasan|qanday organasan|qanday o‘rganasan|o'zingni qanday o'rgat|qanday bilim olasan)/.test(q)) {
    return "Men o‘zbekcha savollar va ruxsat etilgan ochiq manbalardan olingan ma’lumotlarni tahlil qilib, tasdiqlash uchun bilimlar bazasiga nomzod sifatida saqlashim mumkin. Bu jarayon model vaznlarini qayta o‘qitmaydi; yangi bilimlar tekshiruvdan keyin ishlatiladi.";
  }
  if (/(sen kimsan|siz kimsiz|isming nima|o'zing kimsan|uzing kimsan)/.test(q)) {
    return "Men ULUGBEK AI — hozircha tashqi AI API’siz ishlaydigan, mahalliy mantiqiy javob va bilimlar bazasidan foydalanadigan yordamchiman.";
  }
  if (/(nima qila olasan|nimalar qila olasan|imkoniyatlaring|vazifang nima)/.test(q)) {
    return "Men mavjud bilimlar bazasi va ochiq manbalardan topilgan ma’lumotlar asosida javob berishga mo‘ljallanganman. Murakkab va boshqa tillardagi savollarda imkoniyatlarim hozircha cheklangan bo‘lishi mumkin.";
  }
  if (/(api kalit|tashqi api|ma'lumotlarim|maxfiylik|suhbatlarim)/.test(q)) {
    return "Hozirgi chat rejimi tashqi AI API’ga ulanmaydi. Serverning odatiy ishlashi va saqlash sozlamalari hostingga bog‘liq.";
  }
  return null;
}
function respond(query, entries) {
  const quick = quickReply(query);
  if (quick) return { reply:quick, reasoning:{ method:"built-in-uzbek-dialogue", answerable:true, facts:[] } };
  const result = reason(query, entries);
  if (!result.answerable) return { reply:multilingual.phrase(query, "unknown"), reasoning:result };
  const lines = result.facts.map((x,i)=>(i+1)+". "+x.fact+"\n   Mavzu: "+x.title);
  const sources = [...new Set(result.facts.map(x=>x.source).filter(Boolean))];
  return { reply:"ULUGBEK AI mustaqil mantiqiy mexanizmi topgan dalillar:\n\n"+lines.join("\n\n")+
    (sources.length ? "\n\nManbalar:\n"+sources.join("\n") : "")+
    "\n\nXulosa faqat topilgan dalillarga asoslandi; dalil yetishmasa taxmin qilinmadi.", reasoning:result };
}
module.exports = { concepts, splitFacts, reason, respond, quickReply, normalizeInput };
