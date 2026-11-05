"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const worker = require("../lab-learning-worker");

test("research worker prioritizes Uzbek and learns from five supported languages", () => {
  const status = worker.status();
  assert.equal(status.mode, "continuous-multilingual-public-read-only-knowledge-retrieval");
  assert.deepEqual(status.languagePriority.map(item => item.language), ["uz", "en", "ru", "tr", "kk"]);
  assert.deepEqual(status.languagePriority.map(item => item.sharePercent), [50, 20, 15, 5, 5]);
  assert.deepEqual(status.sourceAllowlist, ["uz.wikipedia.org", "en.wikipedia.org", "ru.wikipedia.org", "tr.wikipedia.org", "kk.wikipedia.org"]);
  assert.equal(status.intervalMinutes, 1);
  assert.equal(status.parallelLanguages, 5);
  assert.equal(status.maxCandidatesPerCycle, 10);
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

test("robots policy blocks disallowed API paths", () => {
  const robots = "User-agent: *\nDisallow: /w/api.php\n";
  assert.equal(worker.robotsAllows(robots, "https://uz.wikipedia.org/w/api.php?action=query").allowed, false);
});

test("robots policy permits explicitly allowed paths", () => {
  const robots = "User-agent: *\nDisallow: /wiki/\nAllow: /wiki/Public_page\n";
  assert.equal(worker.robotsAllows(robots, "https://en.wikipedia.org/wiki/Public_page").allowed, true);
  assert.equal(worker.robotsAllows(robots, "https://en.wikipedia.org/wiki/Private_page").allowed, false);
});

test("robots crawl-delay is respected as a minimum request interval", () => {
  const robots = "User-agent: ULUGBEK-AI-OpenKnowledge\nCrawl-delay: 4\n";
  assert.equal(worker.robotsAllows(robots, "https://ru.wikipedia.org/w/api.php").delayMs, 4000);
});

test("empty robots policy does not invent restrictions", () => {
  assert.equal(worker.robotsAllows("", "https://uz.wikipedia.org/w/api.php").allowed, true);
});
