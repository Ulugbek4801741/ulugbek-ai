"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

test("dispatcher selects multiple specialists for software tasks", () => {
  const dispatcher = require("../agents/chat-dispatcher");
  const roles = dispatcher.chooseSpecialists("Menga sayt va API kodini yoz, test qilib xavfsizligini tekshir");
  assert.ok(roles.includes("software-builder-agent"));
  assert.ok(roles.includes("qa-agent"));
  assert.ok(roles.includes("security-agent") || roles.includes("backend-agent"));
  assert.ok(roles.length >= 2 && roles.length <= 3);
});
test("memory keeps separate agent histories per session", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "ulugbek-memory-"));
  process.env.AGENT_MEMORY_PATH = path.join(dir, "memory.json");
  const memory = require("../agents/memory-store");
  memory._resetForTests();
  try {
    await memory.remember("qa-agent", "session_A123", "A vazifa", "A javob");
    await memory.remember("security-agent", "session_A123", "B vazifa", "B javob");
    await memory.remember("qa-agent", "session_B123", "C vazifa", "C javob");
    assert.equal((await memory.getMemory("qa-agent", "session_A123")).length, 1);
    assert.equal((await memory.getMemory("security-agent", "session_A123"))[0].user, "B vazifa");
    assert.equal((await memory.getMemory("qa-agent", "session_B123"))[0].user, "C vazifa");
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
    memory._resetForTests();
  }
});
