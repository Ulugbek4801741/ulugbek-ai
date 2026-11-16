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
  assert.match(result.reply, /alohida vakansiya sifatida tekshirish mumkin bo'lgan e'lonlar topilmadi/i);
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
