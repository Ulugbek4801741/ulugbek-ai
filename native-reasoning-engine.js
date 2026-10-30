"use strict";
const cognition = require("./native-cognition");
const registry = require("./agents/registry");

// Deterministic symbolic planner. No hosted API, no downloaded weights.
// This is not a trained language model and does not generate arbitrary code.
const RULES = [
  { label: "Veb va interfeys", pattern: /sayt|veb|web|frontend|interfeys|html|css/i },
  { label: "Server va ma’lumotlar", pattern: /server|backend|api|database|node|express/i },
  { label: "Mobil ilova", pattern: /android|ios|telefon|mobil|apk/i },
  { label: "Xavfsizlik", pattern: /xavfsiz|himoya|parol|ruxsat|token|auth|security/i },
  { label: "AI va agentlar", pattern: /sun.?iy intellekt|model|o.?qit|fikrlash|agent/i },
  { label: "Biznes va mahsulot", pattern: /biznes|daromad|to.?lov|mijoz|marketing/i },
  { label: "Dasturlash", pattern: /kod|dastur|funksiya|bug|xato|test|build/i }
];
function analyze(prompt) {
  const text = String(prompt || "").trim();
  if (!text || text.length > 4000) throw new TypeError("Vazifa matni bo‘sh yoki juda uzun.");
  const concepts = cognition.concepts(text);
  const domains = RULES.filter(rule => rule.pattern.test(text)).map(rule => rule.label);
  const codeTask = /kod|dastur|funksiya|bug|xato|test|build|server|backend|frontend/i.test(text);
  const securityTask = /xavfsiz|himoya|parol|ruxsat|token|auth|security|deploy|server/i.test(text);
  const steps = [
    { title: "Vazifani tushunish", action: "Maqsad, kutilgan natija va cheklovlarni ajratish." },
    { title: "Dalil va bilim izlash", action: "Tasdiqlangan bilim bazasi va ruxsat etilgan ochiq manbalarni tekshirish." },
    { title: "Yechim rejasini tuzish", action: "Ishlarni kichik vazifalarga ajratish va bog‘liqliklarni belgilash." }
  ];
  if (codeTask) steps.push({ title: "Kod yechimini loyihalash", action: "Fayl yo‘llari va kod taklifini tayyorlash; avtomatik yozish o‘chiq." });
  if (securityTask) steps.push({ title: "Xavfsizlik tekshiruvi", action: "Ruxsatlar, maxfiy ma’lumotlar, tashqi aloqa va qaytarish rejasini tekshirish." });
  steps.push({ title: "Natijani tekshirish", action: "Qabul mezonlari va bajarilishi kerak bo‘lgan sinovlarni belgilash." });
  const criteria = [
    "Natija foydalanuvchi so‘ragan maqsadga mos bo‘lishi",
    "Taxminlar va noma’lum holatlar ochiq ko‘rsatilishi",
    "Bajarilmagan test bajarildi deb ko‘rsatilmasligi",
    "Tasdiqsiz fayl o‘zgartirish, tashqi yozuv yoki deploy bo‘lmasligi"
  ];
  if (codeTask) criteria.push("Kod sinov muhitida tekshirilmaguncha ishlab chiqarishga kiritilmasligi");
  const risks = [];
  if (codeTask) risks.push("Kod taklifi haqiqiy kompilyatsiya yoki test natijasi emas.");
  if (securityTask) risks.push("Maxfiy ma’lumotlar va ruxsatlarga tegadigan amallar inson tasdig‘ini talab qiladi.");
  if (!domains.length) risks.push("Vazifa mavzusi qoidalar orqali aniq tasniflanmadi.");
  return {
    engine: "ulugbek-native-rule-reasoner-v1",
    modelType: "deterministic-symbolic-planner",
    trainedLanguageModel: false,
    apiUsed: false,
    prompt: text,
    concepts, domains, steps, acceptanceCriteria: criteria, risks,
    limitations: "Bu tizim qoidalar, kalit so‘zlar va tasdiqlangan bilimlarni qidirishga asoslanadi. U mustaqil neyron til modeli emas va ChatGPT darajasidagi erkin kod generatsiyasini bajarmaydi."
  };
}
function runTask(prompt, role = "orchestrator") {
  const result = analyze(prompt);
  const aliases = { backend: "backend-agent", frontend: "frontend-agent", tester: "qa-agent", security: "security-agent", research: "research-agent", product: "product-growth-agent" };
  const selectedId = aliases[role] || role;
  const selectedAgents = role === "orchestrator" ? registry.listAgents() : registry.listAgents().filter(agent => agent.id === selectedId);
  if (!selectedAgents.length) throw new TypeError("Noma’lum agent roli: " + role);
  const agents = selectedAgents.map(agent => {
    const detail = registry.getAgent(agent.id);
    const instruction = detail.systemPrompt.split("\n").slice(-1)[0];
    return [
      "### " + agent.name + " — " + agent.specialty,
      "Vazifa: " + prompt,
      "Mahalliy tasnif: " + (result.domains.join(", ") || "umumiy vazifa"),
      "Yo‘riqnoma: " + instruction,
      "Holat: rol moduli umumiy qoidaviy rejaga tayandi; alohida neyron model ishlatmadi."
    ].join("\n");
  });
  const lines = [
    "# ULUGBEK AI — mahalliy fikrlash hisoboti",
    "",
    "Dvigatel: " + result.engine,
    "Tanlangan rol: " + role,
    "Tashqi API ishlatildi: yo‘q",
    "O‘qitilgan neyron til modeli: mavjud emas",
    "",
    "## Aniqlangan mavzular",
    result.domains.join(", ") || "Aniqlanmadi",
    "",
    "## Asosiy tushunchalar",
    result.concepts.join(", ") || "Yetarli tushuncha ajratilmadi",
    "",
    "## Bajarish rejasi"
  ];
  result.steps.forEach((step, i) => lines.push((i + 1) + ". " + step.title + ": " + step.action));
  lines.push("", "## Qabul mezonlari");
  result.acceptanceCriteria.forEach(item => lines.push("- " + item));
  lines.push("", "## Xavflar");
  result.risks.forEach(item => lines.push("- " + item));
  lines.push("- " + result.limitations, "", "## Agent rollari", agents.join("\n\n"));
  return { analysis: result, output: lines.join("\n") };
}
module.exports = { analyze, runTask };
