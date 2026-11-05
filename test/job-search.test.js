"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { detectSearchIntent, buildUniversalSearchQuery, buildUniversalSearchQueries, searchWeb, evidenceEntries, formatEvidenceReply } = require("../modules/universal-web-search");
const { knowledgeContext, SYSTEM_PROMPT } = require("../modules/single-agent");
const { isJobSearchRequest, hasLocationHint, locationClarification, searchJobs, cleanText, decodeHtmlEntities } = require("../modules/job-search");

test("searches only explicit discovery, job, and current-information requests", () => {
  for (const q of ["Bugun ob-havo qanday?", "Bugungi eng so'nggi yangiliklarni top", "Shveysariyada traktorchi ish topish", "Menga vakansiya qidirib ber", "YouTube kanalining linkini topib ber"]) assert.equal(detectSearchIntent(q).shouldSearch, true, q);
  for (const q of ["JavaScriptda API server qanday yoziladi?", "O'zbekistonda kichik biznesni qanday boshlash mumkin?", "Fotosintez nima?", "Qonuniy shartnoma qanday tuziladi?", "Menga ingliz tilidan yordam ber", "Menga dasturlashda yordam ber"]) assert.equal(detectSearchIntent(q).shouldSearch, false, q);
});
test("keeps greetings, thanks and arithmetic local", () => {
  assert.equal(detectSearchIntent("Assalomu alaykum").shouldSearch, false);
  assert.equal(detectSearchIntent("Katta rahmat").shouldSearch, false);
  assert.equal(detectSearchIntent("25 * 4").shouldSearch, false);
});
test("detects job and platform search intents", () => {
  assert.equal(detectSearchIntent("Ish topib ber").isJobSearch, true);
  assert.equal(detectSearchIntent("Menga vakansiya top").isJobSearch, true);
  assert.equal(detectSearchIntent("YouTube kanalining linkini topib ber").shouldSearch, true);
  assert.ok(detectSearchIntent("Instagram profil manzilini top").platforms.includes("site:instagram.com"));
});
test("creates multiple distinct search queries for independent discovery", () => {
  const queries = buildUniversalSearchQueries("Telegramdagi rasmiy kanal linkini top");
  assert.equal(queries.length, 3);
  assert.ok(queries[0].includes("Telegramdagi"));
  assert.ok(queries[1].includes("site:t.me"));
  assert.match(queries[2], /rasmiy sayt/);
  assert.match(buildUniversalSearchQuery("Traktor operatori uchun ish top"), /jobs vacancies/);
});
test("reads pages, searches in parallel and deduplicates results from same URL", async () => {
  const calls = [];
  const web = {
    async search(q) { calls.push(q); return [{ title: "Example", url: "https://example.org/a", snippet: "short" }, { title: "Second", url: "https://gov.example/a", snippet: "short" }]; },
    async fetchPage(url) { return { title: "Read " + url, url, content: "Full page text and evidence. ".repeat(60) }; }
  };
  const result = await searchWeb("Fotosintez nima?", web);
  assert.equal(calls.length, 3);
  assert.equal(result.results.length, 2);
  assert.equal(result.results[0].pageRead, true);
  assert.ok(result.results[0].snippet.length > 1000);
});
test("keeps source metadata in evidence entries", () => {
  const entries = evidenceEntries([{ title: "Example", snippet: "Full text", url: "https://example.org", pageRead: true, qualityScore: 2 }]);
  assert.equal(entries[0].status, "unverified-public-page-content");
  assert.equal(entries[0].sourceQuality, 2);
});
test("fallback distinguishes page reads from search snippets and never claims verification", () => {
  const reply = formatEvidenceReply([{ title: "Public source", snippet: "Useful evidence", url: "https://example.org", pageRead: false }]);
  assert.match(reply, /Useful evidence/);
  assert.match(reply, /faqat qidiruv parchasi/);
  assert.match(reply, /avtomatik xulosa emas/);
});
test("no-result and search errors are explicit", async () => {
  const empty = await searchWeb("Ish topib ber", { search: async () => [] });
  assert.equal(empty.results.length, 0);
  const broken = await searchWeb("Fotosintez nima?", { search: async () => { throw new Error("offline"); } });
  assert.equal(broken.ok, true);
  assert.equal(broken.results.length, 0);
});
test("language model instructions require direct answers grounded in evidence", () => {
  assert.match(SYSTEM_PROMPT, /foydalanuvchining asl maqsadiga/);
  assert.match(SYSTEM_PROMPT, /birlamchi rasmiy manbalarni ustun qo'ying/);
  const context = knowledgeContext([{ title: "Test", content: "Page text", source: "https://example.org", status: "unverified-public-page-content" }]);
  assert.match(context, /Page text/);
  assert.match(context, /https:\/\/example\.org/);
});

test("asks for a target location before searching a vague job request", () => {
  assert.equal(hasLocationHint("Ish topib ber"), false);
  assert.equal(hasLocationHint("Shveysariyada traktorchi ish topish"), true);
  assert.equal(hasLocationHint("O'zbekistonda ish topib ber"), true);
  assert.equal(hasLocationHint("Buxoroda ish qidirib ber"), true);
  assert.match(locationClarification(), /qaysi davlat yoki shaharda/);
});

test("job search detects job intent and returns read public listing details", async () => {
  assert.equal(isJobSearchRequest("Ish topib ber"), true);
  const result = await searchJobs("Shveysariyada traktorchi ish topish", {
    async search(query) {
      assert.match(query, /Shveysariyada/);
      return [{ title: "Tractor operator vacancy", url: "https://jobs.example.org/tractor", snippet: "Tractor operator role, full time." }];
    },
    async fetchPage(url) {
      return { title: "Tractor operator vacancy", url, content: "Employer listing with role, location and application details.".repeat(3) };
    }
  });
  assert.equal(result.results.length, 1);
  assert.match(result.reply, /Tractor operator vacancy/);
  assert.match(result.reply, /https:\/\/jobs\.example\.org\/tractor/);
});

test("job search output decodes nested HTML entities from search snippets", () => {
  assert.equal(decodeHtmlEntities("bo&amp;#x27;sh ish o&amp;#x27;rni"), "bo'sh ish o'rni");
  assert.equal(cleanText("Buxoroda bo&amp;#x27;sh ish o&amp;#x27;rinlari"), "Buxoroda bo'sh ish o'rinlari");
  assert.equal(cleanText("A &amp;amp; B"), "A & B");
});
