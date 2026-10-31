const express = require("express");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const path = require("node:path");
const crypto = require("node:crypto");
const agentRuntime = require("./agent-runtime");
const developerAgent = require("./developer-agent");
const agentPermissions = require("./agent-permissions");
const learningWorkerForAdmin = require("./lab-learning-worker");
const { createAdminAutopilot } = require("./admin-autopilot");
const adminAutopilot = createAdminAutopilot({ developerAgent, learningWorker: learningWorkerForAdmin, agentRuntime });

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const MAX_TASK_LENGTH = 4000;

app.disable("x-powered-by");
// Always allow the official GitHub Pages origin. Hosting variables are additional allowed origins,
// not overrides, so an outdated FRONTEND_ORIGIN value cannot silently break the public website.
const FRONTEND_ORIGINS = new Set([
  "https://ulugbek4801741.github.io",
  ...(process.env.FRONTEND_ORIGIN || "").split(",").map(value => value.trim().replace(/\/$/, "")).filter(Boolean)
]);
const FRONTEND_ORIGIN = [...FRONTEND_ORIGINS][0];
app.use((req, res, next) => {
  const origin = req.headers.origin || "";
  if (origin && FRONTEND_ORIGINS.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  }
  if (req.method === "OPTIONS") {
    if (origin && FRONTEND_ORIGINS.has(origin)) return res.status(204).end();
    return res.status(403).end();
  }
  next();
});
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'", ...(FRONTEND_ORIGIN ? [FRONTEND_ORIGIN] : [])],
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
const chatRateLimit = rateLimit({
  windowMs: 60 * 1000, limit: 8, standardHeaders: "draft-8", legacyHeaders: false,
  message: { error: "Chat so‘rovlari vaqtinchalik chegaraga yetdi. Bir daqiqadan keyin qayta urinib ko‘ring." }
});
const plannerRateLimit = rateLimit({
  windowMs: 60 * 1000, limit: 10, standardHeaders: "draft-8", legacyHeaders: false,
  message: { error: "Reja so‘rovlari vaqtinchalik chegaraga yetdi. Bir daqiqadan keyin qayta urinib ko‘ring." }
});


