"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const relevance = require("../modules/source-relevance");
const { selectAnswer } = require("../modules/answer-selection");
const { searchJobs } = require("../modules/job-search");

test("keeps Uzbekistan population answers separate from India and world statistics", () => {
  const question = "O'zbekiston aholisi soni nechta hozir?";
  const wrong = {
    reply: "Hindiston aholisi 2025-yilda taxminan 1,464 milliard kishini tashkil etgan.",
    reasoning: { answerable: true }
  };
  assert.equal(selectAnswer(wrong, null, question), null);
  assert.equal(relevance.scoreSource(question, {
    title: "O'zbekiston aholisi — rasmiy statistika",
    snippet: "O'zbekiston aholisi soni bo'yicha Milliy statistika qo'mitasi ma'lumotlari."
  }).relevant, true);
});

test("rejects an unrelated world population figure for a country-specific population question", () => {
  const score = relevance.scoreSource("O'zbekiston aholisi soni nechta hozir?", {
    title: "World population and internet use",
    snippet: "Dunyo aholisi va internet foydalanuvchilari soni haqida global statistika."
  });
  assert.equal(score.relevant, false);
});

test("does not claim to have found a Kogon vacancy when no individual listing is available", async () => {
  const result = await searchJobs("Kogondan ish topib ber", {
    async search() { return []; }
  });
  assert.equal(result.results.length, 0);
  assert.match(result.reply, /alohida vakansiya sifatida tekshirish mumkin bo[‘’']lgan e[‘’']lonlar topilmadi/i);
  assert.doesNotMatch(result.reply, /ishga qabul qilindingiz|siz uchun ish topildi/i);
});

test("only returns an opened individual Kogon vacancy page, not a category page", async () => {
  const result = await searchJobs("Kogondan ish topib ber", {
    async search() {
      return [
        { title: "Kogon jobs", url: "https://jobs.example.org/jobs", snippet: "Kogon vakansiyalar" },
        { title: "Kogon warehouse assistant", url: "https://jobs.example.org/vacancy/123", snippet: "Vakansiya: Ombor yordamchisi" }
      ];
    },
    async fetchPage(url) {
      if (url.endsWith("/jobs")) {
        return { title: "Kogon jobs", url, content: "Kogon vakansiyalar ro'yxati. ".repeat(30) };
      }
      return {
        title: "Kogon warehouse assistant",
        url,
        content: ("Vakansiya: Ombor yordamchisi. Ish beruvchi: Kogon Logistics. Manzil: Kogon. Maosh: 4 000 000 so'm. Talablar: ombor tajribasi. Telefon: +998 90 123 45 67. Ariza topshirish uchun murojaat qiling. ").repeat(3)
      };
    }
  });
  assert.ok(result.results.every(item => item.pageRead));
  assert.ok(result.results.every(item => item.url.includes("/vacancy/")));
  assert.equal(result.results.length, 1);
});


test("understands worldwide job search, requested count, and minimum hourly USD pay", () => {
  const criteria = require("../modules/job-search").extractJobCriteria(
    "Butun dunyo bo'ylab soatiga kamida 30 AQSh dollari to'laydigan 15 ta faol ish top"
  );
  assert.equal(criteria.worldwide, true);
  assert.equal(criteria.requestedCount, 15);
  assert.equal(criteria.minHourlyUsd, 30);
  assert.equal(criteria.requireActive, true);
  assert.equal(require("../modules/job-search").hasLocationHint("Butun dunyo bo'ylab"), true);
});

test("extracts hourly USD pay and recognizes an application action", () => {
  const jobs = require("../modules/job-search");
  assert.equal(jobs.extractMinimumHourlyUsd("Compensation: $35-$45 per hour"), 35);
  assert.equal(jobs.extractMinimumHourlyUsd("Hourly rate: USD 32"), 32);
  assert.equal(jobs.hasActiveApplicationEvidence("Apply now to submit your application"), true);
  assert.equal(jobs.hasActiveApplicationEvidence("This position is closed"), false);
});

test("worldwide hourly-pay search returns only opened individual pages with active application evidence and qualifying pay", async () => {
  const jobs = require("../modules/job-search");
  const result = await jobs.searchJobs(
    "Worldwide jobs paying at least $30 per hour, 15 jobs, currently hiring",
    {
      async search() {
        return [
          { title: "Remote analyst", url: "https://careers.example.org/jobs/remote-analyst", snippet: "Remote analyst vacancy" },
          { title: "Remote assistant", url: "https://careers.example.org/jobs/remote-assistant", snippet: "Remote assistant vacancy" },
          { title: "Closed developer", url: "https://careers.example.org/jobs/closed-developer", snippet: "Developer vacancy" }
        ];
      },
      async fetchPage(url) {
        if (url.includes("remote-analyst")) {
          return { title: "Remote analyst", url, content: ("Remote analyst position. Employer: Example Corp. Location: Worldwide remote. Salary: $35 per hour. Requirements: 3 years experience. Apply now. ").repeat(3) };
        }
        if (url.includes("remote-assistant")) {
          return { title: "Remote assistant", url, content: ("Remote assistant position. Employer: Example Corp. Location: Worldwide remote. Salary: $22 per hour. Requirements: 1 year experience. Apply now. ").repeat(3) };
        }
        return { title: "Closed developer", url, content: ("Developer position. Employer: Example Corp. Salary: $55 per hour. Requirements: 5 years experience. This position is closed. ").repeat(3) };
      }
    },
    { limit: 15 }
  );
  assert.equal(result.results.length, 1);
  assert.equal(result.results[0].minimumHourlyUsd, 35);
  assert.equal(result.results[0].activeStatus, "active-application-evidence-found");
});


test("routes Uzbek job requests to the dedicated job-search pipeline", () => {
  const { detectSearchIntent } = require("../modules/universal-web-search");
  assert.equal(detectSearchIntent("Butun dunyo bo'ylab soatiga 30 AQSh dollari beradigan 15 ta ish top").isJobSearch, true);
  assert.equal(detectSearchIntent("Menga hozir faol vakansiyalarni topib ber").isJobSearch, true);
});
