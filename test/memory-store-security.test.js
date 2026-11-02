"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const os = require("node:os");
const path = require("node:path");
const crypto = require("node:crypto");

process.env.AGENT_MEMORY_PATH = path.join(os.tmpdir(), "ulugbek-memory-security-" + crypto.randomUUID() + ".json");
const memory = require("../agents/memory-store");

test("memory remains isolated between valid sessions", async () => {
  await memory.remember("chat-coordinator", "session-user-a-123", "private A", "reply A");
  await memory.remember("chat-coordinator", "session-user-b-456", "private B", "reply B");
  assert.equal((await memory.getMemory("chat-coordinator", "session-user-a-123"))[0].user, "private A");
  assert.equal((await memory.getMemory("chat-coordinator", "session-user-b-456"))[0].user, "private B");
});

test("invalid session IDs never fall back to a shared default memory", async () => {
  assert.equal(memory.validSession("bad"), null);
  assert.deepEqual(await memory.getMemory("chat-coordinator", "bad"), []);
  await assert.rejects(
    memory.remember("chat-coordinator", "bad", "private", "reply"),
    /Valid session ID is required/
  );
});

test("memory stores only the configured number of recent turns", async () => {
  for (let i = 0; i < 10; i++) {
    await memory.remember("chat-coordinator", "session-turns-123", "user-" + i, "assistant-" + i);
  }
  const turns = await memory.getMemory("chat-coordinator", "session-turns-123");
  assert.equal(turns.length, 8);
  assert.equal(turns[0].user, "user-2");
  assert.equal(turns[7].user, "user-9");
});
