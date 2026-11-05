"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { detectSearchIntent, buildUniversalSearchQuery, searchWeb } = require("../modules/universal-web-search");

test("detects job requests and general website/link searches", () => {
  assert.equal(detectSearchIntent("Ish topib ber").isJobSearch, true);
  assert.equal(detectSearchIntent("Menga vakansiya top").isJobSearch, true);
  assert.equal(detectSearchIntent("YouTube kanalining linkini topib ber").shouldSearch, true);
  assert.equal(detectSearchIntent("Instagram profil manzilini top").platforms.includes("site:instagram.com"), true);
  assert.equal(detectSearchIntent("Bugun ob-havo qanday?").shouldSearch, false);
});

test("adds relevant platform domains and preserves original request", () => {
  const query = buildUniversalSearchQuery("Telegramdagi rasmiy kanal linkini top");
  assert.match(query, /Telegramdagi/);
  assert.match(query, /site:t\\.me/);
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
      assert.match(query, /site:youtube\\.com/);
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
  assert.match(result.reply, /https:\\/\\/youtube.com\\/@example/);
  assert.equal(result.results[0].pageRead, true);
});

test("reports empty search results honestly", async () => {
  const result = await searchWeb("Ish topib ber", { search: async () => [] });
  assert.equal(result.ok, true);
  assert.equal(result.results.length, 0);
  assert.match(result.reply, /mos natija topolmadi/);
});
