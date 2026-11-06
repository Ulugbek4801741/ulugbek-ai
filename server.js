const express = require("express");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const path = require("node:path");
const crypto = require("node:crypto");
const agentRuntime = require("./agent-runtime");
const singleAgent = require("./modules/single-agent").createSingleAgent();
const languageModule = require("./modules/language-module");
const translationService = require("./modules/translation-service").createTranslationService();
const emotionalIntelligence = require("./modules/emotional-intelligence");
const ethicalReasoning = require("./modules/ethical-reasoning");
const conversationOrchestrator = require("./modules/conversation-orchestrator");
const languageCognition = require("./modules/language-cognition");
const languageLearningWorker = require("./modules/language-learning-worker");
const errorLearning = require("./modules/error-learning");
const conversationMemory = require("./modules/conversation-memory");
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
  // Capacitor Android WebView uses https://localhost with androidScheme: "https".
  // capacitor://localhost is retained for compatible iOS/native builds.
  "https://localhost",
  "capacitor://localhost",
  "http://localhost",
  ...(process.env.FRONTEND_ORIGIN || "").split(",").map(value => value.trim().replace(/\/$/, "")).filter(Boolean)
]);
app.use((req, res, next) => {
  const origin = req.headers.origin || "";
  if (origin && FRONTEND_ORIGINS.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
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
      connectSrc: ["'self'", ...FRONTEND_ORIGINS],
      manifestSrc: ["'self'"],
      workerSrc: ["'self'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      frameAncestors: ["'none'"]
    }
  },
  permissionsPolicy: {
    directives: { microphone: ["self"], camera: [], geolocation: [] }
  }
}));
app.use(express.json({ limit: "20kb", strict: true, type: "application/json" }));
// Capture only failure metadata automatically; raw chat text is not stored without explicit feedback.
app.use("/api/chat", errorLearning.middleware(), conversationMemory.middleware());
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


const imageRateLimit = rateLimit({
  windowMs: 60 * 1000, limit: 2, standardHeaders: "draft-8", legacyHeaders: false,
  message: { error: "Rasm yaratish limiti tugadi. Bir daqiqadan keyin qayta urinib ko‘ring." }
});
const imageGenerator = require("./modules/image-generation").createImageGenerator();
const videoGenerator = require("./modules/video-generation").createVideoGenerator();
const videoRateLimit = rateLimit({
  windowMs: 60 * 1000, limit: 1, standardHeaders: "draft-8", legacyHeaders: false,
  message: { error: "Video yaratish limiti tugadi. Bir daqiqadan keyin qayta urinib ko‘ring." }
});
const mediaLibraryRoot = path.join(process.env.ULUGBEK_DATA_DIR || path.join(__dirname, "data"), "media-library");
const mediaLibrary = require("./modules/media-library").createMediaLibrary({ dataDir: mediaLibraryRoot });

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

app.get("/api/learning/status", async (_req, res) => {
  res.set("Cache-Control", "no-store");
  try { return res.json({ ok: true, learning: await errorLearning.status() }); }
  catch (_) { return res.status(503).json({ error: "Xatolarni o‘rganish holatini o‘qib bo‘lmadi." }); }
});
app.post("/api/learning/feedback", async (req, res) => {
  try {
    const result = await errorLearning.submitFeedback({
      prompt: req.body?.prompt,
      correction: req.body?.correction || "",
      rating: req.body?.rating || "negative",
      category: req.body?.category || "incorrect-answer"
    });
    res.set("Cache-Control", "no-store");
    return res.status(201).json({ ok: true, ...result, note: "Tuzatish administrator tekshiruvigacha kutilmoqda." });
  } catch (error) {
    return res.status(error.statusCode || 503).json({ error: error.statusCode ? error.message : "Fikr-mulohazani saqlab bo‘lmadi." });
  }
});
app.get("/api/admin/learning/candidates", requireAdmin, async (_req, res) => {
  try { return res.json({ ok: true, ...(await errorLearning.listCandidates()) }); }
  catch (_) { return res.status(503).json({ error: "O‘rganish nomzodlarini o‘qib bo‘lmadi." }); }
});
app.post("/api/admin/learning/:id/review", requireAdmin, async (req, res) => {
  try {
    const updated = await errorLearning.reviewFeedback(req.params.id, req.body?.decision);
    if (!updated) return res.status(404).json({ error: "Tuzatish topilmadi." });
    return res.json({ ok: true, reviewStatus: req.body.decision });
  } catch (error) {
    return res.status(error.statusCode || 503).json({ error: error.statusCode ? error.message : "Tekshiruv holatini saqlab bo‘lmadi." });
  }
});
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
    aiConfigured: singleAgent.status().configured,
    nativeReasoningReady: true,
    trainedLanguageModelReady: false,
    languageModuleReady: languageModule.status().ready,
    emotionalIntelligenceReady: emotionalIntelligence.status().ready,
    ethicalReasoningReady: ethicalReasoning.status().ready,
    conversationPipelineReady: conversationOrchestrator.status().ready,
    independentLanguageReady: languageCognition.status().ready,
    independentLanguageModelTrained: languageCognition.status().modelTrained,
    localModelConfigured: singleAgent.status().configured && singleAgent.status().provider === "openai-compatible",
    externalAiApiEnabled: singleAgent.status().configured && singleAgent.status().provider !== "openai-compatible",
    model: singleAgent.status(),
    cognition: "one-universal-agent-with-native-fallback",
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

