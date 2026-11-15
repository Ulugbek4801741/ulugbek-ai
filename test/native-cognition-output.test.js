"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const cognition = require("../native-cognition");

const context = {
  language: { code: "uz" },
  emotion: { emotion: { label: "neutral" } },
  ethics: { category: "none", allowed: true }
};

test("native cognition returns one concise synthesized answer, not a numbered evidence dump", () => {
  const entries = [
    {
      title: "Matn tahlilining zamonaviy metodlari",
      source: "https://example.org/methods",
      content: "Matn tahlilining zamonaviy metodlari tabiiy tilni qayta ishlash usullaridan foydalanadi. Statistik va semantik yondashuvlar matn mazmunini chuqurroq tahlil qilishga yordam beradi."
    },
    {
      title: "Matnni qayta ishlash",
      source: "https://example.org/nlp",
      content: "Matn tahlilining zamonaviy metodlari tabiiy tilni qayta ishlash usullaridan foydalanadi. Statistik va semantik yondashuvlar matn mazmunini chuqurroq tahlil qilishga yordam beradi."
    }
  ];
  const result = cognition.respond("Matn tahlilining zamonaviy metodlari", entries, context);
  assert.equal(result.reasoning.answerable, true);
  assert.ok(result.reasoning.facts.length <= 2);
  assert.match(result.reply, /^Mavjud dalillarga ko‘ra,/);
  assert.doesNotMatch(result.reply, /mustaqil mantiqiy mexanizmi topgan dalillar|Mavzu:|\n1\./i);
  assert.ok(result.reply.length < 1100);
});

test("native cognition clearly says when evidence is insufficient", () => {
  const result = cognition.respond("QWERTY noma'lum mavzu 92831", [], context);
  assert.equal(result.reasoning.answerable, false);
  assert.match(result.reply, /ishonchli javob topa olmadim/i);
});
