"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const agent = require("../developer-agent");

test("adds a read-only GitHub bearer token when configured", () => {
  const previous = process.env.GITHUB_TOKEN;
  try {
    process.env.GITHUB_TOKEN = "test-token";
    assert.equal(agent.githubHeaders().Authorization, "Bearer test-token");
  } finally {
    if (previous === undefined) delete process.env.GITHUB_TOKEN;
    else process.env.GITHUB_TOKEN = previous;
  }
});

test("does not send an Authorization header without a token", () => {
  const previous = process.env.GITHUB_TOKEN;
  const previousAlternate = process.env.DEVELOPER_AGENT_GITHUB_TOKEN;
  try {
    delete process.env.GITHUB_TOKEN;
    delete process.env.DEVELOPER_AGENT_GITHUB_TOKEN;
    assert.equal(Object.hasOwn(agent.githubHeaders(), "Authorization"), false);
  } finally {
    if (previous === undefined) delete process.env.GITHUB_TOKEN;
    else process.env.GITHUB_TOKEN = previous;
    if (previousAlternate === undefined) delete process.env.DEVELOPER_AGENT_GITHUB_TOKEN;
    else process.env.DEVELOPER_AGENT_GITHUB_TOKEN = previousAlternate;
  }
});

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
