"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  detectSearchIntent, buildUniversalSearchQuery, searchWeb,
  evidenceEntries, formatEvidenceReply
} = require("../modules/universal-web-search");

test("researches arbitrary questions across different topics", () => {
  for (const question of [
    "Bugun ob-havo qanday?",
    "JavaScriptda API server qanday yoziladi?",
    "O'zbekistonda kichik biznesni qanday boshlash mumkin?",
    "Fotosintez nima?",
    "Menga Shveysariyadan qishloq xo'jaligi ishlarini top"
  ]) {
    assert.equal(detectSearchIntent(question).shouldSearch, true, question);
  }
});

test("keeps greetings, thanks and plain arithmetic local", () => {
  assert.equal(detectSearchIntent("Assalomu alaykum").shouldSearch, false);
  assert.equal(detectSearchIntent("Katta rahmat").shouldSearch, false);
  assert.equal(detectSearchIntent("25 * 4").shouldSearch, false);
});

test("detects job requests and general website/link searches", () => {
  assert.equal(detectSearchIntent("Ish topib ber").isJobSearch, true);
  assert.equal(detectSearchIntent("Menga vakansiya top").isJobSearch, true);
  assert.equal(detectSearchIntent("YouTube kanalining linkini topib ber").shouldSearch, true);
  assert.equal(detectSearchIntent("Instagram profil manzilini top").platforms.includes("site:instagram.com"), true);
});

test("adds relevant platform domains and preserves original request", () => {
  const query = buildUniversalSearchQuery("Telegramdagi rasmiy kanal linkini top");
  assert.match(query, /Telegramdagi/);
  assert.ok(query.includes("(site:t.me OR site:telegram.org)"));
  assert.match(query, /official page link/);
});

test("expands job search requests into vacancy terms", () => {
  const query = buildUniversalSearchQuery("Traktor operatori uchun ish top");
  assert.match(query, /Traktor operatori/);
  assert.match(query, /vakansiya/);
  assert.match(query, /jobs vacancies/);
});

test("returns public source-linked results and page-read status", async () => {
  const webSearch = {
    async search(query) {
      assert.ok(query.includes("site:youtube.com"));
      return [{ title: "Official channel", url: "https://youtube.com/@example", snippet: "Public channel result" }];
    },
    async fetchPage() {
      return { title: "Official channel page", url: "https://youtube.com/@example", content: "Public channel information and description.".repeat(5) };
    }
  };
  const result = await searchWeb("YouTube kanal linkini top", webSearch);
  assert.equal(result.ok, true);
  assert.equal(result.results.length, 1);
  assert.match(result.reply, /ULUGBEK AI internet qidiruvida/);
  assert.ok(result.reply.includes("https://youtube.com/@example"));
  assert.equal(result.results[0].pageRead, true);
});

test("maps search results to untrusted evidence for one-agent synthesis", () => {
  const entries = evidenceEntries([{
    title: "Example",
    snippet: "Public page content",
    url: "https://example.org",
    pageRead: true
  }]);
  assert.deepEqual(entries, [{
    title: "Example",
    content: "Public page content",
    source: "https://example.org",
    status: "unverified-public-page-content"
  }]);
});

test("provides source-linked fallback when no synthesis model is configured", () => {
  const reply = formatEvidenceReply([{
    title: "Public source",
    snippet: "Useful source excerpt",
    url: "https://example.org",
    pageRead: false
  }]);
  assert.match(reply, /Useful source excerpt/);
  assert.match(reply, /https:\/\/example\.org/);
  assert.match(reply, /mustaqil tasdiqlanmagan/);
});

test("reports empty search results honestly", async () => {
  const result = await searchWeb("Ish topib ber", { search: async () => [] });
  assert.equal(result.ok, true);
  assert.equal(result.results.length, 0);
  assert.match(result.reply, /mos natija topolmadi/);
});

test("reports search adapter failures without throwing", async () => {
  const result = await searchWeb("Fotosintez nima?", { search: async () => { throw new Error("offline"); } });
  assert.equal(result.ok, false);
  assert.equal(result.results.length, 0);
  assert.match(result.error, /offline/);
});
