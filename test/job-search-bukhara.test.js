"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { isJobSearchRequest, hasLocationHint, buildJobSearchQueries, searchJobs } = require("../modules/job-search");
const { detectSearchIntent } = require("../modules/universal-web-search");

test("routes the natural Uzbek phrase 'Buxoro ish o'rinlari topib ber' to job search", () => {
  const query = "Buxoro ish o'rinlari topib ber";
  assert.equal(isJobSearchRequest(query), true);
  assert.equal(hasLocationHint(query), true);
  assert.equal(detectSearchIntent(query).isJobSearch, true);
  const searches = buildJobSearchQueries(query);
  assert.ok(searches.some(item => item.includes("site:buxorodaish.uz")));
  assert.ok(searches.some(item => item.includes("site:gov.uz")));
  assert.ok(searches.some(item => item.includes("site:vacancy.gov.uz")));
});

test("does not skip structured public job feeds when a separate vacancy page was read", async () => {
  const feedUrls = [];
  const result = await searchJobs("Buxoro ish o'rinlari topib ber", {
    async search() {
      return [{
        title: "Buxoro vakansiya operatori",
        url: "https://jobs.example.org/buxoro/operator-1",
        snippet: "Buxoro vakansiya operatori"
      }];
    },
    async fetchPage(url) {
      return {
        title: "Buxoro vakansiya operatori",
        url,
        content: ("Vakansiya: Operator. Ish beruvchi: Buxoro Example MChJ. Manzil: Buxoro. Maosh: 4 000 000 so'm. Talablar: tajriba. Telefon: +998 90 123 45 67. Ariza topshirish uchun murojaat qiling. ").repeat(3)
      };
    }
  }, {
    feedOptions: {
      fetchImpl: async url => {
        feedUrls.push(url);
        const payload = url.includes("remotive.com") ? { jobs: [] }
          : url.includes("remoteok.com") ? []
          : { data: [] };
        return {
          ok: true,
          status: 200,
          headers: { get: () => "2" },
          text: async () => JSON.stringify(payload)
        };
      }
    }
  });
  assert.equal(result.openedPages, 1);
  assert.equal(result.feedsChecked, 3);
  assert.equal(feedUrls.length, 3);
  assert.equal(result.results.length, 1);
});
