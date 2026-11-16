"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { decodeEntities, isAcceptableChatReply } = require("../scripts/chat-smoke-check");

test("accepts a current population reply with a numeric estimate", () => {
  assert.equal(isAcceptableChatReply("Hindiston aholisi 1,463,900,000 kishiga teng."), true);
});

test("accepts a safe fallback when fresh numeric evidence is missing", () => {
  assert.equal(isAcceptableChatReply("Hozirgi aholi sonini tasdiqlaydigan yangilangan, raqamli manba topilmadi."), true);
});

test("rejects a stale prediction without a current population number", () => {
  assert.equal(isAcceptableChatReply("Hindiston aholisi 2025-yilga borib Xitoydan oshib ketishi kutilmoqda."), false);
});

test("rejects unrelated answers", () => {
  assert.equal(isAcceptableChatReply("Dunyo internet foydalanuvchilari soni haqida umumiy ma’lumot."), false);
});

test("decodes common HTML entities safely", () => {
  assert.equal(decodeEntities("Hindiston &mdash; &lsquo;aholi&rsquo; &amp; tarix"), "Hindiston — ’aholi’ & tarix");
});
