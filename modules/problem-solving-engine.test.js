"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const engine = require("./problem-solving-engine");

test("problem solver returns the seven-stage workflow for a build request", () => {
  const result = engine.analyzeProblem("Menga Android ilova yaratib ber");
  assert.equal(result.engine, "ulugbek-problem-solving-v1");
  assert.equal(result.agentCount, 1);
  assert.equal(result.flags.codeTask, true);
  assert.deepEqual(result.workflow.map(step => step.id), [
    "understand", "diagnose", "discover", "design", "implement", "verify", "deliver"
  ]);
});

test("problem solver flags current facts and external side effects", () => {
  const result = engine.analyzeProblem("Bugungi narxni tekshir va buyurtmani yubor");
  assert.equal(result.flags.needsCurrentEvidence, true);
  assert.equal(result.flags.externalAction, true);
});

test("problem solver does not claim to execute tasks", () => {
  const result = engine.analyzeProblem("Sayt yarat va deploy qil");
  assert.match(result.honestStatus, /o'z-o'zidan.*bajarmaydi/);
  assert.equal(result.executionPolicy.productionDeploy, "disabled by default; explicit approval and deployment checks required");
});

test("problem solver rejects empty and oversized input", () => {
  assert.throws(() => engine.analyzeProblem(""), { statusCode: 400 });
  assert.throws(() => engine.analyzeProblem("x".repeat(4001)), { statusCode: 413 });
});

test("status advertises a single universal agent and safe execution defaults", () => {
  const result = engine.status();
  assert.equal(result.agentCount, 1);
  assert.equal(result.autonomousExternalActions, false);
});
