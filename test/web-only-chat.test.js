"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { compactFacts, answer } = require("../modules/web-only-chat");

test("compactFacts returns one concise, deduplicated answer", () => {
  const facts = compactFacts([
    { fact: "Birinchi tekshirilgan fakt yetarli darajada uzun va aniq." },
    { fact: "Birinchi tekshirilgan fakt yetarli darajada uzun va aniq." },
    { fact: "Ikkinchi tekshirilgan fakt ham mavzuga bevosita mos." }
  ]);
  assert.equal(facts.length, 2);
});

test("web-only answer uses only supplied public web evidence and does not call a model", async () => {
  let searchCalls = 0;
  let reasonCalls = 0;
  const result = await answer("Ochiq internetdagi mavzu haqida ma'lumot", {}, {
    searchWeb: async () => {
      searchCalls++;
      return { ok: true, results: [
        { title: "Rasmiy sahifa", url: "https://example.org/facts", pageRead: true, snippet: "Bu mavzu haqida o‘qilgan va savolga bevosita mos dalil matni yetarlicha uzun." }
      ] };
    },
    reason: (_query, evidence) => {
      reasonCalls++;
      assert.equal(evidence.length, 1);
      return { answerable: true, facts: [{ fact: "Bu mavzu haqida o‘qilgan va savolga bevosita mos dalil matni yetarlicha uzun." }] };
    }
  });
  assert.equal(searchCalls, 1);
  assert.equal(reasonCalls, 1);
  assert.equal(result.answerable, true);
  assert.equal(result.method, "single-web-evidence-answer-no-model");
  assert.match(result.reply, /o‘qilgan/);
});

test("search snippets are rejected unless the public page was actually opened", async () => {
  const result = await answer("Ochiq internetdagi mavzu haqida ma'lumot", {}, {
    searchWeb: async () => ({ ok: true, results: [
      { title: "Qidiruv parchasi", url: "https://example.org/facts", pageRead: false, snippet: "Bu qidiruv parchasida mavzuga tegishli matn bor, ammo sahifa o‘qilmadi." }
    ] }),
    reason: () => { throw new Error("unread snippets must not be treated as evidence"); }
  });
  assert.equal(result.answerable, false);
  assert.equal(result.sourceCount, 0);
  assert.match(result.reply, /o‘qilgan ishonchli manba topilmadi/);
});

test("web-only answer does not invent an answer when search evidence is absent", async () => {
  const result = await answer("Ochiq internetdagi mavzu haqida ma'lumot", {}, {
    searchWeb: async () => ({ ok: true, results: [] }),
    reason: () => { throw new Error("must not run without evidence"); }
  });
  assert.equal(result.answerable, false);
  assert.equal(result.sourceCount, 0);
  assert.match(result.reply, /manba topilmadi/);
});
