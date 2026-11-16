"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const memory = require("../modules/conversation-memory");

test("source requests are detected in Uzbek and English", () => {
  assert.equal(memory.isSourceRequest("Bu ma'lumotni qaysi manbadan olding?"), true);
  assert.equal(memory.isSourceRequest("Manbaning aniq havolasini yubor"), true);
  assert.equal(memory.isSourceRequest("Where did you get this source?"), true);
  assert.equal(memory.isSourceRequest("Xitoy tarixi haqida ma'lumot ber"), false);
});

test("sources survive the normal session remember middleware update", () => {
  memory.clear();
  memory.rememberSources("session12345", "Xitoy tarixi", [{
    title: "Ancient China",
    url: "https://example.org/china",
    snippet: "Ancient China history and dynasties.",
    pageRead: true
  }]);
  memory.remember("session12345", "Manbani ko'rsat");
  const sources = memory.getSources("session12345");
  assert.equal(sources.length, 1);
  assert.equal(sources[0].title, "Ancient China");
  assert.equal(sources[0].url, "https://example.org/china");
});

test("unread snippets and non-HTTPS URLs are not stored as citations", () => {
  memory.clear();
  memory.rememberSources("session12345", "Xitoy tarixi", [
    { title: "Search snippet", url: "https://example.org/snippet", snippet: "not opened", pageRead: false },
    { title: "Unsafe", url: "http://example.org/page", snippet: "opened", pageRead: true }
  ]);
  assert.equal(memory.getSources("session12345").length, 0);
});