const ADMIN_GOOGLE_EMAIL = (process.env.ADMIN_GOOGLE_EMAIL || "").trim().toLowerCase();
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";
const PUBLIC_BASE_URL = (process.env.PUBLIC_BASE_URL || "").replace(/\/$/, "");
const ADMIN_SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || "";
const ADMIN_SESSION_TTL_MS = 8 * 60 * 60 * 1000;
function safeEqual(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}
const revokedAdminSessions = new Set();
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
    return payload.exp > Date.now() && payload.role === "admin" && typeof payload.jti === "string" && !revokedAdminSessions.has(payload.jti);
  } catch (_) { return false; }
}
function requireAdmin(req, res, next) {
  const cookie = (req.headers.cookie || "").split(";").map(x => x.trim()).find(x => x.startsWith("ulugbek_admin="));
  const token = cookie ? decodeURIComponent(cookie.slice("ulugbek_admin=".length)) : "";
  if (!verifyAdminSession(token)) return res.status(401).json({ error: "Administrator sifatida qayta kiring." });
  next();
}
function readCookie(req, name) {
  const item = (req.headers.cookie || "").split(";").map(x => x.trim()).find(x => x.startsWith(name + "="));
  if (!item) return "";
  try { return decodeURIComponent(item.slice(name.length + 1)); } catch (_) { return ""; }
}
function googleOAuthReady() {
  return Boolean(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET && ADMIN_GOOGLE_EMAIL && PUBLIC_BASE_URL.startsWith("https://") && ADMIN_SESSION_SECRET);
}
app.get("/api/auth/google", (req, res) => {
  if (!googleOAuthReady()) return res.status(503).send("Google kirishi sozlanmagan. Hostingda GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, ADMIN_GOOGLE_EMAIL, ADMIN_SESSION_SECRET va PUBLIC_BASE_URL sozlang.");
  const state = crypto.randomBytes(32).toString("base64url");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Set-Cookie", "ulugbek_oauth_state=" + state + "; HttpOnly; Secure; SameSite=Lax; Path=/api/auth/google/callback; Max-Age=600");
  const callback = PUBLIC_BASE_URL + "/api/auth/google/callback";
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", GOOGLE_CLIENT_ID);
  url.searchParams.set("redirect_uri", callback);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state);
  url.searchParams.set("prompt", "select_account");
  res.redirect(302, url.toString());
});
app.get("/api/auth/google/callback", async (req, res) => {
  if (!googleOAuthReady()) return res.status(503).send("Google kirishi sozlanmagan.");
  const stateCookie = readCookie(req, "ulugbek_oauth_state");
  res.setHeader("Set-Cookie", "ulugbek_oauth_state=; HttpOnly; Secure; SameSite=Lax; Path=/api/auth/google/callback; Max-Age=0");
  if (!req.query.code || typeof req.query.code !== "string" || !req.query.state || typeof req.query.state !== "string" || !stateCookie || !safeEqual(req.query.state, stateCookie)) {
    return res.status(400).send("Google kirish tasdig‘i yaroqsiz yoki muddati tugagan. Qayta urinib ko‘ring.");
  }
  try {
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ code: req.query.code, client_id: GOOGLE_CLIENT_ID, client_secret: GOOGLE_CLIENT_SECRET, redirect_uri: PUBLIC_BASE_URL + "/api/auth/google/callback", grant_type: "authorization_code" }),
      signal: AbortSignal.timeout(10000)
    });
    if (!tokenResponse.ok) return res.status(401).send("Google kirishini tasdiqlab bo‘lmadi. OAuth sozlamalarini tekshiring.");
    const tokenData = await tokenResponse.json();
    if (typeof tokenData.access_token !== "string") return res.status(401).send("Google kirish tokeni olinmadi.");
    const profileResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", { headers: { Authorization: "Bearer " + tokenData.access_token }, signal: AbortSignal.timeout(10000) });
    if (!profileResponse.ok) return res.status(401).send("Google hisob ma’lumotlarini tekshirib bo‘lmadi.");
    const profile = await profileResponse.json();
    const email = typeof profile.email === "string" ? profile.email.trim().toLowerCase() : "";
    if (profile.email_verified !== true || !email || email !== ADMIN_GOOGLE_EMAIL) return res.status(403).send("Bu Google hisobi administrator sifatida ruxsat etilmagan.");
    const token = signAdminSession({ role: "admin", email, jti: crypto.randomUUID(), exp: Date.now() + ADMIN_SESSION_TTL_MS });
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Set-Cookie", "ulugbek_admin=" + encodeURIComponent(token) + "; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=28800");
    return res.redirect(303, "/admin.html");
  } catch (_) { return res.status(502).send("Google kirish serverida xatolik yuz berdi. Birozdan so‘ng qayta urinib ko‘ring."); }
});
app.get("/api/admin/status", (req, res) => {
  const cookie = (req.headers.cookie || "").split(";").map(x => x.trim()).find(x => x.startsWith("ulugbek_admin="));
  const token = cookie ? decodeURIComponent(cookie.slice("ulugbek_admin=".length)) : "";
  res.json({ ok: true, authenticated: verifyAdminSession(token), configured: googleOAuthReady() });
});
app.post("/api/admin/logout", (req, res) => {
  const cookie = (req.headers.cookie || "").split(";").map(x => x.trim()).find(x => x.startsWith("ulugbek_admin="));
  const token = cookie ? decodeURIComponent(cookie.slice("ulugbek_admin=".length)) : "";
  try { const payload = JSON.parse(Buffer.from(token.split(".")[0] || "", "base64url").toString("utf8")); if (payload.jti) revokedAdminSessions.add(payload.jti); } catch (_) {}
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
    aiConfigured: false,
    nativeReasoningReady: true,
    trainedLanguageModelReady: false,
    externalAiApiEnabled: false,
    model: null,
    cognition: "native-rule-based-reasoning",
    agentWorker: "single-process-queue",
    queuedTasks: agentRuntime.listTasks().filter(task => task.status === "queued").length,
    runningTasks: agentRuntime.listTasks().filter(task => task.status === "running").length,
    adminAuth: "google-oauth-allowlist",
    adminEmail: (() => { const token = readCookie(_req, "ulugbek_admin"); try { return JSON.parse(Buffer.from(token.split(".")[0], "base64url").toString("utf8")).email || null; } catch (_) { return null; } })(),
    deployment: "manual-host-configuration-required"
  });
});

