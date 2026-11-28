"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { createUniversalProblemSolver } = require("./modules/universal-problem-solver");

test("solver builds a seven-step plan", () => {
  const solver = createUniversalProblemSolver();
  const plan = solver.plan("Sayt ishlamayapti");
  assert.equal(plan.steps.length, 7);
  assert.equal(plan.steps[0].id, "diagnose");
  assert.equal(plan.steps.at(-1).id, "deliver");
});

test("solver stops before high-impact action without explicit approval", async () => {
  const solver = createUniversalProblemSolver({ handlers: { diagnose: async () => ({ ok: true }) } });
  const result = await solver.solve("production deploy", { action: "deploy_production", approved: false });
  assert.equal(result.blocked, true);
  assert.equal(result.workflow.steps.find(s => s.id === "execute").status, "blocked");
});

test("solver runs provided steps and reports missing adapters", async () => {
  const solver = createUniversalProblemSolver({ handlers: {
    diagnose: async () => ({ ok: true, notes: ["Diagnosed"] }),
    research: async () => ({ ok: true }),
    design: async () => ({ ok: true }),
    test: async () => ({ ok: true })
  }});
  const result = await solver.solve("Test task");
  assert.equal(result.workflow.steps[0].status, "completed");
  assert.equal(result.workflow.steps.find(s => s.id === "execute").status, "skipped");
  assert.equal(result.ok, true);
});

test("iteration is bounded to three attempts", async () => {
  let attempts = 0;
  const solver = createUniversalProblemSolver({ handlers: { iterate: async () => { attempts++; return { ok: false }; } }, maxIterations: 99 });
  await solver.solve("Improve solution");
  assert.equal(attempts, 3);
});

test("rejects empty task", () => {
  const solver = createUniversalProblemSolver();
  assert.throws(() => solver.plan(" "), /non-empty string/);
});
