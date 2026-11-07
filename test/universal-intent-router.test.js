"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const cognition = require("../native-cognition");

test("universal Uzbek intent router recognizes common domains without a model", () => {
  const cases = [
    ["Ish topib ber", "work"],
    ["Menga matematika o‘rgat", "education"],
    ["Saytimdagi xatoni tuzatib ber", "technology"],
    ["Ariza yozib ber", "documents"],
    ["Biznes loyihamga yordam ber", "business"],
    ["Viza olishga yordam ber", "travel"],
    ["Sog‘lig‘im bo‘yicha tushuntirib ber", "health"],
    ["Qarzlarimni hisoblab ber", "finance"],
    ["Telefon tanlab ber", "shopping"],
    ["Telefonimdagi xatoni tuzatib ber", "technology"],
    ["Internetdan ma’lumot qidirib ber", "research"],
    ["Menga yordam ber", "general"]
  ];
  for (const [prompt, expected] of cases) {
    assert.equal(cognition.classifyIntent(prompt).domain, expected, prompt);
    assert.ok(cognition.actionFallbackReply(prompt), prompt);
  }
});

test("product selection is actionable even without a language model", () => {
  assert.match(cognition.actionFallbackReply("Telefon tanlab ber"), /Mahsulot tanlashga yordam beraman/);
});

test("visa requests are not misclassified as job-search requests", () => {
  assert.equal(cognition.classifyIntent("Viza olishga yordam ber").domain, "travel");
});