app.post("/api/language/analyze", (req, res) => {
  const text = typeof req.body?.text === "string" ? req.body.text.trim() : "";
  if (!text) return res.status(400).json({ error: "Matn bo‘sh bo‘lmasligi kerak." });
  if (text.length > 4000) return res.status(413).json({ error: "Matn 4000 belgidan oshmasligi kerak." });
  const detected = languageModule.detectLanguage(text);
  return res.json({ ok: true, detected, linguistic: languageCognition.analyze(text), instruction: languageModule.buildLanguageInstruction(text) });
});

app.get("/api/translation/status", (_req, res) => {
  res.set("Cache-Control", "no-store");
  res.json({ ok: true, translation: translationService.status(), coreLanguage: "uz" });
});
app.post("/api/translation/translate", async (req, res) => {
  const text = typeof req.body?.text === "string" ? req.body.text.trim() : "";
  const targetLanguage = typeof req.body?.targetLanguage === "string" ? req.body.targetLanguage.trim().toLowerCase() : "uz";
  const sourceLanguage = typeof req.body?.sourceLanguage === "string" ? req.body.sourceLanguage.trim().toLowerCase() : "auto";
  if (!text) return res.status(400).json({ error: "Tarjima matni bo‘sh bo‘lmasligi kerak." });
  if (text.length > 4000) return res.status(413).json({ error: "Tarjima matni 4000 belgidan oshmasligi kerak." });
  try {
    const result = await translationService.translate(text, { targetLanguage, sourceLanguage });
    res.set("Cache-Control", "no-store");
    return res.json({ ok: true, ...result });
  } catch (error) {
    return res.status(error.statusCode || 503).json({ error: error.message || "Tarjima bajarilmadi." });
  }
});

app.get("/api/language/status", (_req, res) => {
  res.set("Cache-Control", "no-store");
  res.json({ ok: true, language: languageModule.status(), languageLearning: languageLearningWorker.status() });
});

app.get("/api/cognition/status", (_req, res) => {
  res.set("Cache-Control", "no-store");
  res.json({ ok: true, language: languageModule.status(), emotion: emotionalIntelligence.status(), ethics: ethicalReasoning.status(), voice: { input: "browser-speech-recognition", output: "browser-speech-synthesis", requiresMicrophonePermission: true }, conversationPipeline: conversationOrchestrator.status(), independentLanguage: languageLearningWorker.status() });
});

app.post("/api/cognition/analyze", (req, res) => {
  const text = typeof req.body?.text === "string" ? req.body.text.trim() : "";
  if (!text) return res.status(400).json({ error: "Matn bo‘sh bo‘lmasligi kerak." });
  if (text.length > 4000) return res.status(413).json({ error: "Matn 4000 belgidan oshmasligi kerak." });
  return res.json({ ok: true, language: languageModule.detectLanguage(text), linguistic: languageCognition.analyze(text), emotion: emotionalIntelligence.responseGuidance(text), ethics: ethicalReasoning.evaluate(text) });
});

app.get("/api/ai/status", (_req, res) => {
  res.set("Cache-Control", "no-store");
  res.json({ ok: true, agentCount: 1, agentName: "ULUGBEK Universal Agent", model: singleAgent.status(), language: languageModule.status(), emotion: emotionalIntelligence.status(), ethics: ethicalReasoning.status(), conversationPipeline: conversationOrchestrator.status(), independentLanguage: languageLearningWorker.status(), mathEngine: "native-safe-arithmetic", research: "public-read-only-with-source-checks" });
});

