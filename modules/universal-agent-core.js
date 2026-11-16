"use strict";

const CAPABILITIES = [
  { id: "research", label: "Ochiq manbalarni tadqiq qilish", mode: "read-only", enabled: true },
  { id: "coding", label: "Kod yozish va test rejasini tuzish", mode: "proposal-and-test-plan", enabled: true },
  { id: "documents", label: "Hujjat va tarjima tayyorlash", mode: "draft", enabled: true },
  { id: "business", label: "Biznes tahlili va hisob-kitob", mode: "analysis", enabled: true },
  { id: "planning", label: "Vazifalarni rejalashtirish", mode: "planning", enabled: true },
  { id: "server", label: "Server diagnostikasi", mode: "read-only-unless-approved", enabled: true },
  { id: "external-actions", label: "Tashqi tizimlarda amal bajarish", mode: "disabled-until-scoped-adapter-and-approval", enabled: false }
];

const HIGH_IMPACT_PATTERNS = [
  /(?:o.chir|delete|remove|format|wipe).{0,50}(?:fayl|file|database|ma.lumot|server|repo)/iu,
  /(?:pul|to.lov|payment|purchase|buy|subscription|transfer|withdraw)/iu,
  /(?:yubor|send|publish|post|broadcast).{0,50}(?:mijoz|user|telegram|email|internet|public|ommaviy)/iu,
  /(?:deploy|production|prod|server sozlama|environment variable|secret|token)/iu,
  /(?:akkaunt|account|parol|password|permission|access|ruxsat).{0,50}(?:o.zgart|change|reset|create|delete)/iu
];

const UNLAWFUL_PATTERNS = [
  /(?:birovning|begona).{0,35}(?:akkaunt|hisob|parol|telefon|fayl).{0,35}(?:buz|och|o.g.ir|kir|egalla)/iu,
  /(?:phishing|fishing|ransomware|keylogger|credential theft|carding)/iu,
  /(?:virus|malware|zararli dastur).{0,50}(?:yarat|tarqat|yashir|yuqtir)/iu,
  /(?:soxta|qalbaki).{0,35}(?:hujjat|pasport|diplom|imzo|to.lov cheki)/iu,
  /(?:kuzat|spy|stalk).{0,45}(?:ruxsatsiz|yashirin|birovni)/iu
];

function cleanTask(value) {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, 4000);
}

function classifyTask(task) {
  const value = task.toLocaleLowerCase("uz");
  if (/(?:kod|dastur|program|bug|xato|github|repo|android|apk|sayt|web.?app)/iu.test(value)) return "coding";
  if (/(?:qidir|tadqiq|manba|internet|ma.lumot top|vakans|ish top)/iu.test(value)) return "research";
  if (/(?:tarjima|hujjat|pdf|word|excel|hisobot|xat yoz)/iu.test(value)) return "documents";
  if (/(?:biznes|savdo|foyda|xarajat|marketing|mijoz)/iu.test(value)) return "business";
  if (/(?:server|render|deploy|log|health|diagnostika)/iu.test(value)) return "server";
  return "planning";
}

function assessRisk(task) {
  if (UNLAWFUL_PATTERNS.some(pattern => pattern.test(task))) {
    return { level: "blocked", approvalRequired: false, reason: "potentially-unlawful-or-harmful" };
  }
  if (HIGH_IMPACT_PATTERNS.some(pattern => pattern.test(task))) {
    return { level: "high", approvalRequired: true, reason: "external-or-irreversible-effect" };
  }
  return { level: "low", approvalRequired: false, reason: "read-only-or-reversible-work" };
}

