"use strict";

// Public capability catalogue. "planned" means no real device/tool integration exists yet.
const modules = [
  { id: "universal-coordinator", name: "Universal boshqaruvchi agent", status: "prototype", purpose: "Vazifani tahlil qilish, tegishli agentlarni tanlash va natijalarni birlashtirish.", capabilities: ["task-routing", "planning", "result-synthesis"], approvalRequired: true },
  { id: "phone-agent", name: "Telefon agenti", status: "planned", purpose: "Faqat foydalanuvchi bergan Android ruxsatlari doirasida ilovalar va qurilma amallarini bajarish.", capabilities: ["android-permissions", "accessibility-automation", "device-workflows"], approvalRequired: true },
  { id: "computer-agent", name: "Kompyuter agenti", status: "planned", purpose: "Ruxsat berilgan ish stoli, fayllar va dasturlarda vazifalarni bajarish.", capabilities: ["desktop-control", "file-workflows", "software-tools"], approvalRequired: true },
  { id: "internet-agent", name: "Internet tadqiqot agenti", status: "prototype", purpose: "Internetdagi manbalarni qidirish, solishtirish va manbali xulosa tayyorlash.", capabilities: ["web-research", "source-checking", "summarization"], approvalRequired: true },
  { id: "quantum-science-agent", name: "Kvant va murakkab hisoblash agenti", status: "planned", purpose: "Kvant hisoblash, simulyatsiya va ilmiy masalalarni mavjud vositalar bilan o‘rganish; haqiqiy kvant kompyuter mavjudligini da’vo qilmaydi.", capabilities: ["quantum-algorithms", "simulation", "scientific-computing"], approvalRequired: true },
  { id: "engineering-agent", name: "Muhandislik agenti", status: "planned", purpose: "Muhandislik hisoblari, loyihalash takliflari va tekshiriladigan texnik hujjatlarni tayyorlash.", capabilities: ["engineering-analysis", "design-proposals", "verification"], approvalRequired: true },
  { id: "company-operations-agent", name: "Kompaniya ish jarayonlari agenti", status: "planned", purpose: "Biznes jarayonlarini rejalash, hujjatlashtirish va ruxsat berilgan integratsiyalar orqali yordam berish.", capabilities: ["business-workflows", "documents", "reporting"], approvalRequired: true },
  { id: "safety-review-agent", name: "Mustaqil xavfsizlik tekshiruv agenti", status: "planned", purpose: "Vazifani xavf, ruxsat, dalillar va xatolar bo‘yicha tekshirish; noaniq yoki yuqori xavfli vazifani inson ko‘rigiga yuborish.", capabilities: ["risk-review", "permission-check", "evidence-review"], approvalRequired: true },
  { id: "human-approval-gate", name: "Inson tasdig‘i darvozasi", status: "planned", purpose: "Yuborish, o‘chirish, xarid, deploy, ruxsat o‘zgartirish va xavfli qarorlarni tasdiqsiz bajarmaslik.", capabilities: ["explicit-approval", "audit-trail", "deny-or-escalate"], approvalRequired: true },
  { id: "fallback-agent", name: "Boshqa agentlar bajara olmagan vazifalar agenti", status: "planned", purpose: "Bajarilmagan vazifani sababiga ko‘ra ajratish, boshqa yo‘l yoki mutaxassis taklif qilish va kerak bo‘lsa inson yordamiga yuborish.", capabilities: ["failure-analysis", "alternative-planning", "human-escalation"], approvalRequired: true },
  { id: "medical-safety-agent", name: "Tibbiy xavfsizlik nazoratchisi", status: "planned", purpose: "Tibbiy ma’lumotlarni tekshirish va mutaxassisga yordam berish; tashxis yoki jarrohlikni mustaqil bajarish uchun vakolat bermaydi.", capabilities: ["medical-evidence-review", "clinical-escalation"], approvalRequired: true }
];

function listModules() {
  return modules.map((item) => ({ ...item, capabilities: [...item.capabilities] }));
}

module.exports = { listModules };
