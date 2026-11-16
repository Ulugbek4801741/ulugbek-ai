"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

const original = { secret: process.env.ULUGBEK_PRIVATE_MEMORY_SECRET, dir: process.env.ULUGBEK_DATA_DIR };
const hub = require("../modules/universal-tool-hub");

test("tool hub reports unavailable execution adapters honestly", () => {
  const value = hub.status();
  assert.equal(value.architecture, "single-universal-agent-with-scoped-tools");
  assert.equal(value.python.localExecutionEnabled, false);
  assert.equal(value.documents.ready, false);
  assert.equal(value.github.mergeEnabled, false);
});

test("repository allowlist is exact and rejects path injection", () => {
  process.env.GITHUB_ALLOWED_REPOSITORIES = "Ulugbek4801741/ulugbek-ai";
  assert.equal(hub.safeRepo("Ulugbek4801741/ulugbek-ai"), true);
  assert.equal(hub.safeRepo("Ulugbek4801741/Asilbek-ai-"), false);
  assert.equal(hub.safeRepo("Ulugbek4801741/ulugbek-ai/../../other"), false);
});

test("private memory requires a signed identity and encrypts data at rest", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "ulugbek-agent-"));
  process.env.ULUGBEK_DATA_DIR = dir;
  process.env.ULUGBEK_PRIVATE_MEMORY_SECRET = "test-secret-at-least-32-characters-long";
  const userId = "user_test_123";
  const crypto = require("node:crypto");
  const signature = crypto.createHmac("sha256", process.env.ULUGBEK_PRIVATE_MEMORY_SECRET).update(userId).digest("hex");
  assert.equal(hub.verifyUserToken(userId + "." + signature), userId);
  assert.equal(hub.verifyUserToken(userId + "." + "0".repeat(64)), null);
  await hub.savePrivateMemory(userId, "maxfiy foydalanuvchi xotirasi");
  const memory = await hub.readPrivateMemory(userId);
  assert.equal(memory.content, "maxfiy foydalanuvchi xotirasi");
  const files = await fs.readdir(path.join(dir, "private-memory"));
  const stored = await fs.readFile(path.join(dir, "private-memory", files[0]), "utf8");
  assert.equal(stored.includes("maxfiy foydalanuvchi xotirasi"), false);
  await fs.rm(dir, { recursive: true, force: true });
  if (original.secret === undefined) delete process.env.ULUGBEK_PRIVATE_MEMORY_SECRET;
  else process.env.ULUGBEK_PRIVATE_MEMORY_SECRET = original.secret;
  if (original.dir === undefined) delete process.env.ULUGBEK_DATA_DIR;
  else process.env.ULUGBEK_DATA_DIR = original.dir;
});

test("report writer returns verifiable report identifiers", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "ulugbek-report-"));
  process.env.ULUGBEK_DATA_DIR = dir;
  const report = await hub.writeReport({ task: "unit test", status: "verified", checks: ["assertions passed"] });
  const items = await hub.listReports(5);
  assert.equal(items[0].id, report.id);
  assert.equal(items[0].checks[0], "assertions passed");
  await fs.rm(dir, { recursive: true, force: true });
  if (original.dir === undefined) delete process.env.ULUGBEK_DATA_DIR;
  else process.env.ULUGBEK_DATA_DIR = original.dir;
});

test("python execution refuses to run without a remote sandbox", async () => {
  delete process.env.ULUGBEK_PYTHON_SANDBOX_URL;
  delete process.env.ULUGBEK_PYTHON_SANDBOX_TOKEN;
  await assert.rejects(() => hub.runPythonSandbox("print(1)"), /sandbox hali ulanmagan/);
});