function buildSteps(category, risk) {
  const common = [
    { id: "understand", title: "Talabni aniqlash", detail: "Maqsad, kutilgan natija, cheklovlar va muvaffaqiyat mezonini belgilash." },
    { id: "prepare", title: "Ish rejasini tayyorlash", detail: "Vazifani kichik bosqichlarga ajratish va mos vositalarni tanlash." }
  ];
  const specialist = {
    research: { id: "research", title: "Ochiq manbalarni tekshirish", detail: "Birlamchi va ishonchli manbalarni topish, sanasi va dalillarini solishtirish." },
    coding: { id: "build", title: "Kod va testlarni tayyorlash", detail: "Kichik o‘zgarish kiritish, statik tekshiruv va avtomatik testlarni bajarish." },
    documents: { id: "draft", title: "Hujjat loyihasini tayyorlash", detail: "Talab qilingan formatda tayyorlash, imlo va mazmunni tekshirish." },
    business: { id: "analyze", title: "Hisob-kitob va tahlil", detail: "Taxminlarni ajratish, xarajat/foyda va xavflarni hisoblash." },
    server: { id: "diagnose", title: "Diagnostika", detail: "Health, log, konfiguratsiya va resurs holatini avval o‘qish rejimida tekshirish." },
    planning: { id: "work", title: "Vazifani bajarishga tayyorlash", detail: "Mavjud imkoniyatlar doirasida natija tayyorlash." }
  };
  return [
    ...common,
    specialist[category],
    ...(risk.approvalRequired ? [{ id: "approval", title: "Inson tasdig‘ini kutish", detail: "Tashqi yoki qaytarib bo‘lmaydigan amal bajarilishidan oldin aniq tasdiq olish." }] : []),
    { id: "verify", title: "Natijani tekshirish", detail: "Testlar, manbalar, sifat va xavfsizlik mezonlari bo‘yicha tekshirish." },
    { id: "report", title: "Hisobot topshirish", detail: "Bajarilgan, bajarilmagan va tekshirilmagan qismlarni alohida ko‘rsatish." }
  ];
}

function createTaskPlan(input) {
  const task = cleanTask(input);
  if (!task) {
    const error = new Error("Vazifa matni bo‘sh bo‘lmasligi kerak.");
    error.statusCode = 400;
    throw error;
  }
  const category = classifyTask(task);
  const risk = assessRisk(task);
  const blocked = risk.level === "blocked";
  return {
    id: "uat_" + require("node:crypto").randomUUID().replace(/-/g, "").slice(0, 16),
    task,
    category,
    status: blocked ? "blocked" : risk.approvalRequired ? "awaiting-human-approval" : "planned",
    risk,
    steps: blocked ? [] : buildSteps(category, risk),
    suggestedTools: category === "research" ? ["public-web-search", "source-reader"] :
      category === "coding" ? ["repository-reader", "isolated-test-runner", "diff-review"] :
      category === "server" ? ["health-check", "read-only-logs"] :
      category === "documents" ? ["document-generator", "spell-check"] :
      category === "business" ? ["calculator", "spreadsheet-analysis"] : ["task-planner"],
    execution: {
      enabled: false,
      reason: blocked ? "Vazifa xavfsizlik siyosati bo‘yicha bloklandi." :
        risk.approvalRequired ? "Tashqi amal uchun alohida ruxsat va mos adapter talab qilinadi." :
        "Hozirgi core reja tuzadi; real bajarish faqat mavjud va ruxsat berilgan vosita orqali amalga oshadi."
    },
    verificationCriteria: [
      "Natija foydalanuvchi talabiga mos bo‘lishi",
      "Manba yoki test dalili mavjud bo‘lishi",
      "Maxfiy ma’lumotlar oshkor qilinmasligi",
      "Bajarilmagan ish bajarildi deb ko‘rsatilmasligi"
    ],
    createdAt: new Date().toISOString()
  };
}

function getStatus() {
  return {
    ready: true,
    version: "1.0.0",
    architecture: "single-universal-agent",
    planning: true,
    riskAssessment: true,
    humanApprovalGate: true,
    resultVerification: true,
    arbitraryShellExecution: false,
    autonomousExternalActions: false,
    capabilities: CAPABILITIES
  };
}

module.exports = { cleanTask, classifyTask, assessRisk, createTaskPlan, getStatus, CAPABILITIES };
