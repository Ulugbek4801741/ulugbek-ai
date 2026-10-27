const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");

const tempDir = path.join(os.tmpdir(), "ulugbek-agent-test-" + process.pid);
process.env.TASK_STORE_PATH = path.join(tempDir, "tasks.json");
delete process.env.OPENAI_API_KEY;
delete process.env.OPENAI_BASE_URL;

test("non-chat agent queue stays disabled in security isolation mode", async () => {
  const runtime = require("../agent-runtime");
  try {
    await runtime.startWorker();
    await assert.rejects(
      () => runtime.createTask({ prompt: "ULUGBEK AI uchun xavfsizlik rejasini yoz", role: "security" }),
      /Xavfsizlik rejimi yoqilgan/
    );
    assert.deepEqual(runtime.listTasks(), []);
  } finally {
    await runtime.flush();
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});
