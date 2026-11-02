"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const languages = require("../modules/multilingual");
test("detects common language scripts and Latin-language hints", () => {
  assert.equal(languages.detectLanguage("你好"), "zh");
  assert.equal(languages.detectLanguage("こんにちは"), "ja");
  assert.equal(languages.detectLanguage("안녕하세요"), "ko");
  assert.equal(languages.detectLanguage("Здравствуйте"), "ru");
  assert.equal(languages.detectLanguage("Hola, ¿cómo estás?"), "es");
  assert.equal(languages.detectLanguage("Bonjour, comment allez-vous?"), "fr");
  assert.equal(languages.detectLanguage("Merhaba, nasılsın?"), "tr");
});
test("responds to greetings and thanks in detected language", () => {
  assert.match(languages.phrase("Hola", "hello"), /Hola/);
  assert.match(languages.phrase("你好", "thanks"), /不客气/);
  assert.match(languages.phrase("Здравствуйте", "unknown"), /проверенной/);
});
test("declares its actual template coverage", () => {
  assert.ok(languages.supportedTemplateLanguages.length >= 15);
});
