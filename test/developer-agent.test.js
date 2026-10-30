"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const agent = require("../developer-agent");

test("detects risky dynamic code execution as a review proposal", () => {
  const found = agent.inspectFile("sample.js", "const x = eval(userInput);");
  assert.equal(found.length, 1);
  assert.equal(found[0][0], "security");
  assert.equal(found[0][1], "high");
});

test("flags TODO markers without changing source code", () => {
  const found = agent.inspectFile("todo.js", "// TODO: add validation");
  assert.equal(found.length, 1);
  assert.equal(found[0][0], "maintenance");
});

test("does not flag clean source files", () => {
  assert.deepEqual(agent.inspectFile("clean.js", "function sum(a, b) { return a + b; }"), []);
});
