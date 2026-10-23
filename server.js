const express = require("express");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const path = require("node:path");
const crypto = require("node:crypto");

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
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'"],
      manifestSrc: ["'self'"],
      workerSrc: ["'self'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      frameAncestors: ["'none'"]
    }
  }
}));
app.use(express.json({ limit: "20kb", strict: true, type: "application/json" }));
app.use("/api/", rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: "draft-8",
  legacyHeaders: false
}));


const ADMIN_ACCESS_CODE = process.env.ADMIN_ACCESS_CODE || "";
const ADMIN_SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || "";
const ADMIN_SESSION_TTL_MS = 8 * 60 * 60 * 1000;
function safeEqual(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}
function signAdminSession(payload) {
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", ADMIN_SESSION_SECRET).update(encoded).digest("base64url");
  return encoded + "." + signature;
}
function verifyAdminSession(token) {
  if (!token || !ADMIN_SESSION_SECRET) return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const expected = crypto.createHmac("sha256", ADMIN_SESSION_SECRET).update(parts[0]).digest("base64url");
  if (!safeEqual(parts[1], expected)) return false;
  try {
    const payload = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"));
    return payload.exp > Date.now() && payload.role === "admin";
  } catch (_) { return false; }
}
function requireAdmin(req, res, next) {
  const cookie = (req.headers.cookie || "").split(";").map(x => x.trim()).find(x => x.startsWith("ulugbek_admin="));
  const token = cookie ? decodeURIComponent(cookie.slice("ulugbek_admin=".length)) : "";
  if (!verifyAdminSession(token)) return res.status(401).json({ error: "Administrator sifatida qayta kiring." });
  next();
}
app.get("/api/admin/status", (req, res) => {
  const cookie = (req.headers.cookie || "").split(";").map(x => x.trim()).find(x => x.startsWith("ulugbek_admin="));
  const token = cookie ? decodeURIComponent(cookie.slice("ulugbek_admin=".length)) : "";
  res.json({ ok: true, authenticated: verifyAdminSession(token), configured: Boolean(ADMIN_ACCESS_CODE && ADMIN_SESSION_SECRET) });
});
app.post("/api/admin/login", rateLimit({ windowMs: 15 * 60 * 1000, limit: 8, standardHeaders: "draft-8", legacyHeaders: false }), (req, res) => {
  if (!ADMIN_ACCESS_CODE || !ADMIN_SESSION_SECRET) return res.status(503).json({ error: "Admin himoyasi sozlanmagan. Hosting muhitida ADMIN_ACCESS_CODE va ADMIN_SESSION_SECRET belgilang." });
  const code = typeof req.body?.code === "string" ? req.body.code : "";
  if (!safeEqual(code, ADMIN_ACCESS_CODE)) return res.status(401).json({ error: "Kirish kodi noto‘g‘ri." });
  const token = signAdminSession({ role: "admin", exp: Date.now() + ADMIN_SESSION_TTL_MS });
  res.setHeader("Set-Cookie", "ulugbek_admin=" + encodeURIComponent(token) + "; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=28800");
  res.json({ ok: true, expiresInSeconds: 28800 });
});
app.post("/api/admin/logout", (_req, res) => {
  res.setHeader("Set-Cookie", "ulugbek_admin=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0");
  res.json({ ok: true });
});
app.get("/api/admin/overview", requireAdmin, (_req, res) => {
  res.set("Cache-Control", "no-store");
  res.json({
    ok: true,
    app: "ULUGBEK AI",
    serverTime: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    nodeVersion: process.version,
    memory: { rssBytes: process.memoryUsage().rss, heapUsedBytes: process.memoryUsage().heapUsed },
    aiConfigured: Boolean(process.env.OPENAI_API_KEY),
    model: process.env.OPENAI_API_KEY ? (process.env.OPENAI_MODEL || "gpt-4o-mini") : null,
    adminAuth: "session-cookie",
    deployment: "manual-host-configuration-required"
  });
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, app: "ULUGBEK AI", version: "0.3.0", aiConfigured: Boolean(process.env.OPENAI_API_KEY) });
});

app.get("/api/diagnostics", (_req, res) => {
  res.json({
    ok: true,
    app: "ULUGBEK AI",
    backend: "running",
    ai: process.env.OPENAI_API_KEY ? "configured" : "demo-only-no-model-key",
    publicWebResearch: "available-through-lab-route-when-server-has-internet",
    knowledgeStorage: "server-local-json-files",
    voiceInput: "browser-dependent-and-user-permission-required",
    voiceOutput: "browser-dependent",
    autonomousAgents: "not-implemented-as-independent-background-services",
    automaticFailover: "not-configured-requires-authorized-backup-host",
    productionDatabase: "not-configured",
    note: "Bu diagnostika faqat konfiguratsiya holatini bildiradi; u tashqi xizmatlarni to‘liq end-to-end sinamaydi."
  });
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

app.post("/api/chat", async (req, res) => {
  const message = typeof req.body?.message === "string" ? req.body.message.trim() : "";
  if (!message) return res.status(400).json({ error: "Xabar bo‘sh bo‘lmasligi kerak." });
  if (message.length > MAX_TASK_LENGTH) return res.status(413).json({ error: "Xabar 4000 belgidan oshmasligi kerak." });
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.json({
      reply: "Xabaringiz qabul qilindi. Hozir ULUGBEK AI sinov rejimida; haqiqiy AI uchun serverda OPENAI_API_KEY sozlanishi kerak. Vazifangizni “Reja tuzish” orqali agent rejasiga aylantirishingiz mumkin.",
      mode: "demo",
      receivedCharacters: message.length
    });
  }
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
        messages: [
          { role: "system", content: "Sen ULUGBEK AI yordamchisisan. O‘zbek tilida sodda, aniq va foydali javob ber. Bilmagan narsangni to‘qima. Tashqi harakat bajarganingni da’vo qilma. Xavfli amallar uchun inson tasdig‘ini tavsiya qil." },
          { role: "user", content: message }
        ],
        temperature: 0.4
      })
    });
    if (!response.ok) throw new Error("AI provider error");
    const data = await response.json();
    const reply = data?.choices?.[0]?.message?.content;
    if (typeof reply !== "string" || !reply.trim()) throw new Error("Empty model response");
    return res.json({ reply: reply.slice(0, 12000), mode: "ai", receivedCharacters: message.length });
  } catch (_) {
    return res.status(502).json({ error: "AI xizmati hozir javob bermadi. Model sozlamalarini tekshiring." });
  } finally {
    clearTimeout(timeout);
  }
});

app.use("/api/lab", require("./lab"));

app.use(express.static(path.join(__dirname, "public"), {
  etag: true,
  maxAge: process.env.NODE_ENV === "production" ? "1h" : 0
}));
app.use((err, _req, res, _next) => {
  const status = Number(err.status || err.statusCode) || 500;
  if (status === 413) return res.status(413).json({ error: "So‘rov hajmi ruxsat etilgan chegaradan oshdi." });
  if (status === 400) return res.status(400).json({ error: "JSON so‘rovi noto‘g‘ri formatda." });
  console.error("Server xatosi:", err.message);
  return res.status(500).json({ error: "Ichki server xatosi." });
});
app.listen(PORT, "0.0.0.0", () => {
  console.log(`ULUGBEK AI serveri ${PORT}-portda ishga tushdi.`);
});
