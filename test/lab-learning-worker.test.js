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
  assert.equal(status.parallelLanguages, 1);
  assert.equal(status.maxCandidatesPerCycle, 6);
  assert.equal(status.writesToExternalSites, false);
  assert.equal(status.executesDownloadedCode, false);
  assert.equal(status.chatUsesOnlyApprovedKnowledge, true);
  assert.equal(status.knowledgeProvenanceTracking, true);
  assert.equal(status.knowledgeContentHash, "sha256");
  assert.equal(status.unverifiedCandidatesRequireReview, true);
  assert.equal(status.modelWeightsRetrained, false);
  assert.equal(status.genericPublicHttpsWeb, true);
  assert.equal(status.requestConcurrency, 1);
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

test("public web result parser keeps only public HTTPS destinations", () => {
  const html = [
    '<a class="result__a" href="https://example.org/learning">Open learning page</a>',
    '<a class="result__a" href="http://example.net/insecure">Insecure page</a>',
    '<a class="result__a" href="https://127.0.0.1/private">Local page</a>'
  ].join("");
  const results = worker.parseOpenWebResults(html);
  assert.equal(results.length, 1);
  assert.equal(results[0].url, "https://example.org/learning");
  assert.equal(results[0].title, "Open learning page");
});
