"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { isJobSearchRequest, buildJobSearchQuery, searchJobs } = require("../modules/job-search");

test("detects Uzbek and English job-search requests", () => {
  assert.equal(isJobSearchRequest("Ish topib ber"), true);
  assert.equal(isJobSearchRequest("Menga vakansiya top"), true);
  assert.equal(isJobSearchRequest("Find me a job"), true);
  assert.equal(isJobSearchRequest("Bugun ob-havo qanday?"), false);
});

test("expands job queries without discarding the user's original request", () => {
  const query = buildJobSearchQuery("Traktor operatori uchun ish top");
  assert.match(query, /Traktor operatori/);
  assert.match(query, /vakansiya/);
  assert.match(query, /jobs vacancies/);
});

test("returns source-linked job results and marks page verification status", async () => {
  const webSearch = {
    async search(query) {
      assert.match(query, /vakansiya/);
      return [{ title: "Farm equipment operator", url: "https://jobs.example.org/1", snippet: "Seasonal farm role" }];
    },
    async fetchPage() {
      return { title: "Farm equipment operator vacancy", url: "https://jobs.example.org/1", content: "Employer details and application information.".repeat(5) };
    }
  };
  const result = await searchJobs("Ish topib ber", webSearch);
  assert.equal(result.ok, true);
  assert.equal(result.results.length, 1);
  assert.match(result.reply, /ULUGBEK AI internetdan/);
  assert.match(result.reply, /https:\/\/jobs.example.org\/1/);
  assert.equal(result.results[0].pageRead, true);
});

test("reports an empty search honestly instead of inventing vacancies", async () => {
  const result = await searchJobs("Ish topib ber", { search: async () => [] });
  assert.equal(result.ok, true);
  assert.equal(result.results.length, 0);
  assert.match(result.reply, /Bu ish yo'q degani emas/);
});
