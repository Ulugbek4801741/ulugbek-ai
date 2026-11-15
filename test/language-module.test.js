"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const language = require("../modules/language-module");

test("detects Uzbek Latin and preserves script", () => {
  const result = language.detectLanguage("Menga yordam ber, bu qanday ishlaydi?");
  assert.equal(result.code, "uz");
  assert.equal(result.script, "latin");
});
test("detects Uzbek Cyrillic", () => {
  const result = language.detectLanguage("Менга ёрдам беринг, бу қандай ишлайди?");
  assert.equal(result.code, "uz");
  assert.equal(result.script, "cyrillic");
});
test("detects Russian and English", () => {
  assert.equal(language.detectLanguage("Здравствуйте, помогите мне пожалуйста").code, "ru");
  assert.equal(language.detectLanguage("Hello, can you help me with this?").code, "en");
});
test("explicit requested language overrides message language", () => {
  const result = language.detectLanguage("Iltimos, answer in English");
  assert.equal(result.code, "en");
  assert.equal(result.explicit, true);
});
test("language instruction gives the shared agent response policy", () => {
  const prompt = language.buildLanguageInstruction("Salom, menga yordam bering");
  assert.match(prompt, /O‘zbek tilida/);
  assert.match(prompt, /lotin\/kirill/);
  assert.match(prompt, /bitta yaxlit, professional va tabiiy javob/i);
  assert.match(prompt, /manba nomi yoki havolalarni foydalanuvchiga ko‘rsatmang/);
});
test("status does not falsely claim neural model training", () => {
  assert.equal(language.status().ready, true);
  assert.equal(language.status().neuralModelTraining, false);
});

test("native analyzer normalizes Uzbek text and detects job-search intent", () => {
  const result = language.analyze("  Menga  ish topib ber Kogon shahridan! ");
  assert.equal(result.language.code, "uz");
  assert.equal(result.intent, "job-search");
  assert.equal(result.normalizedText, "Menga ish topib ber Kogon shahridan!");
  assert.ok(result.tokenCount >= 6);
  assert.ok(result.stems.length === result.tokens.length);
});
