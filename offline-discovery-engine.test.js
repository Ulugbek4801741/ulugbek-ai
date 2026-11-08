"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const discovery = require("./offline-discovery-engine");

test("creates an offline plan without internet or supplied facts", () => {
  const result = discovery.planOfflineDiscovery({ problem: "Marsda energiya zaxirasi kamaymoqda" });
  assert.equal(result.internetRequired, false);
  assert.equal(result.status, "needs_observations");
  assert.equal(result.hypotheses.length, 3);
  assert.ok(result.nextRequiredInputs.length > 0);
  assert.match(result.conclusion, /dalil yo‘q/);
});

test("uses local observations and resources as evidence inputs", () => {
  const result = discovery.planOfflineDiscovery({
    problem: "suvni tozalash",
    observations: ["Filtrdan keyingi suv loyqaligi kamaydi"],
    resources: ["filtr", "o‘lchagich"]
  });
  assert.equal(result.status, "ready_for_hypothesis_testing");
  assert.equal(result.evidenceAvailable, true);
  assert.equal(result.internetRequired, false);
});

test("does not mark a single experiment as verified knowledge", () => {
  const result = discovery.evaluateExperiment({
    hypothesisId: "h1", observation: "Harorat 2 darajaga ko‘tarildi", success: true
  });
  assert.equal(result.outcome, "supported");
  assert.equal(result.verifiedFact, false);
  assert.equal(result.requiresReplication, true);
});

test("rejects empty problems and empty experiment observations", () => {
  assert.throws(() => discovery.planOfflineDiscovery({ problem: " " }), TypeError);
  assert.throws(() => discovery.evaluateExperiment({ hypothesisId: "h1" }), TypeError);
});
