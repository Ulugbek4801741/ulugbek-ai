"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

const tempDir = path.join(os.tmpdir(), "ulugbek-memory-" + process.pid);
process.env.AGENT_MEMORY_PATH = path.join(tempDir, "memory.json");
const dispatcher = require("../agents/chat-dispatcher");
const memory = require("../agents/memory-store");

test("dispatcher selects multiple specialists for software tasks", () => {
  const roles = dispatcher.chooseSpecialists("Menga sayt va API kodini yoz, test qilib xavfsizligini tekshir");
  assert.ok(roles.includes("software-builder-agent"));
  assert.ok(roles.includes("qa-agent"));
  assert.ok(roles.includes("security-agent") || roles.includes("backend-agent"));
  assert.ok(roles.length >= 2 && roles.length <= 3);
});
test("memory keeps separate agent histories per session", async () => {
  memory._resetForTests();
  try {
    await memory.remember("qa-agent", "session_A123", "A vazifa", "A javob");
    await memory.remember("security-agent", "session_A123", "B vazifa", "B javob");
    await memory.remember("qa-agent", "session_B123", "C vazifa", "C javob");
    assert.equal((await memory.getMemory("qa-agent", "session_A123")).length, 1);
    assert.equal((await memory.getMemory("security-agent", "session_A123"))[0].user, "B vazifa");
    assert.equal((await memory.getMemory("qa-agent", "session_B123"))[0].user, "C vazifa");
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
    memory._resetForTests();
  }
});
test("chat coordinator calls specialist models and returns specialist names", async () => {
  memory._resetForTests();
  const calls = [];
  const fakeRequest = async (_config, messages) => {
    calls.push(messages[0].content.slice(0, 100));
    return "Mock javob";
  };
  try {
    const result = await dispatcher.runChat({
      message: "Sayt kodini test qil va xavfsizligini tekshir",
      sessionId: "session_C123",
      config: { url: "http://mock", key: "", model: "mock" },
      requestModel: fakeRequest,
      signal: new AbortController().signal
    });
    assert.equal(result.mode, "multi-agent");
    assert.ok(result.agents.some(agent => agent.id === "chat-coordinator") === false);
    assert.ok(result.agents.some(agent => agent.id === "qa-agent"));
    assert.ok(result.agents.some(agent => agent.id === "software-builder-agent"));
    assert.ok(calls.length >= 4);
    assert.equal((await memory.getMemory("chat-coordinator", "session_C123")).length, 1);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
    memory._resetForTests();
  }
});
