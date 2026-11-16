"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const relevance = require("../modules/source-relevance");

test("accepts sources that match the actual subject", () => {
  const score = relevance.scoreSource("Xitoyning qadimgi tarixi haqida ma'lumot ber", {
    title: "Qadimgi Xitoy tarixi",
    snippet: "Xitoyda Shan, Chjou, Sin va Xan sulolalari davrida davlat rivojlangan."
  });
  assert.equal(score.relevant, true);
  assert.ok(score.matchedTerms.includes("xitoy"));
});

test("rejects a high-authority but unrelated OCR source for a literature question", () => {
  const score = relevance.scoreSource("Badiiy matnlarni tahlil qilish metodikasi", {
    title: "OCR dasturlari va hujjatlarni raqamlashtirish",
    snippet: "Optik belgilarni aniqlash, skanerlangan hujjatlar va matnni tanib olish."
  });
  assert.equal(score.relevant, false);
});

test("filters unrelated sources before returning search results", () => {
  const selected = relevance.filterRelevantSources("Xitoy qadimgi tarixi", [
    { title: "OCR texnologiyasi", snippet: "Hujjatlarni tanib olish" },
    { title: "Qadimgi Xitoy tarixi", snippet: "Xitoy sulolalari tarixi" }
  ]);
  assert.equal(selected.length, 1);
  assert.match(selected[0].title, /Xitoy/);
});

test("does not treat generic question words as subject evidence", () => {
  const score = relevance.scoreSource("Menga bu haqida ma'lumot ber", {
    title: "OCR software tools",
    snippet: "Optical character recognition technology"
  });
  assert.equal(score.relevant, false);
});
