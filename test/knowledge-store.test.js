"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

test("knowledge store chunks, persists and retrieves multilingual text", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "ulugbek-knowledge-"));
  process.env.ULUGBEK_KNOWLEDGE_DIR = dir;
  const modulePath = require.resolve("../modules/knowledge-store");
  delete require.cache[modulePath];
  const store = require("../modules/knowledge-store");
  try {
    const content = ("Suvni tejash uchun tomchilatib sug‘orish tizimi tuproq namligini nazorat qiladi. " +
      "Qishloq xo‘jaligida suv sarfini kamaytirish hosildorlikni saqlashga yordam beradi. ").repeat(18);
    const saved = await store.ingest({ title: "Suvni tejash", author: "Sinov", source: "user://test-water", language: "uz", content });
    assert.ok(saved.chunks > 1);
    const results = await store.search("qishloq xo‘jaligida suvni tejash", 4);
    assert.ok(results.length > 0);
    assert.equal(results[0].title, "Suvni tejash");
    assert.ok(results[0].content.includes("suv"));
    const status = await store.status();
    assert.equal(status.documents, 1);
    assert.equal(status.chunks, saved.chunks);
    delete require.cache[modulePath];
    const reopened = require("../modules/knowledge-store");
    assert.ok((await reopened.search("tomchilatib sug‘orish", 3)).length > 0);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
    delete process.env.ULUGBEK_KNOWLEDGE_DIR;
    delete require.cache[modulePath];
  }
});
