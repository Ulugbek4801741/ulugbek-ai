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

const voiceEngine = require("./modules/voice-engine").createVoiceEngine();

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
  limit: 120,
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


const ADMIN_SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || "";
const ADMIN_DATA_DIR = path.resolve(process.env.ULUGBEK_DATA_DIR || path.join(__dirname, "data"));
const adminAuth = require("./modules/admin-auth").createAdminAuth({
  accessCode: process.env.ADMIN_ACCESS_CODE,
  sessionSecret: ADMIN_SESSION_SECRET,
  storePath: path.join(ADMIN_DATA_DIR, "admin-auth-lockouts.json")
});
function readCookie(req, name) {
  const item = (req.headers.cookie || "").split(";").map(x => x.trim()).find(x => x.startsWith(name + "="));
  if (!item) return "";
  try { return decodeURIComponent(item.slice(name.length + 1)); } catch (_) { return ""; }
}
function requireAdmin(req, res, next) {
  if (!adminAuth.verifySession(readCookie(req, "ulugbek_admin"))) {
    return res.status(401).json({ error: "Administrator sifatida qayta kiring." });
  }
  next();
}
app.post("/api/admin/login", async (req, res) => {
  try {
    const result = await adminAuth.login({ code: req.body?.code, identifier: req.ip });
    res.set("Cache-Control", "no-store");
    if (!result.ok) {
      return res.status(result.status).json({
        error: result.error,
        remainingAttempts: result.remainingAttempts,
        lockedUntil: result.lockedUntil
      });
    }
    res.setHeader("Set-Cookie", "ulugbek_admin=" + encodeURIComponent(result.token) + "; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=3600");
    return res.json({ ok: true, expiresAt: result.expiresAt, sessionMinutes: 60 });
  } catch (error) {
    return res.status(503).json({ error: "Administrator kirish holatini saqlab bo‘lmadi." });
  }
});
app.post("/api/admin/change-code", requireAdmin, async (req, res) => {
  try {
    const result = await adminAuth.changeCode({
      currentCode: req.body?.currentCode,
      newCode: req.body?.newCode
    });
    res.set("Cache-Control", "no-store");
    if (!result.ok) return res.status(result.status).json({ error: result.error });
    return res.json({ ok: true, note: "Administrator kodi xavfsiz xesh ko‘rinishida saqlandi." });
  } catch (_) {
    return res.status(503).json({ error: "Yangi administrator kodi saqlanmadi." });
  }
});
app.get("/api/admin/status", (req, res) => {
  res.set("Cache-Control", "no-store");
  res.json({
    ok: true,
    authenticated: adminAuth.verifySession(readCookie(req, "ulugbek_admin")),
    configured: adminAuth.configured(),
    sessionMinutes: 60,
    maxAttempts: 5,
    lockoutMinutes: 60
  });
});
app.post("/api/admin/logout", (req, res) => {
  adminAuth.revoke(readCookie(req, "ulugbek_admin"));
  res.setHeader("Set-Cookie", "ulugbek_admin=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0");
  res.set("Cache-Control", "no-store");
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
    adminAuth: "local-pin-one-hour-session",
    adminEmail: "local-admin",
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

app.get("/api/voice/status", (_req, res) => {
  res.set("Cache-Control", "no-store");
  res.json({ ok: true, voice: voiceEngine.status() });
});

app.post("/api/voice/speech", chatRateLimit, async (req, res) => {
  try {
    const result = await voiceEngine.synthesize({
      text: req.body?.text,
      language: req.body?.language || "uz-UZ",
      voice: req.body?.voice || "female",
      emotion: req.body?.emotion || "neutral"
    });
    res.set("Cache-Control", "no-store");
    res.set("X-Content-Type-Options", "nosniff");
    res.type(result.contentType).send(result.audio);
  } catch (error) {
    res.set("Cache-Control", "no-store");
    res.status(error.status || 500).json({ error: error.message || "Ovoz yaratilmadi." });
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
    let learned = await nativeBrain.searchKnowledge(message, 5);
    let result = nativeBrain.buildLocalReply(message, learned);
    let webResearchUsed = false;
    if (!result.reasoning.answerable) {
      const publicFindings = await nativeBrain.researchQuestion(message);
      if (publicFindings.length) {
        learned = publicFindings;
        result = nativeBrain.buildLocalReply(message, learned);
        webResearchUsed = result.reasoning.answerable;
      }
    }
    return res.json({
      reply: result.reply,
      mode: webResearchUsed ? "native-public-research-no-external-ai" : "native-symbolic-no-external-ai",
      agents: webResearchUsed ? ["NativeResearch", "NativeReasoner"] : ["NativeReasoner"],
      reasoning: result.reasoning,
      knowledgeUsed: learned.length,
      webResearchUsed,
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
