"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { createVoiceReportService, buildReport, countTasks } = require("../modules/voice-report");

test("task counts summarize states without exposing task contents", () => {
  const result = countTasks([
    { status: "completed", prompt: "private user task" }, { status: "running" },
    { status: "awaiting_review" }, { status: "failed" }, { status: "queued" }
  ]);
  assert.deepEqual(result, { total: 5, pending: 1, running: 1, completed: 1, failed: 1, awaitingReview: 1 });
});
test("report is one Uzbek summary and does not include private task text", () => {
  const report = buildReport({
    uptimeSeconds: 300, model: { configured: false }, learning: { running: true, cycles: 12, saved: 4 },
    developer: { enabled: true }, tasks: { total: 2, completed: 1, running: 0, awaitingReview: 1, failed: 0 }
  }, new Date("2026-11-04T10:00:00.000Z"));
  assert.match(report.text, /ULUGBEK AI tizim hisoboti/);
  assert.match(report.text, /besh daqiqadan keyin/);
  assert.match(report.text, /tekshiruv kutayotgan 1/);
  assert.doesNotMatch(report.text, /private user task/);
  assert.equal(report.type, "system-summary");
  assert.match(report.text, /bitta universal agent faol/);
  assert.match(report.text, /lokal fayl ombori/);
  assert.doesNotMatch(report.text, /private user task|secret-token|internal-stack-trace/);
});
test("service persists the first report and exposes latest report", async () => {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), "ulugbek-voice-report-"));
  const service = createVoiceReportService({ dataDir, intervalMs: 60000, readSnapshot: () => ({
    uptimeSeconds: 60, model: { configured: true }, learning: { running: true, cycles: 1, saved: 2 },
    developer: { enabled: false }, tasks: []
  })});
  try {
    await service.start();
    assert.equal(service.status().started, true);
    assert.equal(service.status().intervalMinutes, 1);
    assert.match(service.latest().text, /shaxsiy mahalliy model ulangan/);
    const saved = JSON.parse(await fs.readFile(path.join(dataDir, "voice-reports.json"), "utf8"));
    assert.equal(saved.length, 1);
    assert.equal(saved[0].id, service.latest().id);
  } finally { service.stop(); await fs.rm(dataDir, { recursive: true, force: true }); }
});
