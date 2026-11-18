"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const language = require("../modules/language-module");
const cognition = require("../native-cognition");

test("Uzbek request to answer in English is detected as explicit English", () => {
  const result = language.detectLanguage("Ingiliz tilida javob ber");
  assert.equal(result.code, "en");
  assert.equal(result.explicit, true);
});

test("English greeting receives an English fallback reply", () => {
  const result = cognition.respond("Hello", []);
  assert.match(result.reply, /^Hello!/);
});

test("English language switch receives English acknowledgement", () => {
  const result = cognition.respond("Ingiliz tilida javob ber", []);
  assert.match(result.reply, /^Understood\./);
});

test("Russian greeting receives a Russian fallback reply", () => {
  const result = cognition.respond("Здравствуйте", []);
  assert.match(result.reply, /^Здравствуйте!/);
});
