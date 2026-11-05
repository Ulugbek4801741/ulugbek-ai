"use strict";

const conversationOrchestrator = require("./modules/conversation-orchestrator");
const languageCognition = require("./modules/language-cognition");

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
  const linguistic = languageCognition.analyze(query);
  const languageCode = ["uz", "en", "ru", "tr", "kk"].includes(linguistic.language.code) ? linguistic.language.code : "uz";
  const q = new Set([...words(query).map(word => languageCognition.stemToken(word, languageCode)), ...linguistic.concepts]);
  const ranked = [];
  for (const entry of entries || []) {
    for (const fact of splitFacts(entry.content)) {
      const f = new Set(words(fact).map(word => languageCognition.stemToken(word, languageCode)));
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
      const learnedScore = languageCognition.scoreText(query, fact, linguistic.language.code);
      const requiredOverlap = Math.min(2, q.size);
      if (common >= requiredOverlap && q.size > 0) ranked.push({
        fact, title: entry.title, source: entry.source,
        score: (common/q.size) + learnedScore.score * 0.2 + Math.min(common,5)*0.03,
        matchedTerms: common, learnedMatchedTerms: learnedScore.matchedTerms
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
  return { method:"symbolic-retrieval-language-model-and-evidence-ranking", answerable:facts.length>0,
    queryConcepts:concepts(query), intent:linguistic.intent, cognitivePlan:linguistic.plan, facts,
    inference:facts.length>1 ? "Bir nechta dalil solishtirildi." : "Bitta mos dalil topildi; keng xulosa uchun dalil yetarli emas." };
}
function normalizeInput(value) {
  return String(value || "").toLocaleLowerCase("uz")
    .replace(/[’‘ʻʼ`]/g, "'").replace(/[^\p{L}\p{N}\s']/gu, " ")
    .replace(/\s+/g, " ").trim();
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
  const actionRequested = /(yordam|qilib ber|tayyorla|yozib ber|topib ber|qidirib ber|tekshir|tuzat|yarat|reja tuz|tanla|o'rgat|tushuntir|tarjima|hisobla|solishtir|tahlil qil|maslahat ber)/.test(normalized);
  // More specific domains must win when a phrase contains a generic token
  // such as "ish" inside "olish" (e.g. visa olish).
  // Explicit product-selection verbs take precedence over the generic word
  // "telefon", which also appears in technical-support requests.
  const shoppingAction = /(tanla|sotib|xarid|mahsulot|noutbuk|narxini|taqqosla)/.test(normalized);
  const priority = ["travel", "health", "technology", "documents", "education", "business", "finance", "shopping", "work", "research"];
  const domain = shoppingAction
    ? INTENT_DOMAINS.find(item => item.id === "shopping")
    : priority.map(id => INTENT_DOMAINS.find(item => item.id === id))
      .find(item => item && item.pattern.test(normalized));
  return { actionRequested, domain: domain ? domain.id : "general", normalized };
}
function actionFallbackReply(query) {
  const intent = classifyIntent(query);
  const directWorkRequest = /\b(ish kerak|ish top|ishga joylash|vakansiya)\b/.test(intent.normalized);
  if (!intent.actionRequested && !directWorkRequest) return null;
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
  const math = require("./modules/math-engine").findExpression(query);
  if (math) {
    const answer = require("./modules/math-engine").formatNumber(math.result);
    return "Hisoblash: " + math.expression + " = " + answer + "\\nJavob: " + answer + ".";
  }
  const q = normalizeInput(query);
  if (/^(o'zbekiston|uzbekiston|uzbekistan)$/.test(q)) {
    return "O‘zbekiston — Markaziy Osiyoda joylashgan mustaqil davlat. Poytaxti — Toshkent. Davlatning rasmiy nomi — O‘zbekiston Respublikasi. Qaysi yo‘nalish haqida batafsil ma’lumot kerak: tarixi, geografiyasi, aholisi, iqtisodiyoti yoki viloyatlari?";
  }
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
  const actionReply = actionFallbackReply(query);
  if (actionReply) return actionReply;
  return null;
}
function respond(query, entries, suppliedContext = null) {
  const context = suppliedContext || conversationOrchestrator.analyze(query);
  const safe = conversationOrchestrator.safetyReply(context);
  if (safe) return { reply: safe, cognition: context.cognition, reasoning: { method: "integrated-safety-policy", answerable: true, facts: [] } };
  const opening = conversationOrchestrator.emotionalOpening(context);
  const quick = quickReply(query);
  if (quick) return { reply: opening ? opening + "\n\n" + quick : quick, cognition: context.cognition, reasoning: { method: "built-in-dialogue", answerable: true, facts: [] } };
  const result = reason(query, entries);
  if (!result.answerable) {
    const fallback = "Bu savolga hozircha tasdiqlangan bilimlar bazamdan ishonchli javob topa olmadim. Savolni boshqacha yoki aniqroq yozib ko‘ring. Bilmagan narsamni to‘qib aytmayman.";
    return { reply: (opening ? opening + "\n\n" : "") + fallback, cognition: context.cognition, reasoning: result };
  }
  const lines = result.facts.map((x, i) => (i + 1) + ". " + x.fact + "\n   Mavzu: " + x.title);
  const sources = [...new Set(result.facts.map(x => x.source).filter(Boolean))];
  const reply = "ULUGBEK AI mustaqil mantiqiy mexanizmi topgan dalillar:\n\n" + lines.join("\n\n") +
    (sources.length ? "\n\nManbalar:\n" + sources.join("\n") : "") +
    "\n\nXulosa faqat topilgan dalillarga asoslandi; dalil yetishmasa taxmin qilinmadi.";
  return { reply: (opening ? opening + "\n\n" : "") + reply, cognition: context.cognition, reasoning: result };
}
module.exports = { concepts, splitFacts, reason, respond, quickReply, normalizeInput, classifyIntent, actionFallbackReply };
