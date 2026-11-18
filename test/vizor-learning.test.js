"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { normalizePhone, validateEmail, validatePassword, hashPassword, isYoutubeUrl } = require("../modules/vizor-learning");

test("VIZOR email validation normalizes valid email addresses", () => {
  assert.equal(validateEmail(" Student@Example.com "), "student@example.com");
  assert.equal(validateEmail("not-an-email"), "");
  assert.equal(validateEmail("missing-domain@"), "");
});

test("VIZOR phone normalization removes display separators", () => {
  assert.equal(normalizePhone("+998 (90) 123-45-67"), "+998901234567");
});

test("passwords require 8–16 allowed characters including upper, lower, digit and underscore", () => {
  assert.equal(validatePassword("A1_ulugbek"), true);
  assert.equal(validatePassword("A1_abcd"), false);
  assert.equal(validatePassword("a1_ulugbek"), false);
  assert.equal(validatePassword("A_ulugbek"), false);
  assert.equal(validatePassword("A1ULUGBEK"), false);
  assert.equal(validatePassword("A1_ulugbektoolong"), false);
  assert.equal(validatePassword("A1_abc!"), false);
  assert.equal(validatePassword(""), false);
});

test("VIZOR password hashing is salted and repeatable", () => {
  const salt = "a".repeat(32);
  const first = hashPassword("long-test-password", salt);
  assert.equal(first, hashPassword("long-test-password", salt));
  assert.notEqual(first, hashPassword("different-password", salt));
  assert.notEqual(first, hashPassword("long-test-password", "b".repeat(32)));
});

test("VIZOR accepts YouTube embed URLs and rejects unrelated hosts", () => {
  assert.equal(isYoutubeUrl("https://youtu.be/abc12345678"), true);
  assert.equal(isYoutubeUrl("https://www.youtube.com/watch?v=abc12345678"), true);
  assert.equal(isYoutubeUrl("https://example.com/video.mp4"), false);
  assert.equal(isYoutubeUrl("javascript:alert(1)"), false);
});