app.get("/api/admin/autopilot/status", requireAdmin, (_req, res) => {
  res.set("Cache-Control", "no-store");
  res.json({ ok: true, autopilot: adminAutopilot.status() });
});
app.post("/api/admin/autopilot/check", requireAdmin, async (_req, res) => {
  const status = await adminAutopilot.checkOnce();
  res.set("Cache-Control", "no-store");
  res.json({ ok: true, autopilot: status });
});
app.post("/api/admin/autopilot/recover", requireAdmin, async (_req, res) => {
  const status = await adminAutopilot.recover();
  res.set("Cache-Control", "no-store");
  res.json({ ok: true, autopilot: status, note: "Faqat cheklangan, read-only workerlar qayta ishga tushiriladi." });
});
app.post("/api/admin/autopilot/stop", requireAdmin, async (_req, res) => {
  const status = await adminAutopilot.stop();
  res.set("Cache-Control", "no-store");
  res.json({ ok: true, autopilot: status });
});

app.get("/api/admin/safety/status", requireAdmin, (_req, res) => {
  res.set("Cache-Control", "no-store");
  res.json({ ok: true, shield: globalSafetyShield.getStatus(), quarantines: globalSafetyShield.listQuarantines() });
});
app.get("/api/admin/safety/events", requireAdmin, (req, res) => {
  res.set("Cache-Control", "no-store");
  const limit = Number.parseInt(req.query.limit, 10);
  res.json({ ok: true, events: globalSafetyShield.listEvents(Number.isFinite(limit) ? limit : 100) });
});
app.post("/api/admin/safety/quarantines/:hash/release", requireAdmin, (req, res) => {
  try {
    const result = globalSafetyShield.releaseQuarantine(req.params.hash, String(req.body?.reason || "admin_review").slice(0, 80));
    globalSafetyShield.auditAdminAction("release_quarantine", req.params.hash);
    res.set("Cache-Control", "no-store");
    res.json({ ok: true, result });
  } catch (error) {
    res.status(error.status || 400).json({ error: error.message || "Karantin holati o‘zgartirilmadi." });
  }
});

app.get("/api/admin/agent-permissions", requireAdmin, async (_req, res) => {
  try {
    await agentPermissions.load();
    res.set("Cache-Control", "no-store");
    res.json({ ok: true, policy: agentPermissions.snapshot() });
  } catch (error) {
    res.status(500).json({ error: "Ruxsatlar siyosatini o‘qib bo‘lmadi." });
  }
});
app.put("/api/admin/agent-permissions", requireAdmin, async (req, res) => {
  try {
    const token = readCookie(req, "ulugbek_admin");
    let email = "admin";
    try { email = JSON.parse(Buffer.from(token.split(".")[0], "base64url").toString("utf8")).email || email; } catch (_) {}
    const policy = await agentPermissions.update(req.body?.capabilities, email);
    res.set("Cache-Control", "no-store");
    res.json({ ok: true, policy });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message || "Ruxsatlar saqlanmadi." });
  }
});

app.get("/api/admin/developer-agent/status", requireAdmin, (_req, res) => {
  res.set("Cache-Control", "no-store");
  res.json({ ok: true, agent: developerAgent.status() });
});
app.post("/api/admin/developer-agent/run", requireAdmin, async (_req, res) => {
  const agent = await developerAgent.auditOnce();
  res.set("Cache-Control", "no-store");
  res.json({ ok: true, agent });
});
app.get("/api/admin/developer-agent/proposals", requireAdmin, (_req, res) => {
  res.set("Cache-Control", "no-store");
  res.json({ ok: true, proposals: developerAgent.listProposals() });
});
app.post("/api/admin/developer-agent/proposals/:id/review", requireAdmin, (req, res) => {
  try {
    const proposal = developerAgent.reviewProposal(req.params.id, req.body?.decision, req.body?.note);
    if (!proposal) return res.status(404).json({ error: "Taklif topilmadi." });
    res.set("Cache-Control", "no-store");
    return res.json({ ok: true, proposal, note: "Tasdiqlash taklifni chiqarishga ruxsat beradi, lekin kodni avtomatik o‘zgartirmaydi yoki deploy qilmaydi." });
  } catch (error) {
    return res.status(error.status || 500).json({ error: error.message || "Taklif holati saqlanmadi." });
  }
});

