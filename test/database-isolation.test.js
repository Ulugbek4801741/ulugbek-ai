"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

test("ULUGBEK knowledge store never consumes the generic VIZOR DATABASE_URL", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "ulugbek-db-isolation-"));
  const saved = {
    DATABASE_URL: process.env.DATABASE_URL,
    ULUGBEK_DATABASE_URL: process.env.ULUGBEK_DATABASE_URL,
    ULUGBEK_KNOWLEDGE_DIR: process.env.ULUGBEK_KNOWLEDGE_DIR
  };
  process.env.DATABASE_URL = "postgresql://vizor-only.invalid/vizor";
  delete process.env.ULUGBEK_DATABASE_URL;
  process.env.ULUGBEK_KNOWLEDGE_DIR = dir;
  const modulePath = require.resolve("../modules/knowledge-store");
  delete require.cache[modulePath];
  try {
    const store = require("../modules/knowledge-store");
    const status = await store.status();
    assert.equal(status.database.configured, false);
    assert.equal(status.persistentVolumeRequired, true);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    delete require.cache[modulePath];
  }
});

test("VIZOR module reads only its dedicated database environment variable", async () => {
  const source = await fs.readFile(path.join(__dirname, "../modules/vizor-learning.js"), "utf8");
  assert.match(source, /process\.env\.VIZOR_DATABASE_URL/);
  assert.doesNotMatch(source, /process\.env\.DATABASE_URL/);
});
