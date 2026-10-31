"use strict";

// Independent watchdog for existing bounded agents.
// It supervises process health and performs bounded restart attempts only.
// It does not edit files, run shell commands, change credentials, merge, or deploy.
const fs = require("node:fs/promises");
const path = require("node:path");

const CHECK_INTERVAL_MS = Math.max(15_000, Number(process.env.ADMIN_AUTOPILOT_INTERVAL_MS) || 60_000);
const MAX_RESTARTS = 2;
const ERROR_LIMIT = 3;
const STORE = path.resolve(process.env.ADMIN_AUTOPILOT_STORE || path.join(__dirname, "data", "admin-autopilot.json"));

function createAdminAutopilot({ developerAgent, learningWorker, agentRuntime, now = () => Date.now() }) {
  if (!developerAgent || !learningWorker || !agentRuntime) throw new TypeError("Watchdog uchun agent modullari kerak.");
  let timer = null;
  let started = false;
  let busy = false;
  let stoppedByAdmin = false;
  let state = {
    enabled: false, running: false, startedAt: null, lastCheckAt: null,
    lastHealthyAt: null, lastError: null, consecutiveErrors: 0,
    restartAttempts: 0, quarantined: false, quarantineReason: null,
    events: []
  };

  function event(type, detail) {
    state.events.unshift({ at: new Date(now()).toISOString(), type, detail: String(detail || "").slice(0, 300) });
    state.events = state.events.slice(0, 100);
  }
  async function persist() {
    await fs.mkdir(path.dirname(STORE), { recursive: true });
    const temp = STORE + ".tmp";
    await fs.writeFile(temp, JSON.stringify(state, null, 2), { mode: 0o600 });
    await fs.rename(temp, STORE);
  }
  async function load() {
    try {
      const saved = JSON.parse(await fs.readFile(STORE, "utf8"));
      if (saved && typeof saved === "object") {
        state = { ...state, ...saved, running: false, enabled: false };
        // A restart never silently clears quarantine or resets retry limits.
      }
    } catch (error) {
      if (error.code !== "ENOENT") {
        state.lastError = "Watchdog xotirasi o‘qilmadi.";
        state.quarantined = true;
        state.quarantineReason = "state_store_unreadable";
      }
    }
  }
  function snapshot() {
    const developer = developerAgent.status();
    const learning = learningWorker.status();
    const tasks = agentRuntime.listTasks();
    return {
      enabled: state.enabled, running: state.running, startedAt: state.startedAt,
      lastCheckAt: state.lastCheckAt, lastHealthyAt: state.lastHealthyAt,
      lastError: state.lastError, consecutiveErrors: state.consecutiveErrors,
      restartAttempts: state.restartAttempts, maxRestarts: MAX_RESTARTS,
      quarantined: state.quarantined, quarantineReason: state.quarantineReason,
      monitored: {
        developerAgent: { enabled: developer.enabled, running: developer.running, lastError: developer.lastError || null },
        learningWorker: { enabled: learning.enabled, running: learning.running, lastError: learning.lastError || null },
        queuedTasks: tasks.filter(task => task.status === "queued").length,
        runningTasks: tasks.filter(task => task.status === "running").length,
        completedTasks: tasks.filter(task => task.status === "completed").length,
        failedTasks: tasks.filter(task => task.status === "failed").length
      },
      recentEvents: state.events.slice(0, 20),
      mode: "bounded-agent-health-watchdog",
      codeGeneration: "not_enabled",
      productionChanges: "blocked",
      uptime: "host-process-dependent",
      note: "Watchdog faqat mavjud agentlarning holatini tekshiradi. Bu mustaqil kod yozuvchi model yoki 24/7 hosting kafolati emas."
    };
  }
  function stopAgents(reason) {
    try { developerAgent.stop(); } catch (_) {}
    try { learningWorker.stop(); } catch (_) {}
    state.quarantined = true;
    state.quarantineReason = String(reason).slice(0, 200);
    event("agents_quarantined", state.quarantineReason);
  }
  async function checkOnce() {
    if (busy || !state.enabled || state.quarantined || stoppedByAdmin) return snapshot();
    busy = true;
    state.running = true;
    state.lastCheckAt = new Date(now()).toISOString();
    try {
      const developer = developerAgent.status();
      const learning = learningWorker.status();
      const errors = [developer.lastError, learning.lastError].filter(Boolean);
      if (errors.length >= 2) throw new Error("Bir nechta agentda bir vaqtda xato bor.");
      if (state.consecutiveErrors > 0 && errors.length === 0) {
        state.consecutiveErrors = 0;
        state.lastError = null;
        event("health_recovered", "Agentlar holati normal.");
      } else if (errors.length) {
        throw new Error("Agent xatosi: " + errors.join(" | "));
      }
      state.lastHealthyAt = new Date(now()).toISOString();
    } catch (error) {
      state.consecutiveErrors += 1;
      state.lastError = String(error.message || "Noma’lum watchdog xatosi").slice(0, 300);
      event("health_error", state.lastError);
      if (state.consecutiveErrors >= ERROR_LIMIT) {
        stopAgents("Takroriy agent xatosi: " + state.lastError);
      }
    } finally {
      state.running = false;
      busy = false;
      await persist();
    }
    return snapshot();
  }
  function schedule() {
    if (!started || stoppedByAdmin || state.quarantined) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(async () => {
      await checkOnce();
      schedule();
    }, CHECK_INTERVAL_MS);
  }
  async function start() {
    if (started) return snapshot();
    await load();
    if (state.quarantined) return snapshot();
    started = true;
    stoppedByAdmin = false;
    state.enabled = true;
    state.startedAt = state.startedAt || new Date(now()).toISOString();
    event("watchdog_started", "Avtomatik nazorat boshlandi.");
    await checkOnce();
    schedule();
    await persist();
    return snapshot();
  }
  async function stop() {
    stoppedByAdmin = true;
    started = false;
    state.enabled = false;
    if (timer) clearTimeout(timer);
    timer = null;
    event("watchdog_stopped", "Watchdog administrator yoki tizim tomonidan to‘xtatildi.");
    await persist();
    return snapshot();
  }
  async function recover() {
    if (state.restartAttempts >= MAX_RESTARTS) {
      state.quarantined = true;
      state.quarantineReason = "restart_limit_reached";
      event("recovery_blocked", "Qayta ishga tushirish limiti tugadi.");
      await persist();
      return snapshot();
    }
    if (!state.quarantined) return snapshot();
    state.restartAttempts += 1;
    state.quarantined = false;
    state.quarantineReason = null;
    state.consecutiveErrors = 0;
    state.lastError = null;
    event("recovery_attempt", "Cheklangan qayta tiklash urinish " + state.restartAttempts);
    try {
      // Only these existing, read-only/background workers are restarted.
      developerAgent.start().catch(error => { state.lastError = String(error.message || "Developer Agent restart failed"); });
      learningWorker.start();
      started = true;
      stoppedByAdmin = false;
      state.enabled = true;
      await checkOnce();
      schedule();
    } catch (error) {
      state.consecutiveErrors += 1;
      state.lastError = String(error.message || "Qayta tiklash xatosi").slice(0, 300);
      if (state.consecutiveErrors >= ERROR_LIMIT || state.restartAttempts >= MAX_RESTARTS) {
        stopAgents(state.lastError);
      }
    }
    await persist();
    return snapshot();
  }
  return { start, stop, checkOnce, recover, status: snapshot };
}

module.exports = { createAdminAutopilot };
