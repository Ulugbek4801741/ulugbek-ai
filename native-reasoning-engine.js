"use strict";
const cognition = require("./native-cognition");
const offlineDiscovery = require("./offline-discovery-engine");

// One integrated agent: research, education, mathematics, coding and verification
// are capabilities of the same agent, not separate autonomous agent processes.
const RULES = [
  { label: "Ta’lim va fanlar", pattern: /bog‘cha|maktab|kollej|universitet|dars|ta’lim|matematika|fizika|kimyo|biologiya|tarix/i },
  { label: "Tadqiqot", pattern: /izla|tadqiq|manba|internet|o‘rgan|ma’lumot/i },
  { label: "Dasturlash", pattern: /kod|dastur|funksiya|bug|xato|test|build|server|backend|frontend|python|javascript/i },
  { label: "Xavfsizlik", pattern: /xavfsiz|himoya|parol|ruxsat|token|auth|security|deploy/i },
  { label: "Biznes va mahsulot", pattern: /biznes|daromad|to‘lov|mijoz|marketing/i }
];

function analyze(prompt) {
  const text = String(prompt || "").trim();
  if (!text || text.length > 4000) throw new TypeError("Vazifa matni bo‘sh yoki juda uzun.");
  const concepts = cognition.concepts(text);
  const domains = RULES.filter(rule => rule.pattern.test(text)).map(rule => rule.label);
  const codeTask = /kod|dastur|funksiya|bug|xato|test|build|server|backend|frontend/i.test(text);
  const steps = [
    { title: "Savolni tushunish", action: "Maqsad, kerakli natija va cheklovlarni aniqlash." },
    { title: "Bilim va manbalarni tekshirish", action: "Tasdiqlangan bilimlar bazasi va ruxsat etilgan ochiq manbalardan dalil izlash." },
    { title: "Yechimni tayyorlash", action: codeTask ? "Kod yoki texnik yechimni tayyorlash va izohlash." : "Dalillarga asoslangan tushunarli javob tayyorlash." },
    { title: "Natijani tekshirish", action: "Mantiq, manbalar, xavfsizlik va mavjud testlarni tekshirish." }
  ];
  const acceptanceCriteria = [
    "Bitta ULUGBEK Universal Agent barcha vazifalarni bajaradi; agentlar o‘rtasida topshiriq uzatish yo‘q.",
    "Noma’lum faktlar to‘qib chiqarilmaydi; manbalar ko‘rsatiladi.",
    "Bajarilmagan test, kod o‘zgarishi yoki deploy bajarildi deb aytilmaydi.",
    "Tashqi amallar va kodni ishlab chiqarishga qo‘llash alohida ruxsatni talab qiladi."
  ];
  return {
    engine: "ulugbek-single-agent-v1",
    modelType: "single-agent-with-local-model-optional",
    trainedLanguageModel: false,
    apiUsed: false,
    agentCount: 1,
    agentName: "ULUGBEK Universal Agent",
    prompt: text,
    concepts,
    domains,
    steps,
    acceptanceCriteria,
    risks: codeTask ? ["Kod sinov muhitida tekshirilmaguncha ishlab chiqarishga kiritilmaydi."] : [],
    limitations: "Mahalliy model sozlanmagan bo‘lsa, javoblar qoidalar va mavjud bilimlar bazasi bilan cheklanadi.",
    offlineDiscovery: offlineDiscovery.planOfflineDiscovery({ problem: text })
  };
}

function runTask(prompt, _role = "ulugbek-agent", knowledgeEntries = []) {
  const result = analyze(prompt);
  const sharedKnowledge = Array.isArray(knowledgeEntries)
    ? knowledgeEntries.slice(0, 5).filter(item => item && typeof item.title === "string" && typeof item.content === "string")
    : [];
  result.sharedKnowledgeCount = sharedKnowledge.length;
  result.sharedKnowledgeSources = sharedKnowledge.map(item => item.source).filter(Boolean);
  result.offlineDiscovery = offlineDiscovery.planOfflineDiscovery({
    problem: prompt,
    knownFacts: sharedKnowledge.map(item => item.content)
  });
  const lines = [
    "# ULUGBEK AI — yagona universal agent hisoboti",
    "",
    "Agent: ULUGBEK Universal Agent",
    "Agentlar soni: 1",
    "Tashqi AI API: ishlatilmaydi",
    "Mahalliy til modeli: hosting sozlamasiga bog‘liq",
    "",
    "## Aniqlangan yo‘nalishlar",
    result.domains.join(", ") || "Umumiy savol",
    "",
    "## Asosiy tushunchalar",
    result.concepts.join(", ") || "Ajratilmadi",
    "",
    "## Tasdiqlangan bilimlar"
  ];
  if (!sharedKnowledge.length) lines.push("Mos tasdiqlangan manba topilmadi.");
  for (const [index, item] of sharedKnowledge.entries()) {
    lines.push("", (index + 1) + ". " + item.title, item.content.slice(0, 1600), "Manba: " + (item.source || "ko‘rsatilmagan"));
  }
  lines.push("", "## Bajarish qadamlari");
  result.steps.forEach((step, index) => lines.push((index + 1) + ". " + step.title + ": " + step.action));
  lines.push("", "## Tekshiruv mezonlari");
  result.acceptanceCriteria.forEach(item => lines.push("- " + item));
  lines.push("", "## Offline mustaqil kashfiyot rejasi", result.offlineDiscovery.conclusion);
  result.offlineDiscovery.steps.forEach((step, index) => lines.push((index + 1) + ". " + step.action));
  lines.push("", "## Cheklovlar", result.limitations);
  return { analysis: result, output: lines.join("\n") };
}

module.exports = { analyze, runTask };
