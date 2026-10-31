"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const os = require("node:os");
const path = require("node:path");
const crypto = require("node:crypto");

process.env.AGENT_MEMORY_PATH = path.join(os.tmpdir(), "ulugbek-chat-isolation-" + crypto.randomUUID() + ".json");
process.env.TASK_STORE_PATH = path.join(os.tmpdir(), "ulugbek-agent-isolation-" + crypto.randomUUID() + ".json");

const dispatcher = require("../agents/chat-dispatcher");
const runtime = require("../agent-runtime");

test("chat request calls only the Chat Agent once", async () => {
  let calls = 0;
  const result = await dispatcher.runChat({
    message: "Salom",
    sessionId: "test-session-123",
    config: { url: "https://example.invalid", key: "not-used", model: "test-model" },
    signal: new AbortController().signal,
    requestModel: async (_config, messages) => {
      calls += 1;
      assert.ok(messages.some((item) => item.role === "system" && item.content.includes("Chat Agent")));
      assert.equal(messages.some((item) => item.content.includes("Mutaxassislar natijalari")), false);
      return "Salom! Men Chat Agentman.";
    }
  });
  assert.equal(calls, 1);
  assert.equal(result.mode, "single-chat-agent-isolated");
  assert.deepEqual(result.agents.map((agent) => agent.id), ["chat-coordinator"]);
  assert.equal(result.safety.nonChatAgentsEnabled, false);
  assert.equal(result.safety.autonomousExternalActionsEnabled, false);
});

test("native specialist task worker runs without enabling external actions or model APIs", async () => {
  await runtime.startWorker();
  assert.equal(runtime.modelConfig().configured, false);
  assert.equal(runtime.modelConfig().apiUsed, false);
  const task = await runtime.createTask({ prompt: "Ochiq manbalarni tadqiq qilish rejasini tuz", role: "research-agent" });
  assert.ok(task.id);
  let current = task;
  for (let i = 0; i < 100; i += 1) {
    await new Promise((resolve) => setTimeout(resolve, 5));
    current = runtime.getTask(task.id);
    if (current && ["completed", "failed"].includes(current.status)) break;
  }
  await runtime.flush();
  assert.equal(current.status, "completed");
  assert.equal(current.approvalStatus, "pending_review");
  assert.ok(current.output.includes("Research Agent"));
  assert.ok(current.output.includes("Tashqi API ishlatildi: yo‘q"));
  assert.equal(current.tests.status, "not_run");
  assert.equal(current.logs.some((entry) => /shell command executed|deployment executed|source file changed/i.test(entry.message)), false);
});
