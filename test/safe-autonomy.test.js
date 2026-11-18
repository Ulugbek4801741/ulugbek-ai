"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { createSafeAutonomy } = require("../safe-autonomy");

test("safe autonomy audits only when token and repository read permission exist", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "ulugbek-safe-autonomy-"));
  let auditCalls = 0;
  const agent = {
    status: () => ({ enabled: false, running: false, cycles: 0, scannedFiles: 0, pendingApprovals: 0 }),
    auditOnce: async () => { auditCalls += 1; return { enabled: true, cycles: 1, scannedFiles: 3, pendingApprovals: 0, lastError: null }; }
  };
  const permissions = { snapshot: () => ({ capabilities: { repository_read: { enabled: true } } }) };
  const runner = createSafeAutonomy({ developerAgent: agent, agentPermissions: permissions, storePath: path.join(dir, "state.json"), env: { GITHUB_TOKEN: "never-return-this-token" } });
  try {
    const result = await runner.start();
    assert.equal(auditCalls, 1);
    assert.equal(result.enabled, true);
    assert.equal(result.agent.scannedFiles, 3);
    assert.equal(result.repositoryWrites, "not_implemented");
    assert.equal(JSON.stringify(result).includes("never-return-this-token"), false);
    await runner.stop();
    assert.equal(runner.status().enabled, false);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test("safe autonomy does not call GitHub without a token", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "ulugbek-safe-autonomy-no-token-"));
  let auditCalls = 0;
  const agent = {
    status: () => ({ enabled: false, running: false }),
    auditOnce: async () => { auditCalls += 1; throw new Error("must not run"); }
  };
  const permissions = { snapshot: () => ({ capabilities: { repository_read: { enabled: true } } }) };
  const runner = createSafeAutonomy({ developerAgent: agent, agentPermissions: permissions, storePath: path.join(dir, "state.json"), env: {} });
  try {
    const result = await runner.runOnce();
    assert.equal(auditCalls, 0);
    assert.equal(result.checks.find(item => item.id === "github_token").ok, false);
    assert.match(result.lastError, /github_token/);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test("safe autonomy refuses repository audit when read permission is disabled", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "ulugbek-safe-autonomy-permission-"));
  let auditCalls = 0;
  const agent = { status: () => ({}), auditOnce: async () => { auditCalls += 1; return {}; } };
  const permissions = { snapshot: () => ({ capabilities: { repository_read: { enabled: false } } }) };
  const runner = createSafeAutonomy({ developerAgent: agent, agentPermissions: permissions, storePath: path.join(dir, "state.json"), env: { GITHUB_TOKEN: "test-token" } });
  try {
    const result = await runner.runOnce();
    assert.equal(auditCalls, 0);
    assert.equal(result.checks.find(item => item.id === "repository_read_permission").ok, false);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});