app.get("/api/admin/tasks", requireAdmin, (_req, res) => {
  res.set("Cache-Control", "no-store");
  res.json({ ok: true, tasks: agentRuntime.listTasks() });
});
app.post("/api/admin/tasks", requireAdmin, async (req, res) => {
  try {
    const task = await agentRuntime.createTask({ prompt: req.body?.prompt, role: req.body?.role });
    res.status(202).set("Cache-Control", "no-store").json({ ok: true, task });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message || "Vazifa qo‘shilmadi." });
  }
});
app.get("/api/admin/tasks/:id", requireAdmin, (req, res) => {
  const task = agentRuntime.getTask(req.params.id);
  if (!task) return res.status(404).json({ error: "Vazifa topilmadi." });
  res.set("Cache-Control", "no-store");
  res.json({ ok: true, task });
});
app.post("/api/admin/tasks/:id/cancel", requireAdmin, (req, res) => {
  try {
    const task = agentRuntime.cancelTask(req.params.id);
    if (!task) return res.status(404).json({ error: "Vazifa topilmadi." });
    res.json({ ok: true, task });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message || "Vazifa bekor qilinmadi." });
  }
});
app.post("/api/admin/tasks/:id/review", requireAdmin, (req, res) => {
  try {
    const task = agentRuntime.reviewTask(req.params.id, req.body?.decision);
    if (!task) return res.status(404).json({ error: "Vazifa topilmadi." });
    res.json({ ok: true, task });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message || "Qaror saqlanmadi." });
  }
});

app.get("/api/health", (_req, res) => {
  res.set("Cache-Control", "no-store");
  res.json({
    ok: true,
    app: "ULUGBEK AI",
    version: "0.3.1",
    processUptimeSeconds: Math.floor(process.uptime()),
    aiConfigured: false,
    nativeReasoningReady: true,
    trainedLanguageModelReady: false,
    externalAiApiEnabled: false,
    mode: "native-rule-based-reasoning",
    storageMode: "local-json",
    workerConcurrency: 1,
    multiInstanceSafe: false,
    automaticFailoverReady: false
  });
});

