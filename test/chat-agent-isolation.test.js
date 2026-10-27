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

test("background worker startup does not enable queued specialist execution", async () => {
  await runtime.startWorker();
  await assert.rejects(
    runtime.createTask({ prompt: "test task", role: "research-agent" }),
    (error) => error.status === 503 && /vaqtincha o‘chirilgan/.test(error.message)
  );
  assert.deepEqual(runtime.listTasks(), []);
  await runtime.flush();
});
