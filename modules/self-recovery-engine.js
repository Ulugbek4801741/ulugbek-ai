"use strict";

const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");

const MAX_HISTORY = 100;
const MAX_FINDINGS = 200;

function clean(value, max = 500) {
  return String(value == null ? "" : value)
    .replace(/[\u0000-\u001f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function safeDetails(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const result = {};
  for (const [key, item] of Object.entries(value).slice(0, 20)) {
    if (/token|secret|password|credential|authorization|cookie|key/i.test(key)) continue;
    if (["string", "number", "boolean"].includes(typeof item)) {
      result[clean(key, 60)] = typeof item === "string" ? clean(item, 240) : item;
    }
  }
  return result;
}

function createSelfRecoveryEngine(options = {}) {
  const probes = Array.isArray(options.probes) ? options.probes.slice(0, 40) : [];
  const storePath = path.resolve(options.storePath ||
    process.env.SELF_RECOVERY_STORE ||
    path.join(process.env.ULUGBEK_DATA_DIR || path.join(__dirname, "..", "data"), "self-recovery.json"));
  const now = typeof options.now === "function" ? options.now : () => Date.now();
  const timeoutMs = Math.max(100, Math.min(30_000, Number(options.timeoutMs) || 5_000));
  const intervalMs = Math.max(60_000, Number(options.intervalMs) || 5 * 60_000);
  let busy = false;
  let started = false;
  let timer = null;
  let state = {
    version: 1,
    startedAt: null,
    lastRunAt: null,
    lastSuccessAt: null,
    cycles: 0,
    status: "not_started",
    checks: [],
    findings: [],
    lastError: null
  };

  async function persist() {
    await fs.mkdir(path.dirname(storePath), { recursive: true });
    const temp = storePath + ".tmp";
    await fs.writeFile(temp, JSON.stringify(state, null, 2), { mode: 0o600 });
    await fs.rename(temp, storePath);
  }

  async function load() {
    try {
      const saved = JSON.parse(await fs.readFile(storePath, "utf8"));
      if (saved && saved.version === 1) {
        state = {
          ...state,
          ...saved,
          checks: Array.isArray(saved.checks) ? saved.checks.slice(0, 40) : [],
          findings: Array.isArray(saved.findings) ? saved.findings.slice(0, MAX_FINDINGS) : []
        };
      }
    } catch (error) {
      if (error.code !== "ENOENT") {
        state.status = "degraded";
        state.lastError = "Recovery holati faylini o‘qib bo‘lmadi.";
      }
    }
    return status();
  }

  async function run() {
    if (busy) return status();
    busy = true;
    const started = now();
    state.lastRunAt = new Date(started).toISOString();
    state.status = "running";
    state.lastError = null;
    const results = [];

    try {
      for (const probe of probes) {
        if (!probe || typeof probe.name !== "string" || typeof probe.run !== "function") continue;
        let timer;
        try {
          const result = await Promise.race([
            Promise.resolve().then(() => probe.run()),
            new Promise((_, reject) => {
              timer = setTimeout(() => reject(new Error("Tekshiruv vaqti tugadi.")), timeoutMs);
            })
          ]);
          const ok = result === true || Boolean(result && result.ok === true);
          results.push({
            name: clean(probe.name, 80),
            ok,
            critical: probe.critical === true,
            details: safeDetails(result && result.details),
            message: ok ? "" : clean(result && result.message || "Tekshiruv muvaffaqiyatsiz.", 240)
          });
        } catch (error) {
          results.push({
            name: clean(probe.name, 80),
            ok: false,
            critical: probe.critical === true,
            details: {},
            message: clean(error && error.message || "Tekshiruv bajarilmadi.", 240)
          });
        } finally {
          if (timer) clearTimeout(timer);
        }
      }

      const createdAt = new Date(now()).toISOString();
      const newFindings = results.filter(item => !item.ok).map(item => ({
        id: crypto.randomUUID(),
        check: item.name,
        severity: item.critical ? "critical" : "warning",
        title: item.name + " tekshiruvi muvaffaqiyatsiz",
        detail: item.message,
        recommendedAction: "Xato sababini log va sozlamalardan tekshiring; tuzatishni alohida branchda yozib, CI testlaridan o‘tkazing.",
        status: "open",
        createdAt
      }));
      const existing = new Set(state.findings.filter(item => item.status === "open").map(item => item.check));
      for (const finding of newFindings) {
        if (!existing.has(finding.check)) state.findings.unshift(finding);
      }
      state.findings = state.findings.slice(0, MAX_FINDINGS);
      state.checks = results;
      state.cycles += 1;
      state.lastSuccessAt = createdAt;
      state.status = results.some(item => !item.ok && item.critical)
        ? "critical"
        : results.some(item => !item.ok) ? "degraded" : "healthy";
    } catch (error) {
      state.status = "degraded";
      state.lastError = clean(error && error.message || "Diagnostika xatosi.", 240);
    } finally {
      busy = false;
      await persist();
    }
    return status();
  }

  function status() {
    const failed = state.checks.filter(item => !item.ok);
    return {
      version: state.version,
      status: state.status,
      busy,
      startedAt: state.startedAt,
      lastRunAt: state.lastRunAt,
      lastSuccessAt: state.lastSuccessAt,
      cycles: state.cycles,
      totalChecks: state.checks.length,
      passedChecks: state.checks.filter(item => item.ok).length,
      failedChecks: failed.length,
      criticalFailures: failed.filter(item => item.critical).length,
      openFindings: state.findings.filter(item => item.status === "open").length,
      lastError: state.lastError,
      mode: "diagnostics-and-repair-planning-only",
      sourceCodeWrites: "disabled",
      shellExecution: "disabled",
      gitPushMerge: "disabled",
      productionDeployment: "human-approval-required"
    };
  }

  function report() {
    return {
      ...status(),
      checks: state.checks.map(item => ({ ...item, details: { ...item.details } })),
      findings: state.findings.map(item => ({ ...item }))
    };
  }

  function listFindings() {
    return state.findings.map(item => ({ ...item }));
  }

  function resolveFinding(id, note = "") {
    const finding = state.findings.find(item => item.id === id);
    if (!finding) return null;
    if (finding.status !== "open") {
      const error = new Error("Faqat ochiq diagnostika topilmasini yopish mumkin.");
      error.status = 409;
      throw error;
    }
    finding.status = "reviewed";
    finding.reviewNote = clean(note, 300);
    finding.reviewedAt = new Date(now()).toISOString();
    persist().catch(error => { state.lastError = clean(error.message, 200); });
    return { ...finding };
  }

  function schedule() {
    if (!started) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(async () => {
      await run();
      schedule();
    }, intervalMs);
    if (typeof timer.unref === "function") timer.unref();
  }

  async function start() {
    if (started) return status();
    await load();
    if (!state.startedAt) state.startedAt = new Date(now()).toISOString();
    started = true;
    const result = await run();
    schedule();
    return result;
  }

  function stop() {
    started = false;
    if (timer) clearTimeout(timer);
    timer = null;
    return status();
  }

  return { start, stop, run, status, report, listFindings, resolveFinding, load };
}

module.exports = { createSelfRecoveryEngine, safeDetails };
