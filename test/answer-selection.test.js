"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { isAnswerable, selectAnswer } = require("../modules/answer-selection");

test("keeps a valid model answer over a local fallback", () => {
  const model = { reply: "Model javobi", reasoning: { answerable: true } };
  const local = { reply: "Mahalliy javob", reasoning: { answerable: true } };
  assert.equal(selectAnswer(model, local), model);
});

test("uses a valid local answer when model output is not answerable", () => {
  const weak = { reply: "Noaniq javob", reasoning: { answerable: false } };
  const local = { reply: "Mahalliy bilimga asoslangan javob", reasoning: { answerable: true } };
  assert.equal(selectAnswer(weak, local), local);
});

test("does not promote an empty or unanswerable local candidate", () => {
  const weak = { reply: "Javob yo‘q", reasoning: { answerable: false } };
  const local = { reply: "   ", reasoning: { answerable: true } };
  assert.equal(isAnswerable(local), false);
  assert.equal(selectAnswer(weak, local), weak);
});

test("returns null when neither candidate contains an answer", () => {
  assert.equal(selectAnswer(null, null), null);
});
