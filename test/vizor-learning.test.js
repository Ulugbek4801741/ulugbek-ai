"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { normalizePhone, validateEmail, hashPassword } = require("../modules/vizor-learning");

test("VIZOR email validation normalizes valid email addresses", () => {
  assert.equal(validateEmail(" Student@Example.com "), "student@example.com");
  assert.equal(validateEmail("not-an-email"), "");
  assert.equal(validateEmail("missing-domain@"), "");
});

test("VIZOR phone normalization removes display separators", () => {
  assert.equal(normalizePhone("+998 (90) 123-45-67"), "+998901234567");
});

test("VIZOR password hashing is salted and repeatable", () => {
  const salt = "a".repeat(32);
  const first = hashPassword("long-test-password", salt);
  assert.equal(first, hashPassword("long-test-password", salt));
  assert.notEqual(first, hashPassword("different-password", salt));
  assert.notEqual(first, hashPassword("long-test-password", "b".repeat(32)));
});
