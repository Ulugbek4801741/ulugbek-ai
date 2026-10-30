"use strict";

const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");
const agentRegistry = require("./agents/registry");
const egressPolicy = require("./modules/egress-policy");

const MAX_TASKS = 200;
const MAX_PROMPT_LENGTH = 4000;
const ROLES = new Set(["orchestrator", "backend", "frontend", "tester", "security", "research", "product", ...agentRegistry.listAgents().map(agent => agent.id)]);
const ROLE_LABELS = {
  orchestrator: "Boshqaruvchi agent",
  backend: "Backend/kod agenti",
  frontend: "Interfeys agenti",
  tester: "Sinov agenti",
  security: "Xavfsizlik agenti",
  research: "Tadqiqot agenti",
  product: "Mahsulot agenti",
  ...Object.fromEntries(agentRegistry.listAgents().map(agent => [agent.id, agent.name]))
};
const TASK_STORE_PATH = path.resolve(process.env.TASK_STORE_PATH || path.join(__dirname, "data", "agent-tasks.json"));
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
    error: task.error || null, logs: task.logs || [], tests: task.tests || null
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
      task.error = "Xavfsizlik sababli Chat Agentdan boshqa agentlar vaqtincha o‘chirilgan.";
      task.finishedAt = new Date().toISOString();
      task.logs = [...(task.logs || []), { at: new Date().toISOString(), message: "Izolyatsiya rejimi: vazifa ishga tushirilmadi." }].slice(-30);
    }
  }
  await persist();
}
function addLog(task, message) {
  task.logs = [...(task.logs || []), { at: new Date().toISOString(), message: String(message).slice(0, 500) }].slice(-30);
  task.updatedAt = new Date().toISOString();
}
function modelConfig() {
  const key = process.env.OPENAI_API_KEY || "";
  const custom = (process.env.OPENAI_BASE_URL || "").trim();
  const rawUrl = custom || (key ? "https://api.openai.com/v1" : "");
  const checked = rawUrl ? egressPolicy.validateModelEndpoint(rawUrl) : { allowed: false, reason: "missing_endpoint" };
  return { key, url: checked.allowed ? checked.url : "", endpointError: checked.reason, model: process.env.OPENAI_MODEL || "gpt-4o-mini" };
}
function systemPrompt(role) {
  const registered = agentRegistry.getAgent(role);
  if (registered) return registered.systemPrompt;
  const label = ROLE_LABELS[role] || ROLE_LABELS.orchestrator;
  return `Sen ULUGBEK AI loyihasidagi ${label}san. Faqat tahlil, reja, kod taklifi yoki tekshiruv natijasi tayyorla. O‘zbek tilida javob ber. Fayllarni o‘zgartirish, shell buyruqlarini bajarish, deploy qilish, pul sarflash yoki tashqi hisoblarda harakat qilish imkoning yo‘q. Bajarilmagan ishni bajarildi deb aytma. Kod taklifida fayl yo‘li, aniq o‘zgarish, xavf va sinov qadamlarini ko‘rsat. Inson ko‘rigi va testdan o‘tmaguncha o‘zgarish tasdiqlangan deb aytma.`;
}
async function requestModel(config, messages, signal) {
  const endpointCheck = egressPolicy.validateModelEndpoint(config.url);
  if (!endpointCheck.allowed) throw new Error("AI endpoint blocked by outbound allowlist: " + endpointCheck.reason);
  const response = await fetch(endpointCheck.url + "/chat/completions", {
    method: "POST",
    redirect: "error",
    headers: { ...(config.key ? { Authorization: "Bearer " + config.key } : {}), "Content-Type": "application/json" },
    signal, body: JSON.stringify({ model: config.model, temperature: 0.2, messages })
  });
  if (!response.ok) throw new Error("Model serveri HTTP " + response.status + " javob berdi.");
  const data = await response.json();
  const output = data?.choices?.[0]?.message?.content;
  if (typeof output !== "string" || !output.trim()) throw new Error("Model bo‘sh javob qaytardi.");
  return output.slice(0, 12000);
}
async function runModel(task) {
  const config = modelConfig();
  if (!config.url) {
    task.status = "blocked";
    task.error = "AI modeli ulanmagan. Hostingda OPENAI_API_KEY yoki OPENAI_BASE_URL va OPENAI_MODEL sozlang.";
    addLog(task, "Vazifa bajarilmadi: model endpointi sozlanmagan.");
    task.finishedAt = new Date().toISOString();
    await persist();
    return;
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 180000);
  try {
    addLog(task, "Modelga topshiriq yuborilmoqda.");
    if (task.role === "orchestrator") {
      const specialists = [
        { role: "research-agent", title: "Research Agent" },
        { role: "software-builder-agent", title: "Software Builder Agent" },
        { role: "frontend-agent", title: "Frontend Agent" },
        { role: "backend-agent", title: "Backend Agent" },
        { role: "qa-agent", title: "QA Agent" },
        { role: "security-agent", title: "Security Agent" },
        { role: "devops-agent", title: "DevOps Agent" },
        { role: "product-growth-agent", title: "Product Growth Agent" }
      ];
      const results = [];
      for (const specialist of specialists) {
        addLog(task, specialist.title + " vazifani tahlil qilmoqda.");
        results.push("## " + specialist.title + "\n" + await requestModel(config, [
          { role: "system", content: systemPrompt(specialist.role) + " Faqat o‘z sohang bo‘yicha amaliy taklif yoz. Bajarilmagan testni bajarildi deb ko‘rsatma." },
          { role: "user", content: "Asosiy vazifa:\n" + task.prompt + "\nSohang: " + specialist.title + ". Kodni o‘zgartirma va tashqi harakat bajarma. Taklif, xavf va tekshirish usulini yoz." }
        ], controller.signal));
      }
      addLog(task, "Tekshiruvchi agent takliflarni jamlamoqda.");
      const verified = await requestModel(config, [
        { role: "system", content: systemPrompt("orchestrator") + " Mutaxassislar javoblarini solishtir, qarama-qarshilik va xavflarni ko‘rsat, aniq ustuvor reja ber. Haqiqiy testlar bajarilmaganini ayt." },
        { role: "user", content: "Asosiy vazifa:\n" + task.prompt + "\n\nTakliflar:\n" + results.join("\n\n") }
      ], controller.signal);
      task.output = (results.join("\n\n") + "\n\n## Yakuniy tekshiruv\n" + verified).slice(0, 24000);
      task.tests = { status: "not_run", note: "QA Agent test rejasini berdi; kod sandboxda bajarilmadi." };
      addLog(task, "8 ta mutaxassis tahlili va yakuniy tekshiruv tugadi. Kod takliflari tayyorlandi, loyiha fayllari o‘zgartirilmadi.");
    } else {
      task.output = await requestModel(config, [
        { role: "system", content: systemPrompt(task.role) },
        { role: "user", content: task.prompt }
      ], controller.signal);
      task.tests = { status: "not_run", note: "Model taklifi haqiqiy kod sinovi emas." };
      addLog(task, "Tanlangan mutaxassisning javobi olindi.");
    }
    task.status = "completed";
    task.approvalStatus = "pending_review";
    addLog(task, "Natija taklif sifatida saqlandi; loyiha fayllari o‘zgartirilmadi.");
  } catch (error) {
    task.status = "failed";
    task.error = error.name === "AbortError" ? "Model javobi 3 daqiqada kelmadi." : String(error.message || "Model xatosi").slice(0, 300);
    addLog(task, "Vazifa xato bilan tugadi.");
  } finally {
    clearTimeout(timeout);
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
  const role = typeof input.role === "string" ? input.role : "orchestrator";
  if (!prompt) { const error = new Error("Vazifa matni bo‘sh bo‘lmasligi kerak."); error.status = 400; throw error; }
  if (prompt.length > MAX_PROMPT_LENGTH) { const error = new Error("Vazifa 4000 belgidan oshmasligi kerak."); error.status = 413; throw error; }
  if (!ROLES.has(role)) { const error = new Error("Noma’lum agent roli."); error.status = 400; throw error; }
  if (!workerStarted) { const error = new Error("Agent ishchi jarayoni tayyor emas."); error.status = 503; throw error; }
  const task = {
    id: crypto.randomUUID(), prompt, role, roleLabel: ROLE_LABELS[role] || role,
    status: "queued", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    approvalStatus: "not_reviewed", output: "", error: null, logs: [], tests: null
  };
  tasks.push(task);
  tasks = tasks.slice(-MAX_TASKS);
  addLog(task, "Vazifa navbatga qo‘shildi. Natija kod taklifi; avtomatik fayl yozish va deploy o‘chiq.");
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
