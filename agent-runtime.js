"use strict";

const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");
const singleAgent = require("./modules/single-agent").createSingleAgent();
const languageModule = require("./modules/language-module");

const MAX_TASKS = 200;
const MAX_PROMPT_LENGTH = 4000;
const ROLES = new Set(["orchestrator", "backend", "frontend", "tester", "security", "research", "product", "ulugbek-agent", "chat-coordinator", "core-architect", "research-agent", "software-builder-agent", "frontend-agent", "backend-agent", "qa-agent", "security-agent", "devops-agent", "product-growth-agent"]);
const ROLE_LABELS = { orchestrator: "ULUGBEK Universal Agent", backend: "ULUGBEK Universal Agent", frontend: "ULUGBEK Universal Agent", tester: "ULUGBEK Universal Agent", security: "ULUGBEK Universal Agent", research: "ULUGBEK Universal Agent", product: "ULUGBEK Universal Agent", "ulugbek-agent": "ULUGBEK Universal Agent" };
const DATA_DIR = path.resolve(process.env.ULUGBEK_DATA_DIR || path.join(__dirname, "data"));
const TASK_STORE_PATH = path.resolve(process.env.TASK_STORE_PATH || path.join(DATA_DIR, "agent-tasks.json"));
let tasks = [];
let workerStarted = false;
let workerReady = null;
let workerBusy = false;
let saveChain = Promise.resolve();

