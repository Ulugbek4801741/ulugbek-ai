"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

test("knowledge store persists, deduplicates, and searches Uzbek words", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "ulugbek-memory-"));
  process.env.KNOWLEDGE_FILE = path.join(dir, "memory.json");
  const store = require("../modules/knowledge-store");
  try {
    assert.equal(await store.add({ title: "Sun’iy intellekt", text: "Sun’iy intellekt va robototexnika haqida ma’lumot.", url: "https://example.org/ai", language: "uz" }), true);
    assert.equal(await store.add({ title: "Takror", text: "Boshqa matn", url: "https://example.org/ai" }), false);
    const found = await store.search("intellekt robototexnika");
    assert.equal(found.length, 1);
    assert.equal(found[0].title, "Sun’iy intellekt");
    assert.equal((await store.stats()).count, 1);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
    delete process.env.KNOWLEDGE_FILE;
  }
});
