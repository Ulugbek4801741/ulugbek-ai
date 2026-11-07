"use strict";
const fs = require("node:fs/promises");
const path = require("node:path");

function createFunctionGuardian(options = {}) {
  const file = path.resolve(options.file || process.env.FUNCTION_GUARDIAN_STORE ||
    path.join(process.env.ULUGBEK_DATA_DIR || path.join(__dirname, "..", "data"), "function-guardian.json"));
  const max = 500;
  let events = [];
  let loaded = false;
  async function load() {
    if (loaded) return;
    loaded = true;
    try {
      const data = JSON.parse(await fs.readFile(file, "utf8"));
      if (Array.isArray(data.events)) events = data.events.slice(-max);
    } catch (error) { if (error.code !== "ENOENT") throw error; }
  }
  async function record(event) {
    await load();
    const safe = {
      at: new Date().toISOString(),
      service: "ULUGBEK AI",
      function: String(event.function || "unknown").slice(0, 120),
      method: String(event.method || "UNKNOWN").slice(0, 10),
      path: String(event.path || "").slice(0, 180),
      outcome: event.outcome === "error" ? "error" : "ok",
      durationMs: Math.max(0, Math.min(300000, Number(event.durationMs) || 0)),
      statusCode: Number(event.statusCode) || 0
    };
    events.push(safe);
    events = events.slice(-max);
    await fs.mkdir(path.dirname(file), { recursive: true });
    const temp = file + ".tmp";
    await fs.writeFile(temp, JSON.stringify({ version: 1, events }, null, 2), { mode: 0o600 });
    await fs.rename(temp, file);
    return safe;
  }
  function instrumentModule(moduleName, target) {
    if (!target || (typeof target !== "object" && typeof target !== "function")) return target;
    for (const key of Object.keys(target)) {
      const original = target[key];
      if (typeof original !== "function" || original.__guardianWrapped) continue;
      const wrapped = function (...args) {
        const started = Date.now();
        const finish = outcome => record({
          function: moduleName + "." + key, method: "INTERNAL", path: moduleName,
          outcome, durationMs: Date.now() - started, statusCode: outcome === "error" ? 500 : 200
        }).catch(() => {});
        try {
          const result = original.apply(this, args);
          if (result && typeof result.then === "function") {
            return result.then(value => { finish("ok"); return value; }, error => { finish("error"); throw error; });
          }
          finish("ok");
          return result;
        } catch (error) {
          finish("error");
          throw error;
        }
      };
      Object.defineProperty(wrapped, "__guardianWrapped", { value: true });
      try { target[key] = wrapped; } catch (_) {}
    }
    return target;
  }
  function status() {
    const errors = events.filter(x => x.outcome === "error");
    return { service: "ULUGBEK AI", mode: "per-function-observation", trackedEvents: events.length,
      recentErrors: errors.length, lastEvent: events.at(-1) || null,
      repair: "proposal-and-test-required", crossCheck: "peer-endpoint-configuration-required" };
  }
  function report() { return { ...status(), events: events.slice(-100) }; }
  return { record, status, report, load, instrumentModule };
}
module.exports = { createFunctionGuardian };
