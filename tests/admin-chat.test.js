"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { createAdminChatService, safeObject } = require("../modules/admin-chat");

function makeService(overrides = {}) {
  const calls = [];
  const deps = {
    selfRecovery: {
      async run() { calls.push("diagnostics"); return { status: "degraded", passedChecks: 6, failedChecks: 2 }; },
      report() { return { checks: [{ name: "node", ok: true }], findings: [] }; }
    },
    functionGuardian: {
      async load() {},
      report() { return { trackedEvents: 12, recentErrors: 1, events: [] }; }
    },
    singleAgent: {
      status() { return { configured: false, provider: "none", model: null, apiKeyRequired: false }; },
      async answer() { return null; }
    },
    conversationOrchestrator: { analyze() { return {}; } },
    developerAgent: {
      async auditOnce() { calls.push("audit"); return { enabled: true, scannedFiles: 4, pendingApprovals: 2 }; },
      status() { return { enabled: true, lastError: null }; }
    },
    adminAutopilot: {
      async recover() { calls.push("recover"); return { enabled: true, quarantined: false }; },
      status() { return { enabled: true, quarantined: false }; }
    },
    agentRuntime: { listTasks() { return [{ status: "queued" }, { status: "failed" }]; } },
    knowledgeStore: { async status() { return { count: 3 }; } },
    researchCache: { async status() { return { count: 2 }; } },
    learningWorker: { status() { return { enabled: true, lastError: null }; } },
    languageModule: { status() { return { ready: true }; } },
    ...overrides
  };
  return { service: createAdminChatService(deps), calls };
}

test("admin diagnostics returns a structured read-only report", async () => {
  const { service, calls } = makeService();
  const result = await service.handle("To‘liq diagnostika qil");
  assert.equal(result.action, "diagnostics");
  assert.match(result.reply, /diagnostikasi yakunlandi/i);
  assert.equal(result.data.tasks.queued, 1);
  assert.deepEqual(calls, ["diagnostics"]);
});

test("repository audit is an explicit read-only command", async () => {
  const { service, calls } = makeService();
  const result = await service.handle("Developer Agent GitHub audit qil");
  assert.equal(result.action, "repository_audit");
  assert.deepEqual(calls, ["audit"]);
  assert.match(result.reply, /kodga yozish, merge va deploy bajarilmadi/i);
});

test("worker recovery is only invoked by an explicit recovery command", async () => {
  const { service, calls } = makeService();
  const result = await service.handle("Workerlarni tiklashga urin");
  assert.equal(result.action, "worker_recovery");
  assert.deepEqual(calls, ["recover"]);
});

test("unknown commands do not execute external actions", async () => {
  const { service, calls } = makeService();
  const result = await service.handle("Render serverni o‘chir");
  assert.equal(result.action, "chat");
  assert.equal(result.data.externalActionPerformed, false);
  assert.deepEqual(calls, []);
});

test("empty and oversized commands are rejected", async () => {
  const { service } = makeService();
  await assert.rejects(() => service.handle(" "), { status: 400 });
  await assert.rejects(() => service.handle("x".repeat(4001)), { status: 400 });
});

test("sensitive object keys and bearer tokens are omitted", () => {
  const result = safeObject({ apiKey: "secret", nested: { password: "hidden", note: "Bearer abcdefghijklmnop" } });
  assert.equal("apiKey" in result, false);
  assert.equal("password" in result.nested, false);
  assert.match(result.nested.note, /\[HIDDEN\]/);
});
