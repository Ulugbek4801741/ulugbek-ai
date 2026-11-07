"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { buildProvenance } = require("../modules/knowledge-provenance");

test("records source, fetch time, source type and deterministic SHA-256", () => {
  const record = buildProvenance({
    url: "https://example.org/article",
    content: "Earth observation helps disaster response.",
    fetchedAt: "2026-11-07T09:00:00Z",
    sourceType: "public-web-page"
  });
  assert.equal(record.sourceUrl, "https://example.org/article");
  assert.equal(record.sourceHost, "example.org");
  assert.equal(record.fetchedAt, "2026-11-07T09:00:00.000Z");
  assert.equal(record.sourceType, "public-web-page");
  assert.match(record.contentSha256, /^[a-f0-9]{64}$/);
  assert.equal(record.verificationStatus, "unverified");
  assert.equal(record.approvalRequired, true);
});

test("rejects non-HTTPS, local and credential-bearing knowledge sources", () => {
  for (const url of [
    "http://example.org/article",
    "https://localhost/private",
    "https://router.local/private",
    "https://user:pass@example.org/article",
    "file:///etc/passwd"
  ]) {
    assert.throws(() => buildProvenance({ url, content: "text" }), TypeError, url);
  }
});

test("rejects empty content and invalid fetch timestamps", () => {
  assert.throws(() => buildProvenance({ url: "https://example.org", content: " " }), /empty/);
  assert.throws(() => buildProvenance({ url: "https://example.org", content: "valid", fetchedAt: "not-a-date" }), /timestamp/);
});
