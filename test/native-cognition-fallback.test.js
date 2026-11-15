"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { quickReply } = require("../native-cognition");

test("explains that Bloop has no measured animal body weight", () => {
  const reply = quickReply("Bloop necha kilogram");
  assert.match(reply, /vazni ma’lum emas/);
  assert.match(reply, /1997-yilda/);
});

test("does not invent a weight comparison between Bloop and El Gran Maja", () => {
  const reply = quickReply("Bloop yoki el maja ayt qaysi biri og‘ir");
  assert.match(reply, /kilogrammda solishtirib bo‘lmaydi/);
  assert.match(reply, /tasdiqlanmagan/);
});

test("gives a practical low-risk starting plan for a beginner business", () => {
  const reply = quickReply("Men biznes qilmoqchiman nima maslahat berasan");
  assert.match(reply, /10 potensial mijoz/);
  assert.match(reply, /boshlang‘ich budjetingiz qancha/);
});
