"use strict";

const fs = require("node:fs/promises");
const path = require("node:path");

function createSafeAutonomy({
  developerAgent,
  agentPermissions,
  storePath = process.env.SAFE_AUTONOMY_STORE || path.join(process.env.ULUGBEK_DATA_DIR || path.join(__dirname, "data"), "safe-autonomy.json"),
  intervalMs = Math.max(5 * 60_000, Number(process.env.SAFE_AUTONOMY_INTERVAL_MS) || 30 * 60_000),
  env = process.env,
  now = () => Date.now()
} = {}) {
  if (!developerAgent || !agentPermissions) throw new TypeError("Safe Autonomy uchun Developer Agent va ruxsatlar moduli kerak.");
  const STORE = path.resolve(storePath);
  let timer = null;
  let busy = false;
  let loaded = false;
  let writeChain = Promise.resolve();
  let state = {
    enabled: false,
    running: false,
    startedAt: null,
    lastRunAt: null,
    nextRunAt: null,
    lastSuccessAt: null,
    lastError: null,
    runs: 0,
    checks: [],
    history: []
  };

  async function load() {
    if (loaded) return;
    loaded = true;
    try {
      const saved = JSON.parse(await fs.readFile(STORE, "utf8"));
      if (saved && typeof saved === "object") {
        state = { ...state, ...saved, running: false };
      }
    } catch (error) {
      if (error.code !== "ENOENT") {
        state.lastError = "Avtonom boshqaruv xotirasi o‘qilmadi.";
        state.enabled = false;
      }
    }
  }

  async function persist() {
    const snapshot = JSON.stringify({ ...state, running: false }, null, 2);
    writeChain = writeChain.then(async () => {
      await fs.mkdir(path.dirname(STORE), { recursive: true });
      const temp = STORE + ".tmp";
      await fs.writeFile(temp, snapshot, { mode: 0o600 });
      await fs.rename(temp, STORE);
    });
    return writeChain;
  }

  function safeAgentSummary(value) {
    return {
      enabled: value?.enabled === true,
      running: value?.running === true,
      cycles: Number(value?.cycles) || 0,
      scannedFiles: Number(value?.scannedFiles) || 0,
      pendingApprovals: Number(value?.pendingApprovals) || 0,
      lastError: String(value?.lastError || "").slice(0, 300) || null,
      lastSuccessAt: value?.lastSuccessAt || null
    };
  }

  async function runOnce() {
    await load();
    if (busy) return status();
    busy = true;
    state.running = true;
    state.lastRunAt = new Date(now()).toISOString();
    state.lastError = null;
    const checks = [];
    const check = (id, ok, detail) => checks.push({ id, ok: ok === true, detail: String(detail || "").slice(0, 300) });

    try {
      const nodeMajor = Number(process.versions.node.split(".")[0]);
      check("node_runtime", nodeMajor >= 20, "Node.js " + process.versions.node);

      if (typeof agentPermissions.load === "function") await agentPermissions.load();
      const permissions = agentPermissions.snapshot().capabilities || {};
      const repositoryRead = permissions.repository_read?.enabled === true;
      check("repository_read_permission", repositoryRead, repositoryRead ? "Repo o‘qish ruxsati yoqilgan." : "Admin panelda repository_read ruxsatini yoqing.");

      const token = String(env.GITHUB_TOKEN || env.DEVELOPER_AGENT_GITHUB_TOKEN || "").trim();
      check("github_token", Boolean(token), token ? "GitHub token mavjud; qiymati maxfiy saqlanadi." : "Render ulugbek-ai1 Environment bo‘limida GITHUB_TOKEN sozlanmagan.");

      let agent = safeAgentSummary(developerAgent.status());
      if (repositoryRead && token) {
        try {
          const result = await developerAgent.auditOnce();
          agent = safeAgentSummary(result || developerAgent.status());
          check("github_repository_audit", !agent.lastError, agent.lastError || "GitHub repozitoriy tekshiruvi bajarildi.");
          if (agent.lastError) state.lastError = agent.lastError;
        } catch (error) {
          state.lastError = String(error.message || "Developer Agent xatosi").slice(0, 300);
          check("github_repository_audit", false, state.lastError);
        }
      } else {
        check("github_repository_audit", false, "Token va repository_read ruxsati tayyor bo‘lmagani uchun API chaqirilmadi.");
      }

      check("isolated_branch_writer", false, "Alohida branchga kod yozuvchi bajaruvchi modul hali ulanmagan.");
      check("isolated_test_runner", false, "Repo kodini xavfsiz sandboxda bajaruvchi test runner hali ulanmagan.");
      check("pull_request_publisher", false, "Avtomatik PR yaratish moduli hali ulanmagan.");
      check("production_deploy", false, "Safe rejimda production deploy doimiy ravishda administrator tasdig‘ini talab qiladi.");

      state.checks = checks;
      state.agent = agent;
      state.runs += 1;
      const blockers = checks.filter(item => !item.ok).map(item => item.id);
      state.lastSuccessAt = blockers.length === 0 ? new Date(now()).toISOString() : state.lastSuccessAt;
      if (!state.lastError && blockers.length) {
        state.lastError = "Mustaqil bajarish cheklangan: " + blockers.join(", ");
      }
      state.history.unshift({
        at: state.lastRunAt,
        result: blockers.length ? "blocked_or_partial" : "healthy",
        blockers
      });
      state.history = state.history.slice(0, 30);
    } catch (error) {
      state.lastError = String(error.message || "Safe Autonomy tekshiruvi bajarilmadi.").slice(0, 300);
      state.checks = checks;
    } finally {
      state.running = false;
      state.nextRunAt = state.enabled ? new Date(now() + intervalMs).toISOString() : null;
      busy = false;
      await persist();
    }
    return status();
  }

  function schedule() {
    if (timer) clearTimeout(timer);
    if (!state.enabled) return;
    timer = setTimeout(async () => {
      await runOnce();
      schedule();
    }, intervalMs);
    if (typeof timer.unref === "function") timer.unref();
  }

  async function start() {
    await load();
    if (state.enabled && timer) return status();
    state.enabled = true;
    state.startedAt = state.startedAt || new Date(now()).toISOString();
    await runOnce();
    schedule();
    await persist();
    return status();
  }

  async function resume() {
    await load();
    if (!state.enabled) return status();
    await runOnce();
    schedule();
    return status();
  }

  async function stop() {
    await load();
    state.enabled = false;
    state.nextRunAt = null;
    if (timer) clearTimeout(timer);
    timer = null;
    await persist();
    return status();
  }

  function status() {
    const checks = Array.isArray(state.checks) ? state.checks.map(item => ({ ...item })) : [];
    return {
      enabled: state.enabled === true,
      running: state.running === true,
      startedAt: state.startedAt,
      lastRunAt: state.lastRunAt,
      nextRunAt: state.nextRunAt,
      lastSuccessAt: state.lastSuccessAt,
      lastError: state.lastError,
      runs: state.runs,
      checks,
      agent: state.agent || null,
      history: (state.history || []).slice(0, 10),
      mode: "safe-read-only-diagnostics",
      repositoryWrites: "not_implemented",
      isolatedTests: "not_implemented",
      pullRequests: "not_implemented",
      mainBranchWrites: "permanently_blocked",
      secretAccess: "blocked",
      userDataDeletion: "blocked",
      productionDeploy: "administrator_approval_required",
      note: "Hozirgi tugma diagnostika va read-only repo auditini mustaqil bajaradi. Kod yozish, sandbox testlari va PR yaratish bajaruvchilari hali ulanmagan; ular bor deb ko‘rsatilmaydi. Render Free uyqu holatida 24/7 ishlash kafolatlanmaydi."
    };
  }

  return { start, stop, resume, runOnce, status };
}

module.exports = { createSafeAutonomy };
