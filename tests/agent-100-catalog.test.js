"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const catalog = require("../modules/agent-100-catalog");

test("catalog contains exactly 100 unique specialist profiles", () => {
  assert.equal(catalog.AGENTS.length, 100);
  assert.equal(new Set(catalog.AGENTS.map(agent => agent.id)).size, 100);
  assert.ok(catalog.AGENTS.every(agent => agent.id && agent.name && agent.specialty && agent.category));
});

test("task selection is bounded and includes coordinator", () => {
  const selected = catalog.selectForTask("Render server xatosini tiklash, kod test va xavfsizlikni tekshirish", 6);
  assert.ok(selected.length <= 6);
  assert.ok(selected.some(agent => agent.id === "orchestrator"));
});

test("selection limit cannot exceed ten", () => {
  assert.ok(catalog.selectForTask("Python dastur va server xatosini tekshir", 100).length <= 10);
});

test("unknown specialist lookup returns null", () => {
  assert.equal(catalog.getAgent("not-a-real-agent"), null);
});
