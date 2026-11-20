"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { UNIVERSAL_ANSWER_STANDARD } = require("../modules/universal-answer-standard");

test("universal answer standard requires evidence, Uzbek clarity, and honest tool limits", () => {
  assert.match(UNIVERSAL_ANSWER_STANDARD, /ravon, sodda.*o'zbek/i);
  assert.match(UNIVERSAL_ANSWER_STANDARD, /to'qib chiqarmagin/i);
  assert.match(UNIVERSAL_ANSWER_STANDARD, /rasm/i);
  assert.match(UNIVERSAL_ANSWER_STANDARD, /bajarilganini faqat haqiqiy vosita/i);
  assert.match(UNIVERSAL_ANSWER_STANDARD, /yakuniy tekshiruv/i);
});
