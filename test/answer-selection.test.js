"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { isAnswerable, isTopicallyRelevant, selectAnswer } = require("../modules/answer-selection");

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


test("rejects an answer that mentions India only in an unrelated list", () => {
  const wrong = {
    reply: "Tabobat tarixi insoniyat tarixi bilan bog‘liq. Qadimgi Sharqda Misr, Hindiston va Markaziy Osiyo xalqlari kasalliklarni o‘rgangan.",
    reasoning: { answerable: true }
  };
  assert.equal(isTopicallyRelevant("Hindiston tarixi haqida ma'lumot ber", wrong), false);
  assert.equal(selectAnswer(wrong, null, "Hindiston tarixi haqida ma'lumot ber"), null);
});

test("rejects an unrelated global statistic for India population", () => {
  const wrong = {
    reply: "Dunyo aholisining soni yetti milliarddan oshgan, shundan uch milliard internetga ulangan.",
    reasoning: { answerable: true }
  };
  assert.equal(selectAnswer(wrong, null, "Hindiston aholi soni haqida ma'lumot ber"), null);
});

test("accepts an answer that directly addresses India population", () => {
  const good = {
    reply: "Hindiston aholisi 2025-yilda taxminan 1,464 milliard kishini tashkil etgan.",
    reasoning: { answerable: true }
  };
  assert.equal(selectAnswer(good, null, "Hindiston aholi soni haqida ma'lumot ber"), good);
});


test("keeps deterministic intent-based learning and programming replies", () => {
  const lesson = {
    reply: "Bugungi 1-dars: Hello — Salom.",
    reasoning: { answerable: true, method: "built-in-dialogue" }
  };
  const programming = {
    reply: "Qaysi til — Python, JavaScript yoki Kotlin?",
    reasoning: { answerable: true, method: "built-in-dialogue" }
  };
  assert.equal(selectAnswer(lesson, null, "Menga ingliz tilidan yordam ber"), lesson);
  assert.equal(selectAnswer(programming, null, "Menga dasturlashda yordam ber"), programming);
});
