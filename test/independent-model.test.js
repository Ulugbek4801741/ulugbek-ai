"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { createIndependentModel } = require("../modules/independent-model");

test("independent model answers only from approved local HTTPS knowledge", async () => {
  let seenLimit = 0;
  const model = createIndependentModel({
    knowledge: { searchKnowledge: async (_query, limit) => {
      seenLimit = limit;
      return [
        { title: "Tasdiqlangan", content: "ULUGBEK AI ochiq bilimlar bazasi tasdiqlangan ma'lumotlarni saqlaydi. U manbani ko'rsatadi.", source: "https://example.org/approved", status: "approved", language: "uz" },
        { title: "Kutilmoqda", content: "Bu tasdiqlanmagan ma'lumot va javobga kiritilmasligi kerak.", source: "https://example.org/pending", status: "pending-review", language: "uz" },
        { title: "Noto'g'ri manba", content: "Bu HTTPS manba emas va ishlatilmasligi kerak.", source: "http://example.org/no", status: "approved", language: "uz" }
      ];
    } },
    cognition: { respond: (_query, entries) => ({
      reply: "Mahalliy dalil topildi.",
      reasoning: { answerable: entries.length === 1, facts: entries }
    }) }
  });
  const result = await model.answer("ULUGBEK bilimlar bazasi nima?");
  assert.equal(seenLimit, 8);
  assert.equal(result.provider, "none");
  assert.equal(result.externalModelCalled, false);
  assert.equal(result.conversationSaved, false);
  assert.equal(result.knowledgeUsed, 1);
  assert.equal(result.sources.length, 1);
  assert.equal(result.answerable, true);
});

test("independent model rejects empty and oversized questions", async () => {
  const model = createIndependentModel({
    knowledge: { searchKnowledge: async () => [] },
    cognition: { respond: () => ({ reply: "no", reasoning: { answerable: false } }) }
  });
  await assert.rejects(model.answer(" "), error => error.statusCode === 400);
  await assert.rejects(model.answer("x".repeat(4001)), error => error.statusCode === 413);
});

test("independent model status explicitly reports provider-free limits", () => {
  const model = createIndependentModel({
    knowledge: { searchKnowledge: async () => [] },
    cognition: { respond: () => ({ reply: "no", reasoning: { answerable: false } }) }
  });
  const status = model.status();
  assert.equal(status.provider, "none");
  assert.equal(status.externalModelRequired, false);
  assert.equal(status.conversationPersistence, false);
  assert.match(status.limitation, /ChatGPT/);
});
