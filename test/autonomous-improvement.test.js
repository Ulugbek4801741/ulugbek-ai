"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { createAutonomousImprovementPlanner, collectGaps } = require("../modules/autonomous-improvement");

function sampleSnapshot() {
  return {
    health: { multiInstanceSafe: false, automaticFailoverReady: false, trainedLanguageModelReady: false, localModelConfigured: false, agentCount: 1 },
    diagnostics: { productionDatabase: "not-configured", automaticFailover: "not-configured", securityEnforcement: "disclosure-only" },
    modules: [
      { id: "photo", name: "Rasm moduli", status: "prototype", purpose: "GPU adapter kerak." },
      { id: "phone", name: "Telefon moduli", status: "planned", purpose: "Android permission adapter kerak." }
    ],
    agents: [{ id: "chat" }, { id: "qa" }]
  };
}

test("gap detector identifies concrete missing capabilities", () => {
  const gaps = collectGaps(sampleSnapshot());
  const keys = gaps.map(item => item.key);
  assert.ok(keys.includes("production-database"));
  assert.ok(keys.includes("availability-failover"));
  assert.ok(keys.includes("local-model"));
  assert.ok(keys.includes("agent-orchestration"));
  assert.ok(keys.includes("security-enforcement"));
  assert.ok(keys.includes("module-photo"));
  assert.ok(keys.includes("module-phone"));
});

test("planner persists, deduplicates, and requires admin decision without executing", async () => {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), "ulugbek-improvements-"));
  try {
    const planner = createAutonomousImprovementPlanner({ dataDir, readSnapshot: sampleSnapshot });
    const first = await planner.scan();
    assert.ok(first.counts.pendingApproval >= 7);
    const initialCount = planner.list({ limit: 100 }).length;
    await planner.scan();
    assert.equal(planner.list({ limit: 100 }).length, initialCount);

    const proposal = planner.list({ limit: 100 })[0];
    assert.equal(proposal.status, "pending_approval");
    await assert.rejects(planner.decide(proposal.id, "execute"), /approve yoki reject/);

    const approved = await planner.decide(proposal.id, "approve", "test-admin");
    assert.equal(approved.status, "approved_for_implementation");
    assert.equal(planner.status().executionEnabled, false);
    assert.equal(planner.status().codeModificationEnabled, false);
    assert.equal(planner.status().deploymentEnabled, false);

    const restarted = createAutonomousImprovementPlanner({ dataDir, readSnapshot: sampleSnapshot });
    const loaded = await restarted.load();
    assert.equal(loaded, undefined);
    assert.ok(restarted.list({ limit: 100 }).some(item => item.id === proposal.id && item.status === "approved_for_implementation"));
  } finally {
    await fs.rm(dataDir, { recursive: true, force: true });
  }
});

test("planner fails closed when diagnostic scan throws", async () => {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), "ulugbek-improvements-fail-"));
  try {
    const planner = createAutonomousImprovementPlanner({ dataDir, readSnapshot: () => { throw new Error("secret filesystem path"); } });
    const result = await planner.scan();
    assert.equal(result.lastError, "improvement_scan_or_storage_failed");
    assert.equal(result.executionEnabled, false);
    assert.deepEqual(planner.list(), []);
  } finally {
    await fs.rm(dataDir, { recursive: true, force: true });
  }
});
