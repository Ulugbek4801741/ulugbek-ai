"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { decodeEntities, isAcceptableChatReply } = require("../scripts/chat-smoke-check");

test("accepts an on-topic India population response with HTML entities", () => {
  assert.equal(isAcceptableChatReply("Tavsif: Hindiston &mdash; aholisi soni bo‘yicha birinchi."), true);
});

test("accepts a safe insufficient-evidence response", () => {
  assert.equal(isAcceptableChatReply("Topilgan ma’lumotlar savolingiz mavzusiga mosligi tekshiruvidan o‘tmadi."), true);
});

test("rejects unrelated answers", () => {
  assert.equal(isAcceptableChatReply("Dunyo internet foydalanuvchilari soni haqida umumiy ma’lumot."), false);
});

test("decodes common HTML entities safely", () => {
  assert.equal(decodeEntities("Hindiston &mdash; &lsquo;aholi&rsquo; &amp; tarix"), "Hindiston — ’aholi’ & tarix");
});
