"use strict";

// Native symbolic cognition: no hosted AI, no model weights, no API key.
const STOP = new Set(("the and for with that this from into about which when where what who whom whose are was were been being have has had will would could should can may might not but or nor dan yoki uchun bilan bu shu bir uning ular qanday nima qachon qayerda kim haqida orqali ham esa edi bor yo‘q").split(/\s+/));
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
      for (const term of q) if (f.has(term)) common++;
      if (common) ranked.push({
        fact, title: entry.title, source: entry.source,
        score: (q.size ? common/q.size : 0) + Math.min(common,5)*0.03
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
function respond(query, entries) {
  const result = reason(query, entries);
  if (!result.answerable) return { reply:"Bu savolga bilimlar bazasida yetarli dalil topilmadi. Tayyor AI modelisiz ishlaydigan mantiqiy tizim yangi manbalardan dalil yig‘ishi kerak.", reasoning:result };
  const lines = result.facts.map((x,i)=>(i+1)+". "+x.fact+"\n   Mavzu: "+x.title);
  const sources = [...new Set(result.facts.map(x=>x.source).filter(Boolean))];
  return { reply:"ULUGBEK AI mustaqil mantiqiy mexanizmi topgan dalillar:\n\n"+lines.join("\n\n")+
    (sources.length ? "\n\nManbalar:\n"+sources.join("\n") : "")+
    "\n\nXulosa faqat topilgan dalillarga asoslandi; dalil yetishmasa taxmin qilinmadi.", reasoning:result };
}
module.exports = { concepts, splitFacts, reason, respond };
