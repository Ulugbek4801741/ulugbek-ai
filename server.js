const express = require("express");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const path = require("node:path");

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const MAX_TASK_LENGTH = 4000;

app.disable("x-powered-by");
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'"],
      manifestSrc: ["'self'"],
      workerSrc: ["'self'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      frameAncestors: ["'none'"]
    }
  }
}));
app.use(express.json({ limit: "20kb" }));
app.use("/api/", rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: "draft-8",
  legacyHeaders: false
}));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, app: "ULUGBEK AI", version: "0.3.0", aiConfigured: Boolean(process.env.OPENAI_API_KEY) });
});

function createPlan(task) {
  const lower = task.toLocaleLowerCase("uz");
  let title = "Umumiy vazifa";
  let roles = ["Core Coordinator", "Research Agent", "Builder Agent", "Verifier Agent"];
  if (/(ilova|sayt|veb|dastur|kod|no.?code|web.?app)/i.test(lower)) {
    title = "Ilova yaratish";
    roles = ["Core Coordinator", "Product Agent", "Builder Agent", "Verifier Agent"];
  } else if (/(biznes|savdo|do‘kon|dok.on|daromad|mijoz)/i.test(lower)) {
    title = "Biznes va mahsulot";
    roles = ["Core Coordinator", "Research Agent", "Business Agent", "Verifier Agent"];
  } else if (/(marketing|reklama|kontent|auditoriya)/i.test(lower)) {
    title = "Marketing";
    roles = ["Core Coordinator", "Research Agent", "Marketing Agent", "Verifier Agent"];
  } else if (/(o‘rgan|ta'lim|kurs|dars|til)/i.test(lower)) {
    title = "Ta'lim";
    roles = ["Core Coordinator", "Research Agent", "Education Agent", "Verifier Agent"];
  }
  return {
    title,
    steps: [
      { title: "Maqsad va natijani aniqlash", detail: "Kutilayotgan natija, cheklovlar va muvaffaqiyat mezonini belgilang.", role: roles[0] },
      { title: "Vazifani kichik qadamlarga ajratish", detail: "Kerakli ma’lumotlar va bajarish ketma-ketligini aniqlang.", role: roles[1] },
      { title: "Bajarish rejasini tayyorlash", detail: "Eng muhim ishni birinchi qo‘yib, resurslar va bog‘liqliklarni belgilang.", role: roles[2] },
      { title: "Natijani tekshirish", detail: "Xatolar, xavfsizlik, sifat va keyingi qadamlarni tekshiring.", role: roles[3] }
    ],
    note: "Bu reja tuzish MVPsi. Tashqi tizimlarda harakat, kodni ishga tushirish, pul sarflash yoki ma’lumot nashr etish uchun alohida vositalar, ruxsatlar va xavfsizlik nazorati zarur."
  };
}

app.post("/api/agent/plan", async (req, res) => {
  const task = typeof req.body?.task === "string" ? req.body.task.trim() : "";
  if (!task) return res.status(400).json({ error: "Vazifa matni bo‘sh bo‘lmasligi kerak." });
  if (task.length > MAX_TASK_LENGTH) return res.status(413).json({ error: "Vazifa 4000 belgidan oshmasligi kerak." });

  const fallback = createPlan(task);
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.json({ plan: fallback, mode: "rules", notice: "AI modeli ulanmagan; qoida asosidagi rejalashtirish ishlatildi." });

  const baseUrl = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);
  try {
    const response = await fetch(baseUrl + "/chat/completions", {
      method: "POST",
      headers: { "Authorization": "Bearer " + apiKey, "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        temperature: 0.2,
        messages: [
          { role: "system", content: "Sen ULUGBEK AI rejalashtiruvchi agentisan. Foydalanuvchi vazifasini o‘zbek tilida aniq va xavfsiz rejalashtir. Hech qachon ish bajarildi deb yolg‘on aytma. Tashqi internet, fayllar, hisoblar yoki pulga kirish imkoning yo‘q. Xavfli yoki qaytarib bo‘lmaydigan harakatlar uchun inson tasdig‘ini talab qil. Faqat JSON qaytar: {title:string,steps:[{title:string,detail:string,role:string}],note:string}. 3-6 ta qadam." },
          { role: "user", content: task }
        ],
        response_format: { type: "json_object" }
      })
    });
    if (!response.ok) throw new Error("AI provider error");
    const payload = await response.json();
    const content = payload?.choices?.[0]?.message?.content;
    const plan = JSON.parse(content);
    if (!plan || typeof plan.title !== "string" || !Array.isArray(plan.steps) || plan.steps.length < 1 || plan.steps.length > 8) throw new Error("Invalid plan schema");
    const safePlan = {
      title: plan.title.slice(0, 120),
      steps: plan.steps.map((step) => ({
        title: String(step.title || "Vazifa qadami").slice(0, 160),
        detail: String(step.detail || "").slice(0, 500),
        role: String(step.role || "Core Coordinator").slice(0, 80)
      })),
      note: String(plan.note || "Reja avtomatik tuzildi. Tashqi amallar alohida ruxsat va tekshiruvni talab qiladi.").slice(0, 800)
    };
    return res.json({ plan: safePlan, mode: "ai" });
  } catch (error) {
    return res.json({ plan: fallback, mode: "rules", notice: "AI xizmati hozir ishlamadi; xavfsiz zaxira reja ishlatildi." });
  } finally {
    clearTimeout(timeout);
  }
});

app.use(express.static(path.join(__dirname, "public"), {
  etag: true,
  maxAge: process.env.NODE_ENV === "production" ? "1h" : 0
}));
app.use((err, _req, res, _next) => {
  console.error("Server xatosi:", err.message);
  res.status(500).json({ error: "Ichki server xatosi." });
});
app.listen(PORT, "0.0.0.0", () => {
  console.log(`ULUGBEK AI serveri ${PORT}-portda ishga tushdi.`);
});
