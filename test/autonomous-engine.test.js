"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const engine = require("../modules/autonomous-engine");

test("engine reports its safe local-only mode and all three autonomy levels", () => {
  const status = engine.status();
  assert.equal(status.ready, true);
  assert.equal(status.modelConfigured, false);
  assert.equal(status.externalActionsEnabled, false);
  assert.deepEqual(status.autonomyPolicy.autonomyLevels, ["safe_independence", "extended_independence", "scientific_research"]);
  assert.equal(status.autonomyPolicy.executionEnabled, false);
});

test("engine rejects empty and oversized goals", async () => {
  await assert.rejects(() => engine.executeTask({ goal: " " }), { status: 400 });
  await assert.rejects(() => engine.executeTask({ goal: "x".repeat(4001) }), { status: 413 });
});

test("engine returns a plan without enabling external side effects", async () => {
  const result = await engine.executeTask({ goal: "ULUGBEK AI server xavfsizligini tekshirish rejasini tuz" });
  assert.equal(result.ok, true);
  assert.equal(result.engine, "ulugbek-safe-agent-orchestrator-v1");
  assert.equal(result.agents.length, 4);
  assert.equal(result.safety.externalNetworkAccess, false);
  assert.equal(result.safety.shellExecution, false);
  assert.equal(result.safety.sourceFileWrites, false);
  assert.equal(result.safety.deployment, false);
  assert.equal(result.safety.payments, false);
  assert.equal(result.safety.destructiveActions, false);
  assert.equal(result.autonomyPolicy.unknownActions, "approval");
  assert.ok(result.risks.length > 0);
});
