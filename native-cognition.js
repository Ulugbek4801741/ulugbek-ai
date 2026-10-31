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
function normalizeInput(value) {
  return String(value || "").toLocaleLowerCase("uz")
    .replace(/[’‘ʻʼ`]/g, "'").replace(/[^\\p{L}\\p{N}\\s']/gu, " ")
    .replace(/\\s+/g, " ").trim();
}
function quickReply(query) {
  const q = normalizeInput(query);
  if (/^(salom|assalomu alaykum|assalom alaykum|salom alaykum|hello|hi|hayrli tong|hayrli kun|hayrli kech)[!. ]*$/.test(q)) {
    return "Va alaykum assalom! Men ULUGBEK AI’man. Savolingizni yozing — mavjud bilimlarim asosida javob beraman.";
  }
  if (/^(rahmat|katta rahmat|tashakkur)[!. ]*$/.test(q)) {
    return "Arzimaydi! Yana qanday savolingiz bor?";
  }
  if (/^(xayr|hayr|ko'rishguncha|ko'rishamiz)[!. ]*$/.test(q)) {
    return "Xayr! Yana kerak bo‘lsam, bemalol yozing.";
  }
  if (/(sen kimsan|siz kimsiz|isming nima|o'zing kimsan|uzing kimsan)/.test(q)) {
    return "Men ULUGBEK AI — hozircha tashqi AI API’siz ishlaydigan, mahalliy mantiqiy javob va tasdiqlangan bilimlar bazasidan foydalanadigan yordamchiman.";
  }
  if (/(nima qila olasan|nimalar qila olasan|imkoniyatlaring|vazifang nima)/.test(q)) {
    return "Men savollarga mavjud bilimlar bazasi asosida javob berish, mavzular bo‘yicha ochiq manbalardan ma’lumot yig‘ish va ularni tekshiruvga yuborishga mo‘ljallanganman. Hozircha barcha mavzularni bilmayman; bilmagan narsamni aniq aytaman.";
  }
  if (/(qanday o'rganasan|qanday organasan|o'zingni o'rgat|ozingni urgat|qayta o'qit|qayta oqit)/.test(q)) {
    return "Men o‘zbekcha ma’lumotlarni birinchi o‘rinda, inglizcha va ruscha ma’lumotlarni keyingi navbatlarda ochiq Wikipedia manbalaridan yig‘aman. Yangi ma’lumot avval tekshiruvga tushadi; tasdiqlanmaguncha javoblarda ishlatilmaydi. Bu jarayon hozircha katta til modelining vaznlarini qayta o‘qitmaydi.";
  }
  if (/(api kalit|tashqi api|ma'lumotlarim|maxfiylik|suhbatlarim)/.test(q)) {
    return "Hozirgi chat rejimi tashqi AI API’ga ulanmaydi va javob yaratish uchun xabarni tashqi AI provayderiga yubormaydi. Serverning odatiy ishlashi va saqlash sozlamalari baribir hostingga bog‘liq.";
  }
  return null;
}
function respond(query, entries) {
  const quick = quickReply(query);
  if (quick) return { reply:quick, reasoning:{ method:"built-in-uzbek-dialogue", answerable:true, facts:[] } };
  const result = reason(query, entries);
  if (!result.answerable) return { reply:"Bu savolga hozircha tasdiqlangan bilimlar bazamdan ishonchli javob topa olmadim. Savolni boshqacha yoki aniqroq yozib ko‘ring. Bilmagan narsamni to‘qib aytmayman.", reasoning:result };
  const lines = result.facts.map((x,i)=>(i+1)+". "+x.fact+"\n   Mavzu: "+x.title);
  const sources = [...new Set(result.facts.map(x=>x.source).filter(Boolean))];
  return { reply:"ULUGBEK AI mustaqil mantiqiy mexanizmi topgan dalillar:\n\n"+lines.join("\n\n")+
    (sources.length ? "\n\nManbalar:\n"+sources.join("\n") : "")+
    "\n\nXulosa faqat topilgan dalillarga asoslandi; dalil yetishmasa taxmin qilinmadi.", reasoning:result };
}
module.exports = { concepts, splitFacts, reason, respond, quickReply, normalizeInput };