app.get("/api/health", (_req, res) => {
  res.set("Cache-Control", "no-store");
  res.json({
    ok: true,
    app: "ULUGBEK AI",
    version: "0.3.1",
    processUptimeSeconds: Math.floor(process.uptime()),
    aiConfigured: singleAgent.status().configured,
    nativeReasoningReady: true,
    trainedLanguageModelReady: false,
    languageModuleReady: languageModule.status().ready,
    emotionalIntelligenceReady: emotionalIntelligence.status().ready,
    ethicalReasoningReady: ethicalReasoning.status().ready,
    conversationPipelineReady: conversationOrchestrator.status().ready,
    localModelConfigured: singleAgent.status().configured,
    externalAiApiEnabled: false,
    agentCount: 1,
    mode: singleAgent.status().configured ? "self-hosted-single-agent" : "native-single-agent-fallback-no-external-ai",
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
    ai: singleAgent.status().configured ? "self-hosted-single-agent-no-external-ai" : "native-single-agent-fallback-no-external-ai",
    agentCount: 1,
    model: singleAgent.status(),
    publicWebResearch: "available-through-lab-route-when-server-has-internet",
    knowledgeStorage: "server-local-json-files",
    agentMemory: "single-agent memory per browser session; JSON file; durable hosting storage must be configured",
    voiceInput: "browser-dependent-and-user-permission-required",
    voiceOutput: "browser-dependent",
    autonomousAgents: "one ULUGBEK Universal Agent; separate background knowledge-fetch worker only",
    developerAgent: developerAgent.status(),
    automaticFailover: "not-configured-requires-authorized-backup-host",
    productionDatabase: "not-configured-task-store-uses-local-json-file",
    agentExecution: "one universal agent with optional self-hosted local model; no multi-agent delegation; source writes and deploy remain disabled",
    nativeReasoning: "ulugbek-native-rule-reasoner-v1; deterministic symbolic planning; not a trained neural language model",
    cognition: { language: languageModule.status(), languageLearning: languageLearningWorker.status(), emotion: emotionalIntelligence.status(), ethics: ethicalReasoning.status(), conversationPipeline: conversationOrchestrator.status() },
    externalAiApiEnabled: false,
    trainedLanguageModelReady: false,
    languageModule: languageModule.status(),
    independentLanguage: languageLearningWorker.status(),
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

app.get("/api/images/status", (_req, res) => {
  res.set("Cache-Control", "no-store");
  res.json({ ok: true, imageGeneration: imageGenerator.status() });
});

app.post("/api/images/generate", (req, res, next) => {
  // Do not consume the image quota when no generation endpoint is configured.
  if (!imageGenerator.status().enabled) {
    res.set("Cache-Control", "no-store");
    return res.status(503).json({
      error: "Rasm yaratish modeli ulanmagan. Serverda IMAGE_GENERATION_URL sozlang.",
      imageGeneration: imageGenerator.status()
    });
  }
  next();
}, imageRateLimit, async (req, res) => {
  res.set("Cache-Control", "no-store");
  try {
    const result = await imageGenerator.generate(req.body?.prompt);
    return res.json({ ok: true, ...result, provider: "self-hosted-stable-diffusion-webui" });
  } catch (error) {
    return res.status(error.status || 502).json({ error: error.message || "Rasm yaratib bo‘lmadi." });
  }
});

app.get("/api/ai/status", (_req, res) => {
  res.set("Cache-Control", "no-store");
  const model = singleAgent.status();
  return res.json({ ok: true, configured: model.configured, provider: model.provider, model: model.model || null, apiKeyRequired: model.apiKeyRequired, tokenConfigured: model.tokenConfigured || false });
});

app.get("/api/videos/status", (_req, res) => {
  res.set("Cache-Control", "no-store");
  res.json({ ok: true, videoGeneration: videoGenerator.status() });
});

app.post("/api/videos/generate", (req, res, next) => {
  // Do not consume the one-per-minute generation quota when no model/workflow is configured.
  if (!videoGenerator.status().enabled) {
    res.set("Cache-Control", "no-store");
    return res.status(503).json({
      error: "Video modeli ulanmagan. Serverda VIDEO_COMFYUI_URL va VIDEO_COMFYUI_WORKFLOW sozlang.",
      videoGeneration: videoGenerator.status()
    });
  }
  next();
}, videoRateLimit, async (req, res) => {
  res.set("Cache-Control", "no-store");
  try {
    const result = await videoGenerator.generate(req.body?.prompt);
    return res.json({ ok: true, ...result, provider: "self-hosted-comfyui" });
  } catch (error) {
    return res.status(error.status || 502).json({ error: error.message || "Video yaratib bo‘lmadi." });
  }
});

const mediaSearchRateLimit = rateLimit({
  windowMs: 60 * 1000, limit: 20, standardHeaders: "draft-8", legacyHeaders: false,
  message: { error: "Media qidiruv limiti tugadi. Bir daqiqadan keyin qayta urinib ko‘ring." }
});

app.get("/api/media/status", async (_req, res) => {
  res.set("Cache-Control", "no-store");
  try {
    return res.json({ ok: true, mediaLibrary: await mediaLibrary.status() });
  } catch (_) {
    return res.status(503).json({ error: "Media ombori holatini o‘qib bo‘lmadi." });
  }
});

app.get("/api/media/search", mediaSearchRateLimit, async (req, res) => {
  res.set("Cache-Control", "no-store");
  try {
    const kind = ["all", "image", "video"].includes(req.query.kind) ? req.query.kind : "all";
    const result = await mediaLibrary.search(req.query.q, { kind, limit: req.query.limit });
    return res.json({ ok: true, ...result, importRequiresAdmin: true });
  } catch (error) {
    return res.status(error.status || 502).json({ error: error.message || "Ochiq media manbalarini qidirib bo‘lmadi." });
  }
});

app.post("/api/admin/media/import", requireAdmin, async (req, res) => {
  res.set("Cache-Control", "no-store");
  try {
    const result = await mediaLibrary.importAsset({ id: req.body?.id });
    return res.status(result.duplicate ? 200 : 201).json({ ok: true, ...result });
  } catch (error) {
    return res.status(error.status || 502).json({ error: error.message || "Media omborga saqlanmadi." });
  }
});

app.get("/api/admin/media/library", requireAdmin, async (req, res) => {
  res.set("Cache-Control", "no-store");
  try {
    const kind = ["image", "video"].includes(req.query.kind) ? req.query.kind : undefined;
    return res.json({ ok: true, items: await mediaLibrary.list({ kind, limit: req.query.limit }) });
  } catch (_) {
    return res.status(503).json({ error: "Media omborini o‘qib bo‘lmadi." });
  }
});

app.get("/api/admin/media/status", requireAdmin, async (_req, res) => {
  res.set("Cache-Control", "no-store");
  return res.json({ ok: true, mediaLibrary: await mediaLibrary.status() });
});

app.post("/api/chat", chatRateLimit, async (req, res) => {
  const message = typeof req.body?.message === "string" ? req.body.message.trim() : "";
  const suppliedSessionId = typeof req.body?.sessionId === "string" ? req.body.sessionId : "";
  const sessionId = /^[a-zA-Z0-9_-]{8,80}$/.test(suppliedSessionId) ? suppliedSessionId : crypto.randomUUID().replace(/-/g, "");
  req.chatSessionId = sessionId;
  res.set("Cache-Control", "no-store");
  if (!message) return res.status(400).json({ error: "Xabar bo‘sh bo‘lmasligi kerak." });
  if (message.length > MAX_TASK_LENGTH) return res.status(413).json({ error: "Xabar 4000 belgidan oshmasligi kerak." });
  let conversationMessage = conversationMemory.expand(sessionId, message);
  req.chatContextMessage = conversationMessage;
  const inputSafety = require("./modules/input-safety").inspectUserMessage(message);
  const shieldDecision = globalSafetyShield.inspectChat({ message, sessionId, ip: req.ip, inputSafety });
  if (!shieldDecision.allowed) {
    return res.status(400).set("Cache-Control", "no-store").json({
      error: shieldDecision.message || inputSafety.message,
      safety: { blocked: true, category: shieldDecision.reason, quarantined: shieldDecision.quarantined === true }
    });
  }
  const detectedForTranslation = languageModule.detectLanguage(message);
  let chatReplyLanguage = detectedForTranslation.code;
  const sourceLanguageForTranslation = detectedForTranslation.code === "unknown" || (detectedForTranslation.code === "uz" && detectedForTranslation.confidence < 0.7)
    ? "auto" : detectedForTranslation.code;
  const shouldTranslateChat = sourceLanguageForTranslation !== "uz";
  if (shouldTranslateChat) {
    try {
      const translatedInput = await translationService.translate(conversationMessage, {
        targetLanguage: "uz",
        sourceLanguage: sourceLanguageForTranslation
      });
      conversationMessage = translatedInput.text;
      chatReplyLanguage = translatedInput.sourceLanguage;
    } catch (error) {
      return res.status(503).json({
        error: "Boshqa tildagi xabarni o‘zbekchaga tarjima qilib bo‘lmadi. Tarjima uchun ULUGBEK AI model provayderini sozlang va qayta urinib ko‘ring.",
        translation: { required: true, available: false, reason: error.code || "translation-unavailable" }
      });
    }
  }
  if (chatReplyLanguage && chatReplyLanguage !== "uz") {
    const sendJson = res.json.bind(res);
    res.json = payload => {
      if (!payload || typeof payload.reply !== "string") return sendJson(payload);
      translationService.translate(payload.reply, { targetLanguage: chatReplyLanguage, sourceLanguage: "uz" })
        .then(translatedOutput => sendJson({
          ...payload,
          reply: translatedOutput.text,
          translation: { used: true, sourceLanguage: "uz", targetLanguage: chatReplyLanguage }
        }))
        .catch(() => {
          res.status(502);
          sendJson({ error: "Javob tayyorlandi, lekin foydalanuvchi tiliga tarjima qilish amalga oshmadi. Qayta urinib ko‘ring.", translation: { used: true, failed: true } });
        });
      return res;
    };
  }
  const conversationContext = conversationOrchestrator.analyze(conversationMessage);
  const cognition = conversationContext.cognition;
  const safetyReply = conversationOrchestrator.safetyReply(conversationContext);
  if (safetyReply) {
    return res.json({
      reply: safetyReply,
      mode: "integrated-safety-response",
      agents: ["ULUGBEK Universal Agent"],
      cognition,
      safety: { intervention: true, category: conversationContext.ethics.category }
    });
  }
  // Universal research-first flow: every substantive request is searched on the public web.
  // Greetings, thanks and plain arithmetic remain local to avoid unnecessary network calls.
  const universalSearch = require("./modules/universal-web-search");
  const searchIntent = universalSearch.detectSearchIntent(conversationMessage);
  if (searchIntent.shouldSearch) {
    if (searchIntent.isJobSearch) {
      const jobSearch = require("./modules/job-search");
      if (!jobSearch.hasLocationHint(conversationMessage)) {
        return res.json({
          reply: jobSearch.locationClarification(),
          mode: "job-search-needs-location",
          agents: ["ULUGBEK Universal Agent"],
          jobSearchUsed: false,
          cognition
        });
      }
      const jobWebSearch = require("./modules/chat-web-research");
      const jobs = await jobSearch.searchJobs(conversationMessage, jobWebSearch, { limit: 5 });
      let jobReply = jobs.reply;
      let jobModelUsed = false;
      if (jobs.results.length && singleAgent.status().configured) {
        try {
          const evidence = jobs.results.map(item => ({
            title: item.title,
            content: item.snippet,
            source: item.url,
            status: item.pageRead ? "unverified-public-job-page" : "unverified-job-search-snippet"
          }));
          const synthesized = await singleAgent.answer(conversationMessage, evidence, conversationContext);
          if (synthesized?.reply) {
            jobReply = synthesized.reply + "\n\nVakansiyalar manbalari:\n" +
              jobs.results.map((item, index) => (index + 1) + ". " + item.title + "\n" + item.url).join("\n");
            jobModelUsed = true;
          }
        } catch (_) {}
      }
      return res.json({
        reply: jobReply,
        mode: jobModelUsed ? "self-hosted-job-search-agent" : "native-job-search-results",
        agents: ["ULUGBEK Universal Agent"],
        jobSearchUsed: true,
        webSearchUsed: jobs.ok,
        webResults: jobs.results,
        synthesisModelConfigured: singleAgent.status().configured,
        cognition
      });
    }
    const webSearch = require("./modules/chat-web-research");
    const nativeBrain = require("./lab-learning-worker");
    let found = { ok: false, results: [], reply: "Internet qidiruvi hozircha ishlamadi." };
    try {
      found = await universalSearch.searchWeb(conversationMessage, webSearch, { limit: 8 });
    } catch (_) {
      // Search failure must not crash chat; try the local knowledge and configured local model.
    }

    const evidence = universalSearch.evidenceEntries(found.results);
    let result = null;
    try {
      // If configured, the self-hosted language model synthesizes one answer from the question and evidence.
      // No hosted AI provider or external API key is called by this path.
      result = await singleAgent.answer(conversationMessage, evidence, conversationContext);
    } catch (_) {}

    if (!result) {
      try {
        const localKnowledge = await nativeBrain.searchKnowledge(conversationMessage, 5);
        const combined = [...evidence, ...localKnowledge].slice(0, 8);
        result = nativeBrain.buildLocalReply(conversationMessage, combined, conversationContext);
      } catch (_) {}
    }

    const sourceLines = found.results.map((item, index) =>
      (index + 1) + ". " + item.title + "\n" + item.url +
      (item.pageRead ? "\nOchiq sahifa matni olindi; faktlar mustaqil tasdiqlanmagan." : "\nFaqat qidiruv parchasi olindi; sahifa to‘liq o‘qilmadi.")
    ).join("\n\n");

    let reply;
    let reasoning;
    if (result?.reasoning?.answerable && result.reply) {
      reply = result.reply;
      reasoning = result.reasoning;
      if (sourceLines) reply += "\n\nInternet manbalari:\n" + sourceLines;
    } else {
      reply = universalSearch.formatEvidenceReply(found.results,
        found.ok ? "" : "Internet qidiruvi vaqtincha ishlamadi; mahalliy bilimlardan ham ishonchli javob topilmadi.");
      reasoning = result?.reasoning || {
        method: found.ok ? "public-web-research-no-language-model-synthesis" : "local-fallback-search-unavailable",
        answerable: false,
        facts: []
      };
    }

    return res.json({
      reply,
      mode: result?.modelUsed ? "self-hosted-universal-research-agent" : "native-universal-research-single-agent-no-external-ai",
      agents: ["ULUGBEK Universal Agent"],
      reasoning,
      webSearchUsed: found.ok,
      webSearchSucceeded: found.ok,
      jobSearchUsed: searchIntent.isJobSearch,
      platformSearch: searchIntent.platforms,
      webResults: found.results,
      synthesisModelConfigured: singleAgent.status().configured,
      detectedLanguage: languageModule.detectLanguage(message),
      researchIntent: searchIntent.reason,
      cognition
    });
  }
  // One-agent chat mode: optional self-hosted model only; never call a hosted AI provider.
  try {
    const nativeBrain = require("./lab-learning-worker");
    const answerWithOneAgent = async entries => {
      const modelAnswer = await singleAgent.answer(conversationMessage, entries, conversationContext);
      return modelAnswer || nativeBrain.buildLocalReply(conversationMessage, entries, conversationContext);
    };
    let learned = await nativeBrain.searchKnowledge(conversationMessage, 5);
    let result = await answerWithOneAgent(learned);
    const webResearchUsed = false;
    return res.json({
      reply: result.reply,
      mode: result.modelUsed ? "self-hosted-single-agent-no-external-ai" : webResearchUsed ? "native-public-research-single-agent-fallback-no-external-ai" : "native-single-agent-fallback-no-external-ai",
      agents: ["ULUGBEK Universal Agent"],
      reasoning: result.reasoning,
      knowledgeUsed: learned.length,
      webResearchUsed,
      learning: nativeBrain.status(),
      cognition,
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

// Keep the administration UI on the API origin so its HttpOnly, SameSite=Strict
// session cookie and every privileged request use the same trusted server.
// /admin is the stable entry point; /admin.html remains available for compatibility.
app.get("/admin", (_req, res) => res.redirect(302, "/admin.html"));
app.get("/admin/", (_req, res) => res.redirect(302, "/admin.html"));

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
languageLearningWorker.stop();
agentRuntime.startWorker().then(() => {
  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`ULUGBEK AI serveri ${PORT}-portda ishga tushdi.`);
  });
  server.on("error", error => console.error("HTTP server xatosi:", error.message));
}).catch(error => {
  console.error("Agent worker ishga tushmadi:", error.message);
  process.exitCode = 1;
});
