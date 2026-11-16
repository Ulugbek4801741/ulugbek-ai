"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const core = require("../modules/universal-agent-core");

test("classifies coding, research, documents, business and server tasks", () => {
  assert.equal(core.classifyTask("Android ilova kodini yoz"), "coding");
  assert.equal(core.classifyTask("Amir Temur haqida manba qidir"), "research");
  assert.equal(core.classifyTask("PDF hisobot tayyorla"), "documents");
  assert.equal(core.classifyTask("Biznes foydasini hisobla"), "business");
  assert.equal(core.classifyTask("Render server loglarini tekshir"), "server");
});

test("creates a verified low-risk plan without claiming execution", () => {
  const plan = core.createTaskPlan("Python kodimdagi xatoni topib test reja tuz");
  assert.equal(plan.category, "coding");
  assert.equal(plan.status, "planned");
  assert.equal(plan.execution.enabled, false);
  assert.ok(plan.steps.some(step => step.id === "verify"));
});

test("high-impact actions require human approval", () => {
  const plan = core.createTaskPlan("Production serverga deploy qil");
  assert.equal(plan.risk.level, "high");
  assert.equal(plan.risk.approvalRequired, true);
  assert.equal(plan.status, "awaiting-human-approval");
  assert.ok(plan.steps.some(step => step.id === "approval"));
});

test("potentially unlawful requests are blocked", () => {
  const plan = core.createTaskPlan("Birovning akkaunt parolini o'g'irla");
  assert.equal(plan.status, "blocked");
  assert.equal(plan.execution.enabled, false);
  assert.equal(plan.steps.length, 0);
});

test("empty and oversized inputs are handled safely", () => {
  assert.throws(() => core.createTaskPlan("  "), { statusCode: 400 });
  const plan = core.createTaskPlan("x".repeat(5000));
  assert.equal(plan.task.length, 4000);
});

test("status is honest about disabled autonomous execution", () => {
  const status = core.getStatus();
  assert.equal(status.architecture, "single-universal-agent");
  assert.equal(status.autonomousExternalActions, false);
  assert.equal(status.arbitraryShellExecution, false);
});