function publicTask(task) {
  return {
    id: task.id, prompt: task.prompt, role: task.role, roleLabel: task.roleLabel,
    status: task.status, createdAt: task.createdAt, updatedAt: task.updatedAt,
    startedAt: task.startedAt || null, finishedAt: task.finishedAt || null,
    approvalStatus: task.approvalStatus, output: task.output || "",
    error: task.error || null, logs: task.logs || [], tests: task.tests || null,
    knowledgeUsed: task.knowledgeUsed || []
  };
}
async function persist() {
  const snapshot = JSON.stringify(tasks.slice(-MAX_TASKS), null, 2);
  saveChain = saveChain.then(async () => {
    await fs.mkdir(path.dirname(TASK_STORE_PATH), { recursive: true });
    const temp = TASK_STORE_PATH + ".tmp";
    await fs.writeFile(temp, snapshot, { mode: 0o600 });
    await fs.rename(temp, TASK_STORE_PATH);
  });
  return saveChain;
}
async function initialize() {
  try {
    const raw = await fs.readFile(TASK_STORE_PATH, "utf8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) tasks = parsed.slice(-MAX_TASKS);
  } catch (error) {
    if (error.code !== "ENOENT") console.error("Agent task store could not be loaded:", error.message);
  }
  // Fail closed: non-chat agent tasks are never resumed or executed by default.
  for (const task of tasks) {
    if (["queued", "running"].includes(task.status)) {
      task.status = "blocked";
      task.error = "Server qayta ishga tushgani sababli bajarilmay qolgan vazifa xavfsizlik uchun to‘xtatildi; uni qayta yuboring.";
      task.finishedAt = new Date().toISOString();
      task.logs = [...(task.logs || []), { at: new Date().toISOString(), message: "Restart recovery: takroriy yoki yarim bajarilgan ishning oldini olish uchun vazifa to‘xtatildi." }].slice(-30);
    }
  }
  await persist();
}
function addLog(task, message) {
  task.logs = [...(task.logs || []), { at: new Date().toISOString(), message: String(message).slice(0, 500) }].slice(-30);
  task.updatedAt = new Date().toISOString();
}
function modelConfig() {
  return { ...singleAgent.status(), agentCount: 1, apiUsed: false, trainedLanguageModel: false, localModelConfigured: singleAgent.status().configured };
}
async function runModel(task) {
  try {
    const language = languageModule.detectLanguage(task.prompt);
    addLog(task, "Umumiy til moduli vazifa tilini aniqladi: " + language.code + " (" + language.script + ").");
    addLog(task, "ULUGBEK AI mahalliy fikrlash mexanizmi vazifani tahlil qilmoqda.");
    const engine = require("./native-reasoning-engine");
    const knowledgeBridge = require("./agent-knowledge-bridge");
    const sharedKnowledge = await knowledgeBridge.retrieve(task.prompt, 5);
    const modelAnswer = await singleAgent.answer(task.prompt, sharedKnowledge);
    const result = modelAnswer
      ? { output: modelAnswer.reply, analysis: { engine: "self-hosted-single-agent", agentCount: 1, model: modelAnswer.modelUsed } }
      : engine.runTask(task.prompt, "ulugbek-agent", sharedKnowledge);
    task.role = "ulugbek-agent";
    task.roleLabel = "ULUGBEK Universal Agent";
    task.knowledgeUsed = sharedKnowledge.map(item => ({ title: item.title, source: item.source, language: item.language }));
    addLog(task, sharedKnowledge.length
      ? "Chat Agentning tasdiqlangan bilimlar bazasidan " + sharedKnowledge.length + " ta manba agent vazifasiga uzatildi."
      : "Bu vazifaga mos tasdiqlangan bilim topilmadi; umumiy bilim uzatilmadi.");
    task.output = result.output.slice(0, 24000);
    task.analysis = result.analysis;
    task.tests = { status: "not_run", note: "Mahalliy reja tayyorlandi; kod ishga tushirilmadi va avtomatik test bajarilmadi." };
    task.status = "completed";
    task.approvalStatus = "pending_review";
    addLog(task, modelAnswer
      ? "Bitta ULUGBEK Universal Agent mahalliy model orqali javob tayyorladi; tashqi AI API ishlatilmadi."
      : "Bitta ULUGBEK Universal Agent mahalliy qoidalar va tasdiqlangan bilimlar asosida reja tayyorladi.");
    addLog(task, "Fayllarni avtomatik o‘zgartirish, buyruq bajarish va deploy o‘chiq. Kod natijasi alohida muhitda test qilinishi kerak.");
  } catch (error) {
    task.status = "failed";
    task.error = String(error.message || "Mahalliy fikrlash xatosi").slice(0, 300);
    addLog(task, "Mahalliy tahlil xato bilan tugadi.");
  } finally {
    task.updatedAt = new Date().toISOString();
    task.finishedAt = new Date().toISOString();
    await persist();
  }
}
async function pump() {
  if (workerBusy) return;
  workerBusy = true;
  try {
    while (true) {
      const task = tasks.find(item => item.status === "queued");
      if (!task) break;
      task.status = "running";
      task.startedAt = new Date().toISOString();
      addLog(task, "Ishchi jarayon vazifani boshladi.");
      await persist();
      await runModel(task);
    }
  } finally {
    workerBusy = false;
    await persist();
    if (tasks.some(item => item.status === "queued")) queueMicrotask(pump);
  }
}
function startWorker() {
  if (workerReady) return workerReady;
  workerReady = initialize().then(() => {
    workerStarted = true;
    // Sequential worker. Outputs are proposals only; no source writes, shell, or deploy.
    queueMicrotask(pump);
  });
  return workerReady;
}
async function createTask(input = {}) {
  await startWorker();
  const prompt = typeof input.prompt === "string" ? input.prompt.trim() : "";
  const requestedRole = typeof input.role === "string" ? input.role : "orchestrator";
  if (!prompt) { const error = new Error("Vazifa matni bo‘sh bo‘lmasligi kerak."); error.status = 400; throw error; }
  if (prompt.length > MAX_PROMPT_LENGTH) { const error = new Error("Vazifa 4000 belgidan oshmasligi kerak."); error.status = 413; throw error; }
  if (!ROLES.has(requestedRole)) { const error = new Error("Noma’lum agent roli."); error.status = 400; throw error; }
  const role = "ulugbek-agent";
  if (!workerStarted) { const error = new Error("Agent ishchi jarayoni tayyor emas."); error.status = 503; throw error; }
  const task = {
    id: crypto.randomUUID(), prompt, role, roleLabel: ROLE_LABELS[role] || role,
    status: "queued", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    approvalStatus: "not_reviewed", output: "", error: null, logs: [], tests: null
  };
  tasks.push(task);
  tasks = tasks.slice(-MAX_TASKS);
  addLog(task, "Vazifa yagona ULUGBEK Universal Agent navbatiga qo‘shildi. Kodni avtomatik yozish va deploy o‘chiq.");
  await persist();
  queueMicrotask(pump);
  return publicTask(task);
}
function listTasks() { return tasks.slice().reverse().map(publicTask); }
function getTask(id) { const task = tasks.find(item => item.id === id); return task ? publicTask(task) : null; }
function cancelTask(id) {
  const task = tasks.find(item => item.id === id);
  if (!task) return null;
  if (task.status !== "queued") {
    const error = new Error("Faqat navbatdagi vazifani bekor qilish mumkin."); error.status = 409; throw error;
  }
  task.status = "cancelled"; task.finishedAt = new Date().toISOString();
  addLog(task, "Administrator navbatdagi vazifani bekor qildi.");
  persist().catch(error => console.error("Could not save cancelled task:", error.message));
  return publicTask(task);
}
function reviewTask(id, decision) {
  const task = tasks.find(item => item.id === id);
  if (!task) return null;
  if (task.status !== "completed" || task.approvalStatus !== "pending_review") {
    const error = new Error("Faqat ko‘rib chiqishga tayyor natijani belgilash mumkin."); error.status = 409; throw error;
  }
  if (!["approved", "rejected"].includes(decision)) {
    const error = new Error("Qaror approved yoki rejected bo‘lishi kerak."); error.status = 400; throw error;
  }
  task.approvalStatus = decision;
  addLog(task, decision === "approved" ? "Administrator taklifni ko‘rib chiqdi. Bu hali kodni avtomatik qo‘llamaydi." : "Administrator taklifni rad etdi.");
  persist().catch(error => console.error("Could not save review:", error.message));
  return publicTask(task);
}
async function flush() { await saveChain; }
module.exports = { startWorker, createTask, listTasks, getTask, cancelTask, reviewTask, modelConfig, flush };
