"use strict";

// Safe orchestration adapter for the current ULUGBEK AI MVP.
// It coordinates existing local components only. It does not scrape the web,
// call hosted models, execute shell commands, write source files, or deploy.
const nativeReasoning = require("../native-reasoning-engine");
const learningWorker = require("../lab-learning-worker");

const AGENTS = Object.freeze([
  { id: "supervisor", name: "Boshqaruvchi agent", purpose: "Vazifani qismlarga ajratish va yakuniy natijani jamlash." },
  { id: "researcher", name: "Tadqiqot agenti", purpose: "Faqat tasdiqlangan ichki bilim yozuvlarini topish." },
  { id: "builder", name: "Loyiha agenti", purpose: "Amaliy bajarish rejasini va qabul mezonlarini tayyorlash." },
  { id: "verifier", name: "Tekshiruvchi agent", purpose: "Cheklovlar, noma'lumlar va xavflarni ko'rsatish." }
]);

function validateGoal(goal) {
  if (typeof goal !== "string" || !goal.trim()) {
    const error = new Error("Vazifa matni bo‘sh bo‘lmasligi kerak.");
    error.status = 400;
    throw error;
  }
  if (goal.length > 4000) {
    const error = new Error("Vazifa 4000 belgidan oshmasligi kerak.");
    error.status = 413;
    throw error;
  }
  return goal.trim();
}

async function executeTask(input = {}) {
  const goal = validateGoal(input.goal);
  const analysis = nativeReasoning.analyze(goal);
  const knowledge = await learningWorker.searchKnowledge(goal, 5);
  const localAnswer = learningWorker.buildLocalReply(goal, knowledge);
  const risks = [...analysis.risks];
  if (!knowledge.length) risks.push("Mos tasdiqlangan ichki bilim yozuvi topilmadi; javob umumiy mahalliy qoidalarga tayanadi.");
  risks.push("Hozirgi MVP neyron til modelidan foydalanmaydi; natija ChatGPT/Claude/Gemini darajasidagi model javobi deb hisoblanmasin.");
  return {
    ok: true,
    engine: "ulugbek-safe-agent-orchestrator-v1",
    goal,
    reply: localAnswer.reply,
    reasoning: analysis,
    agents: AGENTS.map(agent => ({ ...agent, status: "completed", execution: "local-read-only" })),
    knowledge: { count: knowledge.length, sources: knowledge.map(item => item.source) },
    safety: {
      externalNetworkAccess: false,
      hostedModelCalls: false,
      shellExecution: false,
      sourceFileWrites: false,
      deployment: false,
      payments: false,
      destructiveActions: false,
      humanApprovalRequiredForExternalEffects: true
    },
    risks
  };
}

function status() {
  return {
    ready: true,
    mode: "local-rule-based-agent-orchestration",
    agents: AGENTS.map(agent => agent.id),
    modelConfigured: false,
    externalActionsEnabled: false,
    note: "Agentlar hozircha mahalliy tahlil va reja bajaradi. Tashqi amallar va kodni avtomatik chiqarish yoqilmagan."
  };
}

module.exports = { executeTask, status };
