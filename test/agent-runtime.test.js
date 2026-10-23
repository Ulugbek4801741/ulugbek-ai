const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");
const http = require("node:http");

const tempDir = path.join(os.tmpdir(), "ulugbek-agent-test-" + process.pid);
process.env.TASK_STORE_PATH = path.join(tempDir, "tasks.json");
delete process.env.OPENAI_API_KEY;

test("agent queue sends a task to a compatible model, records result, and supports review", async () => {
  const mock = http.createServer(async (req, res) => {
    let body = "";
    for await (const chunk of req) body += chunk;
    const payload = JSON.parse(body);
    assert.equal(req.url, "/v1/chat/completions");
    assert.equal(payload.messages[1].content, "ULUGBEK AI uchun xavfsizlik rejasini yoz");
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ choices: [{ message: { content: "1. Kirish nazorati\n2. Sinovlar\n3. Inson tasdig‘i" } }] }));
  });
  await new Promise(resolve => mock.listen(0, "127.0.0.1", resolve));
  process.env.OPENAI_BASE_URL = "http://127.0.0.1:" + mock.address().port + "/v1";
  process.env.OPENAI_MODEL = "mock-test-model";
  const runtime = require("../agent-runtime");
  try {
    await runtime.startWorker();
    const task = await runtime.createTask({ prompt: "ULUGBEK AI uchun xavfsizlik rejasini yoz", role: "security" });
    assert.equal(task.status, "queued");
    assert.equal(task.role, "security");
    await assert.rejects(() => runtime.createTask({ prompt: "   ", role: "security" }), /bo‘sh/);
    await assert.rejects(() => runtime.createTask({ prompt: "x".repeat(4001), role: "security" }), /4000/);
    await assert.rejects(() => runtime.createTask({ prompt: "Sinov", role: "shell" }), /noto‘g‘ri/);

    const deadline = Date.now() + 4000;
    let result;
    while (Date.now() < deadline) {
      result = runtime.getTask(task.id);
      if (result && ["blocked", "failed", "completed"].includes(result.status)) break;
      await new Promise(resolve => setTimeout(resolve, 25));
    }
    assert.equal(result.status, "completed", result.error || "Task did not complete");
    assert.match(result.output, /Kirish nazorati/);
    assert.equal(result.approvalStatus, "pending_review");
    assert.equal(result.tests.status, "not_run");
    const reviewed = runtime.reviewTask(task.id, "approved");
    assert.equal(reviewed.approvalStatus, "approved");
  } finally {
    await runtime.flush();
    await new Promise(resolve => mock.close(resolve));
    await runtime.flush();
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});
