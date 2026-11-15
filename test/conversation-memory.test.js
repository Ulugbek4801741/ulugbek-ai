"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const memory = require("../modules/conversation-memory");

test("retains job-search intent when the user answers with only a city", () => {
  memory.clear();
  memory.remember("session-12345678", "Ish topib ber");
  assert.equal(memory.expand("session-12345678", "Kogon"), "Ish topib ber Kogon");
  memory.remember("session-12345678", "Ish topib ber Kogon");
  assert.equal(memory.expand("session-12345678", "Buxoro"), "Ish topib ber Kogon Buxoro");
});

test("does not expand unrelated short messages or mix separate sessions", () => {
  memory.clear();
  memory.remember("session-12345678", "Dasturlashda yordam ber");
  assert.equal(memory.expand("session-12345678", "Kogon"), "Kogon");
  assert.equal(memory.expand("another-session-123", "Kogon"), "Kogon");
});

test("keeps the original city when the user repeats a short job request", () => {
  memory.clear();
  const first = "Menga ish topib ber Kogon shahridan";
  memory.remember("session-12345678", first);
  const expanded = memory.expand("session-12345678", "Ish topib ber");
  assert.match(expanded, /Kogon/i);
  assert.match(expanded, /Ish topib ber/i);
});
