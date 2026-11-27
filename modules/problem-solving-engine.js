"use strict";

const MAX_PROBLEM_LENGTH = 4000;
const DOMAIN_RULES = [
  { name: "Dasturlash va texnologiya", pattern: /kod|dastur|ilova|sayt|server|api|xato|bug|deploy|database|ma'lumotlar bazasi/i },
  { name: "Biznes va moliya", pattern: /biznes|savdo|daromad|mijoz|narx|to'lov|marketing|foyda/i },
  { name: "Ta'lim va o'rganish", pattern: /o'rgan|ta'lim|dars|kurs|imtihon|til|matematika|fizika/i },
  { name: "Tadqiqot va ma'lumot", pattern: /tadqiq|izlan|manba|dalil|solishtir|tekshir|ma'lumot/i },
  { name: "Kundalik hayot", pattern: /reja|vaqt|safar|uy|ish|muammo|yordam/i }
];

const ACTION_RULES = [
  { name: "research", label: "Dalil va manbalarni izlash", pattern: /izla|tadqiq|manba|yangilik|hozirgi|so'nggi|qonun|narx|taqqos/i },
  { name: "build", label: "Yangi yechim yoki mahsulot yaratish", pattern: /yarat|qur|ishlab chiq|yozib ber|dastur|ilova|sayt|kod/i },
  { name: "debug", label: "Xatoni aniqlash va tuzatish", pattern: /xato|ishlamay|bug|tuzat|nosoz|error/i },
  { name: "explain", label: "Tushuntirish va o'rgatish", pattern: /tushuntir|o'rgat|qanday|nima uchun|izohla/i },
  { name: "compare", label: "Variantlarni solishtirish", pattern: /solishtir|taqqos|qaysi biri|farqi/i }
];

function analyzeProblem(input) {
  const problem = typeof input === "string" ? input.trim()
    : input && typeof input.problem === "string" ? input.problem.trim() : "";
  if (!problem) {
    const error = new TypeError("Muammo matni bo'sh bo'lmasligi kerak.");
    error.statusCode = 400;
    throw error;
  }
  if (problem.length > MAX_PROBLEM_LENGTH) {
    const error = new TypeError("Muammo matni 4000 belgidan oshmasligi kerak.");
    error.statusCode = 413;
    throw error;
  }

  const domains = DOMAIN_RULES.filter(rule => rule.pattern.test(problem)).map(rule => rule.name);
  const actions = ACTION_RULES.filter(rule => rule.pattern.test(problem)).map(rule => rule.name);
  const codeTask = /kod|dastur|ilova|sayt|server|api|bug|xato|deploy/i.test(problem);
  const externalAction = /yubor|jo'nat|o'chir|to'la|sotib ol|pul o'tkaz|nashr qil|deploy|production/i.test(problem);
  const needsCurrentEvidence = /hozirgi|bugun|so'nggi|yangilangan|narx|qonun|ob-havo|jadval/i.test(problem);

  const steps = [
    { id: "understand", title: "Muammoni aniqlash", action: "Maqsad, hozirgi holat va kutilayotgan natijani ajratish.", completion: "Muammo va maqsad aniq yozilgan" },
    { id: "diagnose", title: "Asl sababni tahlil qilish", action: "Alomatlarni sababdan ajratish; yetishmayotgan ma'lumot va cheklovlarni belgilash.", completion: "Asosiy sabablar va noma'lumlar qayd etilgan" },
    { id: "discover", title: "Mavjud yechimlarni izlash", action: needsCurrentEvidence ? "Yangilanishi mumkin bo'lgan faktlarni ishonchli, ochiq manbalardan tekshirish." : "Mavjud bilim, hujjat, vosita va tajribalarni ko'rib chiqish.", completion: "Variantlar va dalillar baholangan" },
    { id: "design", title: "Yechimni tanlash yoki yaratish", action: "Mavjud yechim mos bo'lmasa, yangi usul, algoritm, reja yoki mahsulot loyihasini ishlab chiqish.", completion: "Tanlangan yechim va uning sababi hujjatlashtirilgan" },
    { id: "implement", title: "Amalga oshirish", action: codeTask ? "O'zgarishlarni alohida sinov muhitida tayyorlash; ishlab chiqarish tizimiga ruxsatsiz tegmaslik." : "Yechimni kichik, tekshiriladigan qadamlarda bajarish.", completion: "Bajarilgan ishlar va bajarilmagan ishlar ajratilgan" },
    { id: "verify", title: "Sinash va tekshirish", action: "Qabul mezonlari, xavfsizlik, manbalar va real natijani tekshirish; xato bo'lsa qayta tuzatish.", completion: "Tekshiruv natijalari dalil bilan qayd etilgan" },
    { id: "deliver", title: "Natijani topshirish", action: "Natija, cheklovlar, qolgan ishlar va keyingi amaliy qadamlarni foydalanuvchiga tushuntirish.", completion: "Foydalanuvchi natijani tushunadi va undan foydalana oladi" }
  ];

  const acceptanceCriteria = [
    "Yechim foydalanuvchining asl maqsadiga mos bo'lishi kerak.",
    "Muhim faktlar ishonchli dalil yoki aniq noaniqlik belgisi bilan berilishi kerak.",
    "Sinov bajarilmagan bo'lsa, natija sinovdan o'tgan deb ko'rsatilmaydi.",
    "Tashqi ta'sir, ma'lumot o'chirish, pul sarflash, nashr qilish yoki production deploy uchun alohida ruxsat olinadi.",
    "Yechim ishlamasa, sabab va muqobil yo'l ochiq ko'rsatiladi."
  ];

  return {
    engine: "ulugbek-problem-solving-v1",
    principle: "Muammoni hal qilishga intil; tayyor yechim bo'lmasa, yangisini yarat; sinab ko'r, tuzat va natijani tekshir.",
    agentCount: 1,
    agentName: "ULUGBEK Universal Agent",
    problem,
    domains: domains.length ? domains : ["Umumiy muammo"],
    requestedCapabilities: actions.length ? actions : ["analyze", "solve"],
    flags: { codeTask, needsCurrentEvidence, externalAction },
    workflow: steps,
    acceptanceCriteria,
    executionPolicy: {
      planning: "enabled",
      research: "requires real source access and source verification",
      codeExecution: "isolated sandbox only when configured",
      externalWrites: "disabled by default; explicit scoped approval required",
      productionDeploy: "disabled by default; explicit approval and deployment checks required"
    },
    honestStatus: "Bu endpoint muammoni tahlil qiladi va bajarish rejasini tuzadi. U o'z-o'zidan internet qidiruvi, kod bajarish, fayl o'zgartirish yoki deploy bajarmaydi."
  };
}

function status() {
  return {
    ready: true,
    engine: "ulugbek-problem-solving-v1",
    agentCount: 1,
    stages: ["understand", "diagnose", "discover", "design", "implement", "verify", "deliver"],
    autonomousExternalActions: false,
    requiresHumanApprovalForExternalEffects: true
  };
}

module.exports = { analyzeProblem, status };
