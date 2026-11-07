"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { createSelfRecoveryEngine, safeDetails } = require("../modules/self-recovery-engine");

test("diagnostics reports healthy and failed probes without executing repairs", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "ulugbek-recovery-"));
  const engine = createSelfRecoveryEngine({
    storePath: path.join(dir, "state.json"),
    probes: [
      { name: "api", critical: true, run: async () => ({ ok: true, details: { uptime: 10 } }) },
      { name: "model", run: async () => ({ ok: false, message: "Model sozlanmagan." }) }
    ]
  });
  try {
    const result = await engine.start();
    assert.equal(result.status, "degraded");
    assert.equal(result.totalChecks, 2);
    assert.equal(result.passedChecks, 1);
    assert.equal(result.failedChecks, 1);
    assert.equal(result.openFindings, 1);
    assert.equal(result.sourceCodeWrites, "disabled");
    assert.equal(result.shellExecution, "disabled");
    assert.equal(result.productionDeployment, "human-approval-required");
    const saved = JSON.parse(await fs.readFile(path.join(dir, "state.json"), "utf8"));
    assert.equal(saved.cycles, 1);
  } finally {
    engine.stop();
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test("critical probe failures are reported explicitly", async () => {
  const engine = createSelfRecoveryEngine({
    storePath: path.join(os.tmpdir(), "ulugbek-recovery-" + Date.now() + ".json"),
    probes: [{ name: "database", critical: true, run: async () => { throw new Error("connection refused"); } }]
  });
  const result = await engine.run();
  assert.equal(result.status, "critical");
  assert.equal(result.criticalFailures, 1);
  assert.match(engine.report().checks[0].message, /connection refused/);
});

test("probe timeout is converted into a failed check", async () => {
  const engine = createSelfRecoveryEngine({
    storePath: path.join(os.tmpdir(), "ulugbek-recovery-timeout-" + Date.now() + ".json"),
    timeoutMs: 100,
    probes: [{ name: "slow", run: () => new Promise(() => {}) }]
  });
  const result = await engine.run();
  assert.equal(result.failedChecks, 1);
  assert.match(engine.report().checks[0].message, /vaqti tugadi/);
});

test("sensitive detail keys are omitted from diagnostics", () => {
  const result = safeDetails({
    status: "ok",
    token: "must-not-appear",
    password: "must-not-appear",
    count: 2,
    nested: { secret: "hidden" }
  });
  assert.deepEqual(result, { status: "ok", count: 2 });
});

test("finding can be marked reviewed but cannot be reviewed twice", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "ulugbek-recovery-review-"));
  const engine = createSelfRecoveryEngine({
    storePath: path.join(dir, "state.json"),
    probes: [{ name: "worker", run: async () => ({ ok: false, message: "stopped" }) }]
  });
  try {
    await engine.run();
    const finding = engine.listFindings()[0];
    const updated = engine.resolveFinding(finding.id, "Tekshirildi");
    assert.equal(updated.status, "reviewed");
    assert.throws(() => engine.resolveFinding(finding.id), /Faqat ochiq/);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});
