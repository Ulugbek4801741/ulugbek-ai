"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { searchWeb } = require("../modules/universal-web-search");

test("searchWeb excludes unrelated pages even when they are readable", async () => {
  const pages = [
    { title: "OCR dasturlari", url: "https://example.org/ocr", snippet: "Optik belgilarni aniqlash va hujjatlarni raqamlashtirish." },
    { title: "Qadimgi Xitoy tarixi", url: "https://history.example.org/china", snippet: "Xitoyning qadimgi sulolalari va davlat tarixi." }
  ];
  const adapter = {
    async search() { return pages; },
    async fetchPage(url) { return pages.find(page => page.url === url) || null; }
  };
  const result = await searchWeb("Xitoyning qadimgi tarixi haqida ma'lumot ber", adapter);
  assert.equal(result.relevanceChecked, true);
  assert.equal(result.results.length, 1);
  assert.match(result.results[0].title, /Xitoy/);
  assert.equal(result.rejectedIrrelevantCount, 1);
});

test("searchWeb fails closed when no result matches the user's topic", async () => {
  const adapter = {
    async search() {
      return [{ title: "OCR dasturlari", url: "https://example.org/ocr", snippet: "Optik belgilarni aniqlash." }];
    },
    async fetchPage(url) { return { title: "OCR dasturlari", url, content: "Optik belgilarni aniqlash." }; }
  };
  const result = await searchWeb("Badiiy matnlarni tahlil qilish metodikasi", adapter);
  assert.equal(result.relevanceChecked, true);
  assert.equal(result.results.length, 0);
  assert.match(result.reply, /bevosita mosligi tasdiqlanmadi/i);
});
