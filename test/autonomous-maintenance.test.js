"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { trimWords, licenseDecision } = require("../scripts/autonomous-maintenance");

test("upstream excerpts are bounded by word count", () => {
  const input = Array.from({ length: 250 }, (_, index) => "word" + index).join(" ");
  const result = trimWords(input, 100);
  assert.equal(result.split(/\s+/).length, 100);
});

test("empty upstream text remains empty", () => {
  assert.equal(trimWords("   ", 100), "");
});

test("permissive license still requires project-specific review", () => {
  assert.equal(licenseDecision("MIT", ["MIT"]), "permissive-license-review-still-required");
});

test("unrecognized or absent license blocks code reuse", () => {
  assert.equal(licenseDecision("NOASSERTION", ["MIT"]), "do-not-copy-code-review-license");
  assert.equal(licenseDecision(null, ["MIT"]), "license-not-declared-review-required");
});
