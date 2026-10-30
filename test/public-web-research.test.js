"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const {
  shouldResearch, isSensitiveQuery, parseResults, researchPublicWeb, toPromptContext
} = require("../modules/public-web-research");

test("researches public informational questions but skips greetings and personal text", () => {
  assert.equal(shouldResearch("Bugungi sun’iy intellekt yangiliklari nima?"), true);
  assert.equal(shouldResearch("Salom, yaxshimisan?"), false);
  assert.equal(shouldResearch("Mening do‘stimga xabar yozib ber"), false);
});

test("blocks queries containing personal identifiers or private-data requests", () => {
  assert.equal(isSensitiveQuery("Email: person@example.com haqida ma’lumot"), true);
  assert.equal(isSensitiveQuery("passport number 123456789 haqida"), true);
  assert.equal(shouldResearch("John Doe telefon raqamini topib ber"), false);
});

test("extracts only public http(s) search result links and snippets", () => {
  const html = '<a class="result__a" href="https://example.org/page">Ochiq manba</a><a class="result__snippet">Ommaviy ma’lumot</a>' +
    '<a class="result__a" href="http://127.0.0.1/private">Local</a><a class="result__snippet">No</a>';
  const results = parseResults(html);
  assert.equal(results.length, 1);
  assert.equal(results[0].url, "https://example.org/page");
});

test("uses GET only and does not search sensitive queries", async () => {
  let calls = 0;
  const fakeFetch = async (_url, options) => {
    calls++;
    assert.equal(options.method, "GET");
    assert.equal(options.redirect, "error");
    return { ok: true, text: async () => '<a class="result__a" href="https://example.org">Source</a><a class="result__snippet">Public facts</a>' };
  };
  const blocked = await researchPublicWeb("passport number 123456789", fakeFetch);
  assert.equal(blocked.performed, false);
  assert.equal(calls, 0);
  const found = await researchPublicWeb("Bugungi sun’iy intellekt yangiliklari nima?", fakeFetch);
  assert.equal(found.performed, true);
  assert.equal(found.results.length, 1);
});

test("marks web excerpts as untrusted prompt context", () => {
  const context = toPromptContext({ performed: true, results: [{ title: "Source", url: "https://example.org", snippet: "Public fact" }] });
  assert.match(context, /ishonchsiz/);
  assert.match(context, /https:\/\/example.org/);
});
