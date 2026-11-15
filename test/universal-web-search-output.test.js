"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const search = require("../modules/universal-web-search");

test("evidence fallback returns one concise answer and at most two read-page links", () => {
  const reply = search.formatEvidenceReply([
    { title: "Search snippet only", url: "https://example.org/snippet", snippet: "Not a fully read page", pageRead: false },
    { title: "Read page one", url: "https://example.org/one", snippet: "Read content", pageRead: true },
    { title: "Read page two", url: "https://example.org/two", snippet: "Read content", pageRead: true },
    { title: "Read page three", url: "https://example.org/three", snippet: "Read content", pageRead: true }
  ]);
  assert.match(reply, /yetarli tasdiqlangan dalil topilmadi/i);
  assert.doesNotMatch(reply, /Search snippet only|Read page one|\n1\./);
  assert.match(reply, /https:\/\/example\.org\/one/);
  assert.match(reply, /https:\/\/example\.org\/two/);
  assert.doesNotMatch(reply, /example\.org\/three/);
  assert.ok(reply.length < 500);
});

test("evidence fallback does not present search snippets as verified facts", () => {
  const reply = search.formatEvidenceReply([
    { title: "Snippet", url: "https://example.org/snippet", snippet: "Unverified result", pageRead: false }
  ]);
  assert.match(reply, /Qidiruv parchalari fakt sifatida qabul qilinmadi/);
  assert.doesNotMatch(reply, /https:\/\/example\.org\/snippet/);
});
