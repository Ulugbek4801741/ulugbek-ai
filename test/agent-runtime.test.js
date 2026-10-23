const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");

const tempDir = path.join(os.tmpdir(), "ulugbek-agent-test-" + process.pid);
process.env.TASK_STORE_PATH = path.join(tempDir, "tasks.json");
delete process.env.OPENAI_API_KEY;
delete process.env.OPENAI_BASE_URL;
const runtime = require("../agent-runtime");

test("agent task queue validates prompts and reports missing model honestly", async () => {
  const task = runtime.createTask({ prompt: "ULUGBEK AI uchun xavfsizlik rejasini yoz", role: "security" });
  assert.equal(task.status, "queued");
  assert.equal(task.role, "security");

  assert.throws(() => runtime.createTask({ prompt: "   ", role: "security" }), /bo‘sh/);
  assert.throws(() => runtime.createTask({ prompt: "x".repeat(4001), role: "security" }), /4000/);
  assert.throws(() => runtime.createTask({ prompt: "Sinov", role: "shell" }), /noto‘g‘ri/);

  const deadline = Date.now() + 3000;
  let result;
  while (Date.now() < deadline) {
    result = runtime.getTask(task.id);
    if (result && ["blocked", "failed", "completed"].includes(result.status)) break;
    await new Promise(resolve => setTimeout(resolve, 30));
  }
  assert.equal(result.status, "blocked");
  assert.match(result.error, /model endpointi sozlang/);
  assert.equal(result.approvalStatus, "not_reviewed");
  await fs.rm(tempDir, { recursive: true, force: true });
});
