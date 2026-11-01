"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const research = require("../modules/chat-web-research");

test("parses public DuckDuckGo results and strips markup", () => {
  const html = '<a class="result__a" href="https://example.org/page">Example <b>Title</b></a><a class="result__snippet">Useful &amp; public summary</a>';
  const results = research.parseResults(html);
  assert.equal(results.length, 1);
  assert.equal(results[0].title, "Example Title");
  assert.equal(results[0].snippet, "Useful & public summary");
  assert.equal(results[0].url, "https://example.org/page");
});

test("rejects private-network and credential-bearing result URLs", () => {
  assert.equal(research.safePublicUrl("http://127.0.0.1/admin"), null);
  assert.equal(research.safePublicUrl("http://192.168.1.2/"), null);
  assert.equal(research.safePublicUrl("https://user:pass@example.org/"), null);
  assert.equal(research.safePublicUrl("javascript:alert(1)"), null);
});

test("ignores malformed or incomplete search results", () => {
  assert.deepEqual(research.parseResults('<a class="result__a" href="javascript:alert(1)">bad</a>'), []);
});
