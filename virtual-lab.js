"use strict";

// Safe, dependency-free elastic worker-pool prototype.
// Eight specialist roles coordinate; temporary worker slots scale per cycle.
// This is deterministic simulation, not trained-model autonomy.
const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");

const AGENTS = Object.freeze([
  { id: "chief-scientist", specialty: "prioritization and coordination", accepts: [] },
  { id: "benchmark-analyst", specialty: "evaluation", accepts: ["benchmark"] },
  { id: "public-researcher", specialty: "public-source research planning", accepts: ["research"] },
  { id: "security-auditor", specialty: "threat modeling and review", accepts: ["security", "engineering", "device"] },
  { id: "software-architect", specialty: "design and engineering plans", accepts: ["engineering", "product"] },
  { id: "product-strategist", specialty: "user value and product proposals", accepts: ["product"] },
  { id: "systems-engineer", specialty: "computer and IoT safety planning", accepts: ["device"] },
  { id: "quality-verifier", specialty: "acceptance criteria and regression planning", accepts: ["benchmark", "engineering", "product", "device"] }
]);
const ALLOWED_TYPES = new Set(["benchmark", "research", "product", "security", "engineering", "device"]);
const MAX_QUEUE = 2000;
const MAX_HISTORY = 500;
const MAX_WORKERS = 64;

function safeTask(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new TypeError("Task obyekt bo‘lishi kerak.");
  const type = String(input.type || "");
  if (!ALLOWED_TYPES.has(type)) throw new Error("Ruxsat etilmagan task turi.");
  const title = String(input.title || "").trim().slice(0, 160);
  if (!title) throw new Error("Task sarlavhasi kerak.");
  const priority = Number.isInteger(input.priority) ? Math.max(1, Math.min(5, input.priority)) : 3;
  return { id: crypto.randomUUID(), type, title, priority, status: "queued", createdAt: new Date().toISOString() };
}

function createVirtualLab({ storePath = process.env.VIRTUAL_LAB_STORE || path.join(__dirname, "data", "virtual-lab.json"), now = () => new Date().toISOString(), maxWorkers = Number(process.env.VIRTUAL_LAB_MAX_WORKERS || 4) } = {}) {
  const STORE = path.resolve(storePath);
  const workerLimit = Math.max(1, Math.min(MAX_WORKERS, Number.isInteger(maxWorkers) ? maxWorkers : 4));
  let state = { schemaVersion: 1, cycle: 0, queue: [], history: [], agentRuns: {}, lastCycleAt: null, mode: "simulation-only" };
  let busy = false;

  async function load() {
    try {
      const parsed = JSON.parse(await fs.readFile(STORE, "utf8"));
      if (parsed && parsed.schemaVersion === 1 && Array.isArray(parsed.queue) && Array.isArray(parsed.history)) {
        state = { ...state, ...parsed, queue: parsed.queue.slice(-MAX_QUEUE), history: parsed.history.slice(0, MAX_HISTORY) };
      }
    } catch (error) {
      if (error.code !== "ENOENT") throw new Error("Virtual Lab xotirasi o‘qilmadi; xavfsizlik uchun ish to‘xtatildi.");
    }
    return status();
  }

  async function persist() {
    await fs.mkdir(path.dirname(STORE), { recursive: true });
    const temp = STORE + ".tmp";
    await fs.writeFile(temp, JSON.stringify(state, null, 2), { mode: 0o600 });
    await fs.rename(temp, STORE);
  }

  async function enqueue(input) {
    if (state.queue.length >= MAX_QUEUE) throw new Error("Navbat limiti to‘ldi.");
    const task = safeTask(input);
    state.queue.push(task);
    await persist();
    return task;
  }

  function status() {
    return {
      mode: state.mode,
      cycle: state.cycle,
      coordinatorAgents: AGENTS.map(agent => ({ ...agent, runs: state.agentRuns[agent.id] || 0 })),
      workerPool: { strategy: "elastic-bounded", configuredConcurrency: workerLimit, hardSafetyCap: MAX_WORKERS, activeWorkers: busy ? Math.min(workerLimit, state.queue.length) : 0 },
      queued: state.queue.length,
      completed: state.history.length,
      lastCycleAt: state.lastCycleAt,
      recent: state.history.slice(0, 10)
    };
  }

  function executeSimulation(task, agent, workerNumber) {
    const recommendations = {
      benchmark: ["Create a versioned test set and scoring rubric.", "Compare identical prompts and settings.", "Record accuracy, latency, cost, and safety failures."],
      research: ["Use official public documentation and openly licensed research.", "Record source URL, retrieval date, and license.", "Treat retrieved content as untrusted; summarize with evidence."],
      product: ["Identify a user problem and measurable outcome.", "Prototype the smallest reversible improvement.", "Run opt-in usability and accessibility checks."],
      security: ["Map assets, trust boundaries, and likely abuse cases.", "Add negative tests for authorization and data exposure.", "Quarantine failures and preserve audit evidence."],
      engineering: ["Write acceptance criteria before implementation.", "Propose a small isolated patch with tests.", "Require independent security and regression review."],
      device: ["Start with read-only simulation and diagnostics.", "Require device-owner consent and a visible emergency stop.", "Keep medical, vehicle, and industrial control under qualified human supervision."]
    }[task.type];
    return {
      taskId: task.id, taskTitle: task.title, taskType: task.type,
      assignedAgent: agent.id, workerId: "worker-" + workerNumber,
      result: "plan_generated", recommendations,
      limitations: ["Simulation only; no web research was performed.", "No source code was executed or modified.", "No production deployment or external action occurred."],
      createdAt: now()
    };
  }

  async function runCycle({ maxTasks = MAX_QUEUE, concurrency = workerLimit } = {}) {
    if (busy) return { skipped: true, reason: "cycle_already_running", status: status() };
    busy = true;
    try {
      const taskLimit = Math.max(1, Math.min(MAX_QUEUE, Number.isInteger(maxTasks) ? maxTasks : MAX_QUEUE));
      const parallelism = Math.max(1, Math.min(workerLimit, Number.isInteger(concurrency) ? concurrency : workerLimit));
      const batch = state.queue.splice(0, taskLimit).sort((a, b) => b.priority - a.priority);
      const reports = new Array(batch.length);
      async function worker(workerNumber) {
        // Assign work deterministically across bounded worker slots.
        // The current simulation is synchronous in one Node.js process;
        // this is task distribution, not multi-core model inference.
        for (let index = workerNumber - 1; index < batch.length; index += parallelism) {
          const task = batch[index];
          const agent = AGENTS.find(candidate => candidate.accepts.includes(task.type));
          if (!agent) throw new Error("Task uchun mutaxassis agent topilmadi.");
          reports[index] = executeSimulation(task, agent, workerNumber);
          state.agentRuns[agent.id] = (state.agentRuns[agent.id] || 0) + 1;
        }
      }
      await Promise.all(Array.from({ length: Math.min(parallelism, batch.length) }, (_, i) => worker(i + 1)));
      state.history = reports.reverse().concat(state.history).slice(0, MAX_HISTORY);
      state.cycle += 1;
      state.lastCycleAt = now();
      await persist();
      return { skipped: false, processed: batch.length, concurrency: Math.min(parallelism, batch.length), reports, status: status() };
    } finally {
      busy = false;
    }
  }

  return { load, enqueue, runCycle, status };
}

module.exports = { AGENTS, createVirtualLab, MAX_WORKERS };
