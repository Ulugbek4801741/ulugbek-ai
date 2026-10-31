"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const worker = require("../lab-learning-worker");

test("research worker is configured for continuous read-only public retrieval", () => {
  const status = worker.status();
  assert.equal(status.mode, "continuous-public-read-only-knowledge-retrieval");
  assert.deepEqual(status.sourceAllowlist, ["en.wikipedia.org"]);
  assert.equal(status.writesToExternalSites, false);
  assert.equal(status.executesDownloadedCode, false);
  assert.equal(status.chatUsesOnlyApprovedKnowledge, true);
  assert.equal(status.modelWeightsRetrained, false);
  assert.ok(status.intervalMinutes >= 1);
});

test("stop disables future research scheduling", () => {
  worker.stop();
  const status = worker.status();
  assert.equal(status.enabled, false);
  assert.equal(status.running, false);
});
