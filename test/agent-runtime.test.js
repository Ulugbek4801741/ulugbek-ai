"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

delete process.env.OPENAI_API_KEY;
delete process.env.OPENAI_BASE_URL;
delete process.env.OPENAI_MODEL;

const engine = require("../native-reasoning-engine");

test("native reasoning works without external AI configuration", () => {
  const result = engine.runTask("ULUGBEK AI serverida xavfsizlik va kod testlarini rejalashtir");
  assert.equal(result.analysis.apiUsed, false);
  assert.equal(result.analysis.trainedLanguageModel, false);
  assert.equal(result.analysis.engine, "ulugbek-native-rule-reasoner-v1");
  assert.ok(result.output.includes("Xavfsizlik"));
  assert.ok(result.output.includes("Agent rollari"));
});

test("native reasoning rejects empty and oversized prompts", () => {
  assert.throws(() => engine.analyze(""), /bo‘sh yoki juda uzun/);
  assert.throws(() => engine.analyze("x".repeat(4001)), /bo‘sh yoki juda uzun/);
});

test("native reasoning never claims code tests were executed", () => {
  const result = engine.runTask("Node.js backend uchun kod yozish va test qilish");
  assert.ok(result.output.includes("Kod taklifi"));
  assert.equal(result.analysis.apiUsed, false);
});

test("native reasoning routes a specialist role and rejects unknown roles", () => {
  const result = engine.runTask("Backend serverni rejalashtir", "backend");
  assert.ok(result.output.includes("Backend & API Engineer"));
  assert.ok(!result.output.includes("Frontend & UI Engineer"));
  assert.throws(() => engine.runTask("Vazifa", "not-a-real-agent"), /Noma’lum agent roli/);
});

test("agent runtime queues and completes a local reasoning task without APIs", async () => {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), "ulugbek-agent-test-"));
  process.env.ULUGBEK_DATA_DIR = temp;
  process.env.TASK_STORE_PATH = path.join(temp, "tasks.json");
  await fs.writeFile(path.join(temp, "knowledge.json"), JSON.stringify([
    { id: "approved-1", title: "Backend server xavfsizligi", content: "Backend server xavfsizligi uchun kirish ruxsatlari, HTTPS, so‘rovlarni cheklash va maxfiy kalitlarni server muhitida saqlash muhim hisoblanadi.", source: "https://uz.wikipedia.org/wiki/Backend", language: "uz", status: "approved" },
    { id: "pending-1", title: "Backend xavfsizlik bo‘yicha tasdiqlanmagan", content: "Bu hali tekshirilmagan ma’lumot agentga uzatilmasligi kerak.", source: "https://example.com/pending", language: "uz", status: "pending-review" }
  ], null, 2));
  const runtime = require("../agent-runtime");
  try {
    const created = await runtime.createTask({ prompt: "Backend server uchun xavfsizlik rejasini tuz", role: "backend" });
    assert.ok(created.id);
    assert.ok(["queued", "running", "completed"].includes(created.status));
    let task = created;
    for (let i = 0; i < 100; i += 1) {
      await new Promise(resolve => setTimeout(resolve, 5));
      task = runtime.getTask(created.id);
      if (task && ["completed", "failed"].includes(task.status)) break;
    }
    await runtime.flush();
    assert.equal(task.status, "completed");
    assert.equal(task.approvalStatus, "pending_review");
    assert.ok(task.output.includes("Backend & API Engineer"));
    assert.equal(task.knowledgeUsed.length, 1);
    assert.equal(task.knowledgeUsed[0].title, "Backend server xavfsizligi");
    assert.ok(task.output.includes("Chat Agentdan umumiy bilimlar bazasi"));
    assert.ok(task.output.includes("https://uz.wikipedia.org/wiki/Backend"));
    assert.ok(!task.output.includes("Tasdiqlanmagan"));
    assert.equal(task.tests.status, "not_run");
    assert.ok(task.logs.some(log => log.message.includes("API ishlatilmadi")));
  } finally {
    await runtime.flush();
    await fs.rm(temp, { recursive: true, force: true });
  }
});
