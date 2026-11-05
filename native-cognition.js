"use strict";

// Deterministic evidence reasoning layer; this is not a trained neural network.
const STOP = new Set(("the and for with that this from into about which when where what who whom whose are was were been being have has had will would could should can may might not but or nor dan yoki uchun bilan bu shu bir uning ular qanday nima qachon qayerda kim haqida orqali ham esa edi bor yoq qaysi qayerga qayerdan mi men sen siz u hamda bilanmi bilasanmi bilasizmi degani").split(/\s+/));
const CORRECTIONS = new Map([
  ["endilik", "intellekt"], ["intelik", "intellekt"], ["intellek", "intellekt"],
  ["aqil", "aql"], ["chatgpt", "chat gpt"]
]);
function normalizeInput(value) {
  let text = String(value || "").toLocaleLowerCase("uz")
    .replace(/[’‘ʻʼ\`]/g, "'").replace(/[^\p{L}\p{N}\s']/gu, " ")
    .replace(/\s+/g, " ").trim();
  return text.split(" ").flatMap(token => (CORRECTIONS.get(token) || token).split(" ")).join(" ");
}
function stem(word) {
  const suffixes=["larining","laridan","lariga","larini","larning","ning","dagi","dan","ga","ni","da","lar","lik","ini","iga","sini","ida"];
  for(const suffix of suffixes) {
    if(word.length>suffix.length+3 && word.endsWith(suffix)) return word.slice(0,-suffix.length);
  }
  return word;
}
function words(text) {
  return normalizeInput(text).replace(/(?<=\p{L})'(?=\p{L})/gu,"")
    .split(/[^\p{L}\p{N}]+/u).map(stem)
    .filter(x => x.length > 2 && !STOP.has(x));
}
function concepts(text) {
  const counts = new Map();
  for (const word of words(text)) counts.set(word, (counts.get(word) || 0) + 1);
  return [...counts].sort((a,b)=>b[1]-a[1]).slice(0,12).map(x=>x[0]);
}
function editDistance(a,b) {
  if (Math.abs(a.length-b.length)>1) return 2;
  let prev = Array.from({length:b.length+1},(_,i)=>i);
  for(let i=1;i<=a.length;i++) {
    const row=[i];
    for(let j=1;j<=b.length;j++) row[j]=Math.min(row[j-1]+1,prev[j]+1,prev[j-1]+(a[i-1]===b[j-1]?0:1));
    prev=row;
  }
  return prev[b.length];
}
function similar(a,b) {
  return a===b || (a.length>=5 && b.length>=5 &&
    (a.startsWith(b) || b.startsWith(a) || editDistance(a,b)<=1));
}
function splitFacts(text) {
  return String(text || "").split(/(?<=[.!?])\s+|\n+/)
    .map(x=>x.trim()).filter(x=>x.length>25 && x.length<700).slice(0,30);
}
function relevance(query, entry) {
  const q=[...new Set(words(query))];
  if(!q.length) return {score:0,matched:[]};
  const candidates=[...new Set(words(String(entry.title||"")+" "+String(entry.content||"")))];
  const matched=q.filter(term=>candidates.some(candidate=>similar(term,candidate)));
  return {score:matched.length/q.length,matched};
}
function filterRelevantEvidence(query, entries, limit=4) {
  const querySize=Math.max(1,new Set(words(query)).size);
  const required=Math.min(2,querySize)/querySize;
  return (Array.isArray(entries)?entries:[])
    .map(entry=>({...entry,...relevance(query,entry)}))
    .filter(entry=>entry.score>=required)
    .sort((a,b)=>b.score-a.score)
    .slice(0,Math.max(1,Math.min(6,limit)));
}
function reason(query, entries) {
  const q=new Set(words(query)), ranked=[];
  for(const entry of filterRelevantEvidence(query,entries,6)) {
    for(const fact of splitFacts(entry.content)) {
      const f=new Set(words(fact));
      const matched=[...q].filter(term=>[...f].some(candidate=>similar(term,candidate)));
      const score=matched.length/Math.max(1,q.size);
      if(matched.length>=Math.min(2,q.size) && score>=0.25) ranked.push({
        fact,title:entry.title,source:entry.source,status:entry.status||"unknown",
        score,matchedTerms:matched.length
      });
    }
  }
  ranked.sort((a,b)=>b.score-a.score);
  const seen=new Set();
  const facts=ranked.filter(x=>{const key=x.fact.toLocaleLowerCase();if(seen.has(key))return false;seen.add(key);return true;}).slice(0,3);
  return {method:"native-evidence-comparison-and-relevance-ranking",answerable:facts.length>0,
    queryConcepts:concepts(query),facts,
    inference:facts.length>1?"Bir nechta mos dalil solishtirildi.":"Bitta mos dalil topildi; keng xulosa uchun dalil cheklangan."};
}
const INTENT_DOMAINS = [
  { id: "work", pattern: /(ish|vakansiya|kasb|rezyume|resume|maosh|ishchi)/ },
  { id: "education", pattern: /(o'qish|oqish|dars|kurs|imtihon|uy vazifa|o'rgan|organ|o'rgat|talim)/ },
  { id: "technology", pattern: /(dastur|kod|sayt|ilova|telefon|kompyuter|server|github|render|xato|texnik)/ },
  { id: "documents", pattern: /(hujjat|ariza|shartnoma|oferta|pdf|tarjima|xat|rasmiy)/ },
  { id: "business", pattern: /(biznes|tadbirkor|firma|kompaniya|investor|grant|loyiha|daromad|savdo)/ },
  { id: "travel", pattern: /(sayohat|safar|avia|chipta|mehmonxona|viza|yo'l|manzil)/ },
  { id: "health", pattern: /(sog'liq|sog'lig|salomat|shifokor|kasallik|dori|alomat|og'riq)/ },
  { id: "finance", pattern: /(pul|qarz|budjet|byudjet|soliq|hisob|to'lov|narx|moliy)/ },
  { id: "shopping", pattern: /(sotib|xarid|mahsulot|telefon|noutbuk|narxini|taqqosla)/ },
  { id: "research", pattern: /(izlab|qidir|topib ber|ma'lumot|tekshir|solishtir|tahlil|yangilik)/ }
];
function classifyIntent(query) {
  const normalized = normalizeInput(query);
  const actionRequested = /(yordam|qilib ber|tayyorla|yozib ber|topib ber|qidirib ber|tekshir|tuzat|yarat|reja tuz|o'rgat|tushuntir|tarjima|hisobla|solishtir|tahlil qil|maslahat ber)/.test(normalized);
  const domain = INTENT_DOMAINS.find(item => item.pattern.test(normalized));
  return { actionRequested, domain: domain ? domain.id : "general", normalized };
}
function actionFallbackReply(query) {
  const intent = classifyIntent(query);
  if (!intent.actionRequested && intent.domain === "general") return null;
  const prompts = {
    work: "Albatta, ish topishga yordam beraman. Qaysi davlat yoki shaharda ish qidiramiz? Qaysi kasb yoki ish turini xohlaysiz?",
    education: "Ta’lim bo‘yicha yordam beraman. Qaysi fan yoki ko‘nikmani o‘rganmoqchisiz?",
    technology: "Texnik vazifani ko‘rib chiqaman. Qaysi dastur, qurilma yoki kodda muammo bor?",
    documents: "Hujjat bilan yordam beraman. Hujjatni yuboring yoki qanday hujjat kerakligini ayting.",
    business: "Biznes va loyiha bo‘yicha yordam beraman. Maqsad, soha va kerakli natijani yozing.",
    travel: "Safar bo‘yicha yordam beraman. Qayerdan qayerga va qachon borishni rejalashtiryapsiz?",
    health: "Sog‘liq mavzusini tushunishga yordam beraman. Qanday alomat yoki savol bor? Shoshilinch holatda tez yordamga murojaat qiling.",
    finance: "Moliyaviy masalani tartibga solishga yordam beraman. Qaysi hisob-kitob yoki masala?",
    shopping: "Mahsulot tanlashga yordam beraman. Qaysi mahsulot va taxminiy budjet?",
    research: "Ma’lumotni qidirib, manbalarni solishtirishga yordam beraman. Aynan nimani izlaymiz?",
    general: "Albatta, yordam beraman. Qaysi masala bo‘yicha qanday natijaga erishmoqchisiz?"
  };
  return prompts[intent.domain];
}
function quickReply(query) {
  const math=require("./modules/math-engine").findExpression(query);
  if(math) {
    const answer=require("./modules/math-engine").formatNumber(math.result);
    return "Hisoblash: "+math.expression+" = "+answer+"\nJavob: "+answer+".";
  }
  const q=normalizeInput(query);
  if(/^(o'zbekiston|uzbekiston|uzbekistan)$/.test(q))
    return "O‘zbekiston — Markaziy Osiyoda joylashgan mustaqil davlat. Poytaxti — Toshkent. Qaysi yo‘nalishi haqida bilmoqchisiz?";
  if(/^(salom|assalomu alaykum|assalom alaykum|salom alaykum|hello|hi|hayrli tong|hayrli kun|hayrli kech)[!. ]*$/.test(q))
    return "Va alaykum assalom! Savolingizni yozing.";
  if(/^(rahmat|katta rahmat|tashakkur)[!. ]*$/.test(q)) return "Arzimaydi! Yana qanday savolingiz bor?";
  if(/^(xayr|hayr|ko'rishguncha|ko'rishamiz)[!. ]*$/.test(q)) return "Xayr! Yana kerak bo‘lsam, bemalol yozing.";
  if(/(sen kimsan|siz kimsiz|isming nima|o'zing kimsan|uzing kimsan)/.test(q))
    return "Men ULUGBEK AI — mahalliy mantiqiy mexanizm va mavjud bilimlardan foydalanadigan yordamchiman.";
  if(/(nima qila olasan|nimalar qila olasan|imkoniyatlaring|vazifang nima)/.test(q))
    return "Men mavjud bilimlar bazasi va ochiq manbalardan foydalanib savollarga javob beraman, dalillarni solishtiraman va bitta qisqa xulosa tuzaman. Dalil yetarli bo‘lmasa, buni aytaman.";
  if(/(qanday o'rganasan|qanday organasan|o'zingni o'rgat|ozingni urgat|qayta o'qit|qayta oqit)/.test(q))
    return "Avval o‘zbekcha, keyin inglizcha va ruscha ochiq manbalardan ma’lumot yig‘aman. Yangi ma’lumot tekshiruvga ajratiladi va tasdiqlansa bilimlar bazasiga qo‘shiladi. Bu hozircha neyron tarmoq vaznlarini qayta o‘qitmaydi.";
  const actionReply = actionFallbackReply(query);
  if (actionReply) return actionReply;
  if(/(api kalit|tashqi api|ma'lumotlarim|maxfiylik|suhbatlarim)/.test(q))
    return "Hozirgi chat rejimi tashqi AI provayderiga avtomatik ulanmaydi. Serverdagi saqlash va hosting sozlamalari alohida tekshirilishi kerak.";
  return null;
}
function conciseEvidenceReply(result) {
  const facts=result.facts||[];
  const approved=facts.length>0 && facts.every(x=>x.status==="approved");
  const heading=approved?"Tasdiqlangan bilimlar asosida":"O‘qilgan ochiq manbalar asosida (hali mustaqil tasdiqlanmagan)";
  const statements=facts.map(x=>x.fact.replace(/\s+/g," ").trim());
  let summary;
  if(statements.length===1) summary=statements[0];
  else if(statements.length===2) summary=statements[0]+" Bundan tashqari, "+statements[1].charAt(0).toLowerCase()+statements[1].slice(1);
  else summary=statements[0]+" Yana muhim jihatlar: "+statements.slice(1).join(" ");
  const sources=[...new Set(facts.map(x=>x.source).filter(Boolean))].slice(0,3);
  return heading+":\n"+summary+"\n\nYakuniy xulosa: topilgan mos dalillar shu fikrni qo‘llab-quvvatlaydi; dalil yetarli bo‘lmagan joyda taxmin qilinmadi."+
    (sources.length?"\n\nManbalar: "+sources.join(" | "):"");
}
function respond(query, entries) {
  const quick=quickReply(query);
  if(quick) return {reply:quick,reasoning:{method:"built-in-uzbek-dialogue",answerable:true,facts:[]}};
  const result=reason(query,entries);
  if(!result.answerable) return {reply:"Savolingizni tushundim, ammo mos manbalardan hozircha ishonchli javob topa olmadim. Noto‘g‘ri ma’lumot bermaslik uchun taxmin qilmayman.",reasoning:result};
  return {reply:conciseEvidenceReply(result),reasoning:result};
}
module.exports={concepts,splitFacts,reason,respond,quickReply,normalizeInput,words,editDistance,relevance,filterRelevantEvidence,classifyIntent,actionFallbackReply};