app.get("/api/diagnostics", (_req, res) => {
  res.set("Cache-Control", "no-store");
  res.json({
    ok: true,
    app: "ULUGBEK AI",
    backend: "running",
    ai: "native-symbolic-no-external-ai",
    publicWebResearch: "available-through-lab-route-when-server-has-internet",
    knowledgeStorage: "server-local-json-files",
    agentMemory: "separate-per-agent-per-browser-session; JSON file; durable hosting storage must be configured",
    voiceInput: "browser-dependent-and-user-permission-required",
    voiceOutput: "browser-dependent",
    autonomousAgents: "one continuous read-only Developer Agent; process-and-host-dependent 24/7 loop",
    developerAgent: developerAgent.status(),
    automaticFailover: "not-configured-requires-authorized-backup-host",
    productionDatabase: "not-configured-task-store-uses-local-json-file",
    agentExecution: "native rule-based task planner plus registered role modules; no hosted model API, no trained language model, no source writes or deploy",
    nativeReasoning: "ulugbek-native-rule-reasoner-v1; deterministic symbolic planning; not a trained neural language model",
    externalAiApiEnabled: false,
    trainedLanguageModelReady: false,
    note: "Agent navbati server jarayoni ishlayotganida bajariladi. Hosting qayta ishga tushsa yoki uxlab qolsa 24/7 kafolatlanmaydi. JSON saqlash vaqtinchalik; doimiy ishlab chiqarish uchun PostgreSQL/Redis va alohida worker kerak. Bu diagnostika end-to-end sinov o‘rnini bosmaydi."
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

const appIntegrationPolicy = require("./modules/app-integration-policy");

app.get("/api/integrations/app-stores", (_req, res) => {
  res.set("Cache-Control", "no-store");
  res.json(appIntegrationPolicy.getIntegrationCatalog());
});

const capabilityCatalog = require("./modules/catalog");
const workflowGate = require("./modules/workflow-gate");
const securityPolicy = require("./modules/security-policy");
const globalSafetyShield = require("./modules/global-safety-shield");

app.get("/api/security/policy", (_req, res) => {
  res.set("Cache-Control", "no-store");
  res.json({ ok: true, product: "ULUGBEK AI", policy: securityPolicy.getSecurityPolicy() });
});

app.get("/api/workflows/policy", (_req, res) => {
  res.set("Cache-Control", "no-store");
  res.json({ ok: true, policy: workflowGate.getWorkflowPolicy() });
});

app.post("/api/workflows", (req, res) => {
  const task = typeof req.body?.task === "string" ? req.body.task.trim() : "";
  if (!task) return res.status(400).json({ error: "Vazifa matni bo‘sh bo‘lmasligi kerak." });
  if (task.length > MAX_TASK_LENGTH) return res.status(413).json({ error: "Vazifa 4000 belgidan oshmasligi kerak." });
  const action = typeof req.body?.action === "string" ? req.body.action.trim().slice(0, 80) : "";
  try {
    const workflow = workflowGate.createWorkflow(task, {
      action,
      externalEffect: req.body?.externalEffect === true
    });
    res.status(201).set("Cache-Control", "no-store").json({
      ok: true,
      workflow,
      execution: "disabled",
      note: "Bu endpoint xavfsiz reja yaratadi. U tashqi amalni bajarmaydi."
    });
  } catch (error) {
    res.status(400).json({ error: "Workflow yaratilmadi: " + (error.message || "noto‘g‘ri so‘rov.") });
  }
});

app.get("/api/modules", (_req, res) => {
  res.set("Cache-Control", "no-store");
  res.json({ ok: true, product: "ULUGBEK AI", note: "planned modullar hali ishlaydigan integratsiya emas.", modules: capabilityCatalog.listModules() });
});

app.post("/api/agent/plan", plannerRateLimit, async (req, res) => {
  const task = typeof req.body?.task === "string" ? req.body.task.trim() : "";
  if (!task) return res.status(400).json({ error: "Vazifa matni bo‘sh bo‘lmasligi kerak." });
  if (task.length > MAX_TASK_LENGTH) return res.status(413).json({ error: "Vazifa 4000 belgidan oshmasligi kerak." });

  return res.json({ plan: createPlan(task), mode: "native-rules", notice: "Reja tashqi AI modelisiz, mahalliy qoidalar asosida tuzildi." });
});

app.post("/api/chat", chatRateLimit, async (req, res) => {
  const message = typeof req.body?.message === "string" ? req.body.message.trim() : "";
  const suppliedSessionId = typeof req.body?.sessionId === "string" ? req.body.sessionId : "";
  const sessionId = /^[a-zA-Z0-9_-]{8,80}$/.test(suppliedSessionId) ? suppliedSessionId : crypto.randomUUID().replace(/-/g, "");
  res.set("Cache-Control", "no-store");
  if (!message) return res.status(400).json({ error: "Xabar bo‘sh bo‘lmasligi kerak." });
  if (message.length > MAX_TASK_LENGTH) return res.status(413).json({ error: "Xabar 4000 belgidan oshmasligi kerak." });
  const inputSafety = require("./modules/input-safety").inspectUserMessage(message);
  const shieldDecision = globalSafetyShield.inspectChat({ message, sessionId, ip: req.ip, inputSafety });
  if (!shieldDecision.allowed) {
    return res.status(400).set("Cache-Control", "no-store").json({
      error: shieldDecision.message || inputSafety.message,
      safety: { blocked: true, category: shieldDecision.reason, quarantined: shieldDecision.quarantined === true }
    });
  }
  // Native-only chat mode: never call hosted/open-weight AI providers.
  try {
    const nativeBrain = require("./lab-learning-worker");
    const learned = await nativeBrain.searchKnowledge(message, 5);
    const result = nativeBrain.buildLocalReply(message, learned);
    return res.json({
      reply: result.reply,
      mode: "native-symbolic-no-external-ai",
      agents: ["NativeResearch", "NativeReasoner"],
      reasoning: result.reasoning,
      knowledgeUsed: learned.length,
      learning: nativeBrain.status(),
      receivedCharacters: message.length
    });
  } catch (error) {
    return res.status(503).json({
      error: "Mahalliy mantiqiy mexanizm ishlamadi; tashqi AI xizmatiga avtomatik o‘tilmadi.",
      mode: "native-only-error"
    });
  }

});

app.use("/api/lab", require("./lab"));
const learningWorker = require("./lab-learning-worker");
app.get("/api/lab/learning/status", (_req, res) => {
  res.set("Cache-Control", "no-store");
  res.json({ ok:true, learning:learningWorker.status() });
});

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
learningWorker.start();
agentRuntime.startWorker().then(() => {
  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`ULUGBEK AI serveri ${PORT}-portda ishga tushdi.`);
    developerAgent.start().catch(error => console.error("Developer Agent ishga tushmadi:", error.message));
    adminAutopilot.start().catch(error => console.error("Admin Autopilot ishga tushmadi:", error.message));
  });
  server.on("error", error => console.error("HTTP server xatosi:", error.message));
}).catch(error => {
  console.error("Agent worker ishga tushmadi:", error.message);
  process.exitCode = 1;
});
