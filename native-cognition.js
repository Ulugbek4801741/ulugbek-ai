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
  const history = require("./modules/history-intent").normalizeHistoryIntent(query);
  const retrievalQuery = history.canonicalEntity
    ? [String(query), history.canonicalEntity, ...(history.aliases || []), ...(history.queryBoost || [])].join(" ")
    : query;
  const linguistic = languageCognition.analyze(retrievalQuery);
  const languageCode = ["uz", "en", "ru", "tr", "kk"].includes(linguistic.language.code) ? linguistic.language.code : "uz";
  const q = new Set([...words(retrievalQuery).map(word => languageCognition.stemToken(word, languageCode)), ...linguistic.concepts]);
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
function quickReply(query) {
  const mathEngine = require("./modules/math-engine");
  const arithmeticInput = String(query || "").trim();
  if (/^[\d\s.,()+\-*/×÷%^=?]+$/.test(arithmeticInput) && /[+\-*/×÷%^]/.test(arithmeticInput) && /\d/.test(arithmeticInput)) {
    try {
      const expression = arithmeticInput.replace(/[=?]+$/g, "").trim();
      const value = mathEngine.calculateExpression(expression);
      const answer = mathEngine.formatNumber(value);
      return "Hisoblash: " + expression + " = " + answer + String.fromCharCode(10) + "Javob: " + answer + ".";
    } catch (error) {
      if (/Nolga bo‘lish mumkin emas/.test(error.message)) return "Bu ifodada nolga bo‘lish bor. Matematikada sonni 0 ga bo‘lish mumkin emas, shuning uchun natija aniqlanmaydi.";
      return "Matematik ifodada xato bor: " + error.message;
    }
  }
  const math = mathEngine.findExpression(query);
  if (math) {
    const answer = mathEngine.formatNumber(math.result);
    return "Hisoblash: " + math.expression + " = " + answer + "\\nJavob: " + answer + ".";
  }
  const q = normalizeInput(query);
  if (/(?:sun'iy intellekt|sun’iy intellekt|suniy intellekt|artificial intelligence|\bai\b).{0,35}(?:nima|degani|tushuntir)|(?:nima|degani).{0,35}(?:sun'iy intellekt|sun’iy intellekt|suniy intellekt|artificial intelligence)/iu.test(q)) {
    return "Sun’iy intellekt — kompyuterga odam bajaradigan ayrim aqliy ishlarni bajarishni o‘rgatadigan texnologiya. Masalan, u savollarga javob beradi, matnni tarjima qiladi yoki rasmdagi narsalarni taniydi. Lekin u odam kabi ongli emas: o‘rgatilgan ma’lumotlar va dasturlar asosida javob yaratadi.";
  }
  if (/(?:temur\s*(?:lang|lank|lenk)|tamerlan|amir\s*temur)/iu.test(q) &&
      /(?:tarix|podshoh|podshox|potshox|hukmdor|shoh|sulton|kim|haqida|ma'lumot|malumot)/iu.test(q)) {
    return "Temur Lang nomi bilan tanilgan hukmdor — Amir Temur (1336–1405). U XIV asrda Movarounnahrda kuchli davlat barpo etgan sarkarda va davlat arbobi edi. Poytaxti Samarqand bo‘lgan. Amir Temur Samarqandni yirik siyosiy, savdo va me’morchilik markaziga aylantirishga katta e’tibor bergan. “Temur Lang” yoki “Tamerlan” laqabi uning yoshligidagi jarohat sabab oqsoqlanib yurishi bilan bog‘lanadi.";
  }
  if (/^(?:menga\s+)?yordam\s+ber(?:\s+(?:olasanmi|olasizmi)|a\s+(?:olasanmi|olasizmi)|ing)?[!? .]*$/iu.test(q) || /^(?:menga\s+)?yordam\s+kerak[!? .]*$/iu.test(q)) {
    return "Albatta, yordam beraman. Qaysi ishda yordam kerak? Masala yechish, darsni tushuntirish, tarjima, matn yozish yoki dastur kodi — topshirig‘ingizni yuboring.";
  }
  if ((/termux/iu.test(q) && /(?:agent|yordamchi|sun'iy endilik)/iu.test(q) && /(?:kod|cod|code|yoz|yarat)/iu.test(q)) ||
      (/(?:nusxa|copy)/iu.test(q) && /(?:kod|cod|code)/iu.test(q))) {
    return [
      "Termux uchun xavfsiz boshlang‘ich agent tayyor. U internetdan ochiq Wikipedia sahifalarini izlaydi, topilgan matnlarni telefoningizdagi mahalliy xotiraga saqlaydi va keyingi savollarda qayta ishlatadi. Bu modelni qayta o‘qitish emas; hozircha internetdan ma’lumot yig‘ish va xotirada saqlash.",
      "",
      "Termuxga quyidagi buyruqlarni bir marta nusxalab kiriting:",
      "",
      "\`\`\`bash",
      "pkg update -y && pkg install python curl -y",
      "mkdir -p ~/ulugbek-agent && cd ~/ulugbek-agent",
      "curl -L https://raw.githubusercontent.com/Ulugbek4801741/ulugbek-ai/main/termux-agent/ulugbek_termux_agent.py -o ulugbek_termux_agent.py",
      "python ulugbek_termux_agent.py --self-test",
      "python ulugbek_termux_agent.py",
      "\`\`\`",
      "",
      "Ishga tushgach, masalan: \`Amir Temur haqida ma’lumot\` deb yozing. \`/memory\` saqlangan bilimlar sonini, \`/exit\` agentni to‘xtatishni ko‘rsatadi.",
      "",
      "Xavfsizlik: agent o‘zboshimchalik bilan telefon buyruqlarini bajarmaydi, fayllarni o‘chirmaydi va o‘z kodini yashirincha o‘zgartirmaydi. Bunday amallar uchun alohida ruxsat kerak.",
      "",
      "Manba kodi: https://github.com/Ulugbek4801741/ulugbek-ai/blob/main/termux-agent/ulugbek_termux_agent.py"
    ].join(String.fromCharCode(10));
  }
  if (/(?:agent|yordamchi).{0,120}(?:kod|cod|code|dastur).{0,45}(?:yoz|yarat)|(?:agent|yordamchi).{0,100}(?:yoz|yarat).{0,60}(?:kod|cod|code|dastur)/iu.test(q)) {
    return [
      "Python tilida AI-agent uchun boshlang‘ich karkas. U vazifani qabul qiladi, mavjud vositani tanlaydi va ishga tushirishdan oldin ruxsat so‘raydi. Bu hali mustaqil til modeli emas — unga keyin model ulash kerak.",
      "",
      "```python",
      "class UniversalAgent:",
      "    def __init__(self): self.tools = {}",
      "    def add_tool(self, name, function): self.tools[name] = function",
      "    def run(self, task):",
      "        print(\"Vazifa:\", task)",
      "        print(\"Vositalar:\", list(self.tools))",
      "        name = input(\"Vosita nomi: \").strip()",
      "        if name not in self.tools: return \"Vosita topilmadi.\"",
      "        if input(\"Ishga tushirishga ruxsat? (ha/yo‘q): \").lower() != \"ha\": return \"Bekor qilindi.\"",
      "        return self.tools[name](task)",
      "",
      "agent = UniversalAgent()",
      "agent.add_tool(\"echo\", lambda task: \"Qabul qilindi: \" + task)",
      "print(agent.run(input(\"Topshiriq: \")))",
      "```",
      "",
      "Saqlash: `agent.py`. Ishga tushirish: `python agent.py`."
    ].join(String.fromCharCode(10));
  }
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
  if (/(ingliz|english|английск).*(til|language|язык)|((til|language|язык).*(ingliz|english|английск))/.test(q) && /(yordam|o'rgan|organ|dars|boshlash|help|learn)/.test(q)) {
    return "Albatta, ingliz tilini noldan o‘rganamiz. Bugungi 1-dars: salomlashish.\n\n1. Hello — Salom.\n2. My name is ... — Mening ismim ...\n3. How are you? — Qalaysiz?\n4. I am fine, thank you. — Yaxshiman, rahmat.\n\nMashq: “My name is ...” jumlasidagi bo‘sh joyga ismingizni yozing. Men javobingizni tekshiraman.";
  }
  if (/(dasturlash|programming|programmer|kod yoz|coding|программир)/.test(q) && /(yordam|help|o'rgan|organ|boshlash|masala|kod)/.test(q)) {
    return "Albatta, dasturlashda bosqichma-bosqich yordam beraman. Kodni yozish, xatoni topish va har bir qatorni tushuntirishdan boshlaymiz. Qaysi dasturlash tilida ishlayapsiz — Python, JavaScript yoki Kotlin? Agar hali tanlamagan bo‘lsangiz, boshlash uchun Pythonni tavsiya qilaman.";
  }
  if (/(qanday o'rganasan|qanday organasan|o'zingni o'rgat|ozingni urgat|qayta o'qit|qayta oqit)/.test(q)) {
    return "Men o‘zbekcha ma’lumotlarni birinchi o‘rinda, inglizcha va ruscha ma’lumotlarni keyingi navbatlarda ochiq Wikipedia manbalaridan yig‘aman. Yangi ma’lumot avval tekshiruvga tushadi; tasdiqlanmaguncha javoblarda ishlatilmaydi. Bu jarayon hozircha katta til modelining vaznlarini qayta o‘qitmaydi.";
  }
  if (/(api kalit|tashqi api|ma'lumotlarim|maxfiylik|suhbatlarim)/.test(q)) {
    return "Hozirgi chat rejimi tashqi AI API’ga ulanmaydi va javob yaratish uchun xabarni tashqi AI provayderiga yubormaydi. Serverning odatiy ishlashi va saqlash sozlamalari baribir hostingga bog‘liq.";
  }
  if (/(?:bloop.*(?:el\s*(?:gran\s*)?maja|maja)|(?:el\s*(?:gran\s*)?maja|maja).*bloop)/iu.test(q) &&
      /(og'ir|ogir|kilogram|kg|vazn|weight|heavy|qaysi biri|taqqos|solishtir)/iu.test(q)) {
    return "Bloop va El Gran Maja uchun ishonchli, ilmiy tasdiqlangan kilogramm o‘lchovi yo‘q. Bloop — 1997-yilda okeanda qayd etilgan tovush; NOAA uni ehtimoliy muzlik yorilishi bilan izohlagan. El Gran Maja esa internetdagi fantastik/mem obraz sifatida uchraydi, haqiqiy hayvon sifatida tasdiqlanmagan. Shuning uchun qaysi biri og‘irligini kilogrammda solishtirib bo‘lmaydi.";
  }
  if (/\bbloop\b/iu.test(q) && /(necha|qancha).{0,18}(kilogram|kg|og'ir|vazn)|(?:kilogram|kg|og'irligi|vazni)/iu.test(q)) {
    return "Bloopning kilogrammdagi vazni ma’lum emas. Chunki Bloop tasdiqlangan hayvon emas: bu 1997-yilda Tinch okeanida qayd etilgan kuchli tovush bo‘lib, NOAA uni ehtimoliy muzlik seysmik hodisasi bilan izohlagan. Uni ulkan dengiz jonzoti deb tasdiqlovchi ilmiy dalil yo‘q.";
  }
  if (/(biznes|tadbirkorlik|savdo).{0,45}(boshlamoqchi|qilmoqchi|boshlash|maslahat|g'oya)|(?:boshlamoqchi|qilmoqchi).{0,45}(biznes|tadbirkorlik|savdo)/iu.test(q)) {
    return "Biznesni katta xarajat bilan emas, avval mijoz muammosini tekshirishdan boshlang. 1) Bitta aniq mahsulot yoki xizmat tanlang. 2) Kogon va Buxorodagi kamida 10 potensial mijoz bilan gaplashing. 3) Raqobatchilar narxi va taklifini solishtiring. 4) Oldindan buyurtma yoki kichik sinov savdosi orqali talabni tekshiring. 5) Xarajat, sotuv narxi va sof foydani yozib boring; talab isbotlanmaguncha qarz yoki katta ijara olmang. Sizga mos aniq reja tuzishim uchun boshlang‘ich budjetingiz qancha?";
  }
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
  // Synthesize retrieved evidence into one concise answer instead of dumping snippets.
  const selected = [];
  for (const candidate of result.facts) {
    const candidateTerms = new Set(words(candidate.fact));
    const duplicate = selected.some(existing => {
      const existingTerms = new Set(words(existing.fact));
      const overlap = [...candidateTerms].filter(term => existingTerms.has(term)).length;
      const union = new Set([...candidateTerms, ...existingTerms]).size || 1;
      return overlap / union >= 0.68;
    });
    if (!duplicate) selected.push(candidate);
    if (selected.length === 2) break;
  }
  const sentences = selected.map(item => {
    let fact = String(item.fact || "").replace(/^\s*\d+[.)]\s*/, "").trim();
    if (fact.length > 420) fact = fact.slice(0, 417).replace(/\s+\S*$/, "") + "...";
    return fact;
  }).filter(Boolean);
  // The API layer appends only pages that were actually opened as clickable source references.
  const reply = sentences.length ? sentences.join(" ") :
    "Bu savol bo‘yicha hozircha yetarli ishonchli ma’lumot topilmadi.";
  const conciseReasoning = { ...result, facts: selected, outputPolicy: "single-concise-synthesized-answer" };
  return { reply: (opening ? opening + "\n\n" : "") + reply, cognition: context.cognition, reasoning: conciseReasoning };
}
module.exports = { concepts, splitFacts, reason, respond, quickReply, normalizeInput };
