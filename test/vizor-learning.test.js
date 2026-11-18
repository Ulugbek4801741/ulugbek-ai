"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { normalizePhone, validateEmail, hashPassword, isYoutubeUrl } = require("../modules/vizor-learning");

test("ULUGBEK AI email tekshiruvi normalizes valid email addresses", () => {
  assert.equal(validateEmail(" Student@Example.com "), "student@example.com");
  assert.equal(validateEmail("not-an-email"), "");
  assert.equal(validateEmail("missing-domain@"), "");
});

test("ULUGBEK AI telefon raqamini normallashtirish removes display separators", () => {
  assert.equal(normalizePhone("+998 (90) 123-45-67"), "+998901234567");
});

test("ULUGBEK AI parol xeshlash is salted and repeatable", () => {
  const salt = "a".repeat(32);
  const first = hashPassword("long-test-password", salt);
  assert.equal(first, hashPassword("long-test-password", salt));
  assert.notEqual(first, hashPassword("different-password", salt));
  assert.notEqual(first, hashPassword("long-test-password", "b".repeat(32)));
});

test("ULUGBEK AI YouTube havolalarini tekshiradi embed URLs and rejects unrelated hosts", () => {
  assert.equal(isYoutubeUrl("https://youtu.be/abc12345678"), true);
  assert.equal(isYoutubeUrl("https://www.youtube.com/watch?v=abc12345678"), true);
  assert.equal(isYoutubeUrl("https://example.com/video.mp4"), false);
  assert.equal(isYoutubeUrl("javascript:alert(1)"), false);
});
