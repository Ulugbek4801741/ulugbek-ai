"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { parseResults } = require("../modules/chat-web-research");

test("parses DuckDuckGo result anchors with double-quoted attributes", () => {
  const html = '<div class="result"><a class="result__a" href="https://example.org/vacancy/1">Vakansiya</a><div class="result__snippet">Ish beruvchi va maosh</div></div>';
  const results = parseResults(html);
  assert.equal(results.length, 1);
  assert.equal(results[0].url, "https://example.org/vacancy/1");
  assert.match(results[0].snippet, /Ish beruvchi/);
});

test("parses single-quoted attributes and keeps links when snippets are absent", () => {
  const html = "<a href='https://example.org/jobs/2' class='result__a'>Jobs page</a>";
  const results = parseResults(html);
  assert.equal(results.length, 1);
  assert.equal(results[0].title, "Jobs page");
  assert.equal(results[0].snippet, "");
});

test("unwraps DuckDuckGo redirect URLs and rejects unsafe destinations", () => {
  const redirect = "https://duckduckgo.com/l/?uddg=" + encodeURIComponent("https://example.org/opening");
  const html = '<a class="result__a" href="' + redirect + '">Opening</a><a class="result__a" href="http://127.0.0.1/private">Private</a>';
  const results = parseResults(html);
  assert.equal(results.length, 1);
  assert.equal(results[0].url, "https://example.org/opening");
});
