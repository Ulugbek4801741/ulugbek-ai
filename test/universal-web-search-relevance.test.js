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


test("city overview search adds city-specific history and official statistics queries", () => {
  const { buildUniversalSearchQueries } = require("../modules/universal-web-search");
  const queries = buildUniversalSearchQueries("Buxoro viloyati Kogon shahri haqida ma'lumot ber");
  assert.ok(queries.some(query => /Kogon city history railway station Uzbekistan/i.test(query)));
  assert.ok(queries.some(query => /Kogon city official statistics population history/i.test(query)));
});

test("general city research removes an embedded weather widget but preserves place facts", () => {
  const { removeWeatherWidgetContent } = require("../modules/universal-web-search");
  const source = "Kogon — Buxoro viloyati. Hozirgi ob-havo 14°C His qilish 13°C 42% Namlik 3.2 m/s Shamol tezligi 0 mm Yog'in Yangilangan: 05:52 · Open-Meteo API Kogon haqida Asosiy ma'lumot Temiryo'l stansiyasi sifatida paydo bo'lgan.";
  const cleaned = removeWeatherWidgetContent(source, "Buxoro viloyati Kogon shahri haqida ma'lumot ber");
  assert.match(cleaned, /Kogon haqida Asosiy ma'lumot/);
  assert.match(cleaned, /Temiryo'l stansiyasi/);
  assert.doesNotMatch(cleaned, /14°C|Open-Meteo|Namlik|Shamol tezligi/);
});

test("explicit weather questions retain weather evidence", () => {
  const { removeWeatherWidgetContent } = require("../modules/universal-web-search");
  const source = "Kogon — Hozirgi ob-havo 14°C Namlik 42% Open-Meteo API";
  assert.equal(removeWeatherWidgetContent(source, "Kogon ob-havo hozir qanday?"), source);
});
