"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const worker = require("../lab-learning-worker");

test("research worker prioritizes Uzbek, then English, then Russian", () => {
  const status = worker.status();
  assert.equal(status.mode, "continuous-multilingual-public-read-only-knowledge-retrieval");
  assert.deepEqual(status.languagePriority.map(item => item.language), ["uz", "en", "ru"]);
  assert.deepEqual(status.languagePriority.map(item => item.sharePercent), [60, 25, 15]);
  assert.deepEqual(status.sourceAllowlist, ["uz.wikipedia.org", "en.wikipedia.org", "ru.wikipedia.org"]);
  assert.equal(status.intervalMinutes, 1);
  assert.equal(status.writesToExternalSites, false);
  assert.equal(status.executesDownloadedCode, false);
  assert.equal(status.chatUsesOnlyApprovedKnowledge, true);
  assert.equal(status.modelWeightsRetrained, false);
});

test("unsupported languages are rejected before network access", async () => {
  await assert.rejects(worker.learnTopic("test topic", "xx"), /Qo‘llab-quvvatlanmaydigan til/);
});

test("stop disables future research scheduling", () => {
  worker.stop();
  const status = worker.status();
  assert.equal(status.enabled, false);
  assert.equal(status.running, false);
});
