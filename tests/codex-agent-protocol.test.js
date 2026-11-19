"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const protocol = require("../modules/codex-agent-protocol");
const { createAgentFleet } = require("../modules/agent-fleet");

test("Codex role names map to existing ULUGBEK specialist roles", () => {
  const result = protocol.normalizeRoles(["default", "explorer", "worker"]);
  assert.deepEqual(result.roles, ["generalist", "researcher", "engineer"]);
  assert.deepEqual(result.mappings.map(item => item.requestedRole), ["default", "explorer", "worker"]);
});

test("explorer is read-only and worker cannot execute or write repository files", () => {
  const explorer = protocol.createThread({ taskId: "task-test", requestedRole: "explorer" });
  const worker = protocol.createThread({ taskId: "task-test", requestedRole: "worker" });
  assert.equal(explorer.permission, "read-only-analysis");
  assert.equal(worker.permission, "code-proposal-only");
  for (const thread of [explorer, worker]) {
    assert.equal(thread.canExecuteCommands, false);
    assert.equal(thread.canWriteRepository, false);
    assert.equal(thread.depth, 1);
  }
});

test("nested agent depth beyond configured limit is rejected", () => {
  assert.throws(
    () => protocol.createThread({ taskId: "task-test", requestedRole: "worker", depth: 2, maxDepth: 1 }),
    /chuqurligi limitdan oshdi/
  );
});

test("message board keeps task-scoped messages and enforces its size limit", () => {
  const board = protocol.createMessageBoard("task-board", { maxMessages: 2 });
  board.publish({ from: "explorer", to: "coordinator", type: "finding", content: "Topilgan fayl." });
  board.publish({ from: "worker", to: "coordinator", type: "proposal", content: "Kod taklifi." });
  board.publish({ from: "qa", to: "all", type: "review", content: "Tekshiruv kutilmoqda." });
  assert.equal(board.size, 2);
  assert.equal(board.snapshot()[0].from, "worker");
  assert.equal(board.readFor("coordinator").length, 2);
  assert.equal(board.readFor("worker").length, 1);
});

test("agent fleet returns isolated threads and coordinator message-board results", async () => {
  const fleet = createAgentFleet({
    concurrency: 2,
    answer: async prompt => {
      if (prompt.includes("mustaqil QA")) {
        return { reply: JSON.stringify({ verdict: "pass", confidence: 0.95, issues: [], checks: ["thread isolation", "message delivery"], summary: "Tekshirildi" }), modelUsed: "test-model" };
      }
      return { reply: "Agent tahlili tayyor.", modelUsed: "test-model" };
    }
  });
  const result = await fleet.runTask("Koordinatsiya va xabar almashish testi", { roles: ["default", "explorer", "worker"] });
  assert.equal(result.ok, true);
  assert.deepEqual(result.roles, ["generalist", "researcher", "engineer"]);
  assert.equal(result.agentThreads.length, 3);
  assert.equal(new Set(result.agentThreads.map(thread => thread.threadId)).size, 3);
  assert.equal(result.agentThreads.find(thread => thread.requestedRole === "explorer").permission, "read-only-analysis");
  assert.equal(result.agentThreads.find(thread => thread.requestedRole === "worker").permission, "code-proposal-only");
  assert.equal(result.messageBoard.messageCount, 6);
  assert.equal(result.messageBoard.messages.every(message => message.taskId === result.taskId), true);
  assert.equal(fleet.status().activeAgents, 0);
});
