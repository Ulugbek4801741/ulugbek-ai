"use strict";

// Offline discovery kernel for the single ULUGBEK agent.
// It creates testable plans from supplied observations; it does not invent facts.
const MAX_TEXT = 12000;
const STOP = new Set(["bilan","uchun","qanday","kerak","mumkin","emas","yoki","the","and","for","with","from","that"]);

function cleanText(value, max = MAX_TEXT) {
  return String(value || "").trim().slice(0, max);
}
function terms(value) {
  return [...new Set((cleanText(value).toLowerCase().match(/[\p{L}\p{N}][\p{L}\p{N}_-]{2,}/gu) || [])
    .filter(word => !STOP.has(word)))].slice(0, 20);
}
function planOfflineDiscovery(input = {}) {
  const problem = cleanText(input.problem);
  if (!problem) throw new TypeError("Muammo matni bo‘sh bo‘lmasligi kerak.");
  const observations = Array.isArray(input.observations)
    ? input.observations.map(x => cleanText(x, 1200)).filter(Boolean).slice(0, 20) : [];
  const knownFacts = Array.isArray(input.knownFacts)
    ? input.knownFacts.map(x => cleanText(x, 1200)).filter(Boolean).slice(0, 20) : [];
  const resources = Array.isArray(input.resources)
    ? input.resources.map(x => cleanText(x, 300)).filter(Boolean).slice(0, 30) : [];
  const variables = terms(problem);
  const evidenceAvailable = observations.length + knownFacts.length > 0;
  const steps = [
    { id: "define", action: "Muammoni aniq maqsad, cheklovlar va muvaffaqiyat mezonlariga ajrating." },
    { id: "inventory", action: "Mavjud bilim, kuzatuv, sensor, asbob, energiya va materiallarni ro‘yxatlang." },
    { id: "first-principles", action: "Muammoni asosiy qonunlar, mantiqiy bog‘lanishlar va tekshirilgan faktlardan qayta tahlil qiling." },
    { id: "hypotheses", action: "Bir-biridan farqli, tekshirilishi mumkin bo‘lgan gipotezalar yarating; ularni fakt sifatida ko‘rsatmang." },
    { id: "experiments", action: "Eng xavfsiz, arzon va qaytariladigan tajribani tanlang; nazorat va o‘lchov mezonini belgilang." },
    { id: "verify", action: "Natijani oldindan belgilangan mezon bilan solishtiring; takrorlang va muqobil izohlarni tekshiring." },
    { id: "memory", action: "Faqat kuzatilgan natija, sharoit, xatolik va ishonch darajasini xotiraga yozing." }
  ];
  const hypotheses = [
    { id: "h1", question: "Muammo mavjud resurslarni boshqacha taqsimlash yoki energiya sarfini kamaytirish bilan hal bo‘lishi mumkinmi?", basis: "resurslarni optimallashtirish yo‘nalishi", status: "untested" },
    { id: "h2", question: "Muammoni kichik qismlarga ajratib, har birini alohida tekshirish yechimni ochib beradimi?", basis: "muammoni dekompozitsiya qilish", status: "untested" },
    { id: "h3", question: "Mavjud jarayon yoki materialning boshqa xususiyatidan foydalanish mumkinmi?", basis: "muqobil foydalanish gipotezasi", status: "untested" }
  ];
  return {
    engine: "ulugbek-offline-discovery-v1",
    internetRequired: false,
    problem,
    variables,
    observations,
    knownFacts,
    resources,
    evidenceAvailable,
    status: evidenceAvailable ? "ready_for_hypothesis_testing" : "needs_observations",
    steps,
    hypotheses,
    safety: [
      "Internet yo‘qligi dalil yo‘qligini anglatmaydi: mahalliy kuzatuv va o‘lchovlardan foydalaning.",
      "Gipoteza tekshirilmaguncha yangi fakt yoki bilim sifatida saqlanmaydi.",
      "Jismoniy tajriba faqat xavfsiz, qonuniy va mavjud vakolat doirasida bajariladi.",
      "Energiya, material, uskuna yoki sensor mavjud bo‘lmasa, ularni yo‘qdan yaratdim deb da’vo qilmang."
    ],
    nextRequiredInputs: evidenceAvailable ? [] : ["atrof-muhit kuzatuvlari", "mavjud resurslar", "o‘lchash yoki sinash vositalari"],
    conclusion: evidenceAvailable
      ? "Mahalliy dalillar mavjud. Gipotezalarni xavfsiz tajribalar bilan tekshirish mumkin."
      : "Hozircha yetarli mahalliy dalil yo‘q. Avval kuzatuv va resurslar inventarizatsiyasi kerak; fakt to‘qib chiqarilmaydi."
  };
}

function evaluateExperiment(input = {}) {
  const hypothesisId = cleanText(input.hypothesisId, 30);
  const observation = cleanText(input.observation, 2000);
  const expected = cleanText(input.expected, 1000);
  if (!hypothesisId || !observation) throw new TypeError("Gipoteza identifikatori va tajriba kuzatuvi talab qilinadi.");
  return {
    hypothesisId,
    expected: expected || null,
    observation,
    outcome: input.success === true ? "supported" : input.success === false ? "not_supported" : "inconclusive",
    verifiedFact: false,
    requiresReplication: true,
    recordedAt: new Date().toISOString(),
    note: "Bitta tajriba yakuniy isbot emas; natijani takrorlash va mustaqil tekshirish kerak."
  };
}

module.exports = { planOfflineDiscovery, evaluateExperiment };
