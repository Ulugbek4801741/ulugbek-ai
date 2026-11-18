"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { createAdminAutopilot } = require("../admin-autopilot");

test("admin watchdog monitors agents and reports healthy status", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "ulugbek-watchdog-"));
  const storePath = path.join(dir, "state.json");
  let devError = null;
  let learningError = null;
  const calls = { devStop: 0, learningStop: 0, devStart: 0, learningStart: 0 };
  const watchdog = createAdminAutopilot({
    developerAgent: {
      status: () => ({ enabled: true, running: false, lastError: devError }),
      stop: () => { calls.devStop += 1; },
      start: async () => { calls.devStart += 1; return {}; }
    },
    learningWorker: {
      status: () => ({ enabled: true, running: false, lastError: learningError }),
      stop: () => { calls.learningStop += 1; },
      start: () => { calls.learningStart += 1; return {}; }
    },
    agentRuntime: { listTasks: () => [{ status: "queued" }, { status: "completed" }] },
    storePath
  });
  try {
    const initial = await watchdog.start();
    assert.equal(initial.enabled, true);
    assert.equal(initial.monitored.queuedTasks, 1);
    assert.equal(initial.monitored.completedTasks, 1);
    await watchdog.stop();
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test("watchdog quarantines repeated agent failures and limits recovery attempts", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "ulugbek-watchdog-"));
  const storePath = path.join(dir, "state.json");
  let devError = "simulated failure";
  const calls = { devStop: 0, learningStop: 0, devStart: 0, learningStart: 0 };
  const watchdog = createAdminAutopilot({
    developerAgent: {
      status: () => ({ enabled: true, running: false, lastError: devError }),
      stop: () => { calls.devStop += 1; },
      start: async () => { calls.devStart += 1; return {}; }
    },
    learningWorker: {
      status: () => ({ enabled: true, running: false, lastError: null }),
      stop: () => { calls.learningStop += 1; },
      start: () => { calls.learningStart += 1; return {}; }
    },
    agentRuntime: { listTasks: () => [] },
    storePath
  });
  try {
    await watchdog.start();
    await watchdog.checkOnce();
    await watchdog.checkOnce();
    let status = watchdog.status();
    assert.equal(status.quarantined, true);
    assert.equal(calls.devStop, 1);
    assert.equal(calls.learningStop, 1);
    devError = null;
    status = await watchdog.recover();
    assert.equal(status.restartAttempts, 1);
    assert.equal(calls.devStart, 1);
    assert.equal(calls.learningStart, 1);
    await watchdog.stop();
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});


test("watchdog recovery waits for the developer audit before checking health", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "ulugbek-watchdog-recovery-"));
  const storePath = path.join(dir, "state.json");
  let devError = "stale failure from the quarantined run";
  const watchdog = createAdminAutopilot({
    developerAgent: {
      status: () => ({ enabled: true, running: false, lastError: devError }),
      stop: () => {},
      start: async () => {
        await new Promise(resolve => setImmediate(resolve));
        devError = null;
        return { lastError: null };
      }
    },
    learningWorker: {
      status: () => ({ enabled: true, running: false, lastError: null }),
      stop: () => {},
      start: () => ({ enabled: true })
    },
    agentRuntime: { listTasks: () => [] },
    storePath
  });
  try {
    await fs.writeFile(storePath, JSON.stringify({
      enabled: false,
      quarantined: true,
      quarantineReason: "previous failure",
      restartAttempts: 0,
      consecutiveErrors: 3,
      events: []
    }));
    const before = await watchdog.start();
    assert.equal(before.quarantined, true);
    const after = await watchdog.recover();
    assert.equal(after.quarantined, false);
    assert.equal(after.consecutiveErrors, 0);
    assert.equal(after.restartAttempts, 1);
    await watchdog.stop();
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});
