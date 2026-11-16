"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { detectSearchIntent } = require("../modules/universal-web-search");

test("recognizes Uzbek inflected remote job-search requests", () => {
  for (const phrase of [
    "Dunyo bo‘ylab masofaviy Python dasturchi ishlarini top.",
    "Python dasturchi ishlarini qidirib ber",
    "Masofaviy ishlarni topib ber",
    "Dasturchilik ish o‘rinlarini izla"
  ]) {
    const intent = detectSearchIntent(phrase);
    assert.equal(intent.isJobSearch, true, phrase);
  }
});

test("does not classify unrelated work discussion as job search", () => {
  assert.equal(detectSearchIntent("Ish jarayonini qanday yaxshilash mumkin?").isJobSearch, false);
});
