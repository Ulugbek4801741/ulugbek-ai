"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { clean, imageIntent, buildImageQuery, relevanceScore, searchImages } = require("./chat-image-search");

test("image intent skips greetings and coding requests", () => {
  assert.equal(imageIntent("Salom"), false);
  assert.equal(imageIntent("JavaScript kod yozib ber"), false);
  assert.equal(imageIntent("Buxoro haqida ma’lumot ber"), true);
});
test("image query uses concise place keywords", () => {
  assert.equal(buildImageQuery("Buxoro viloyati Kogon shahri haqida ma’lumot ber"), "Kogon Uzbekistan");
});
test("Kogon image matching rejects district maps and nearby Bukhara landmarks", () => {
  assert.equal(relevanceScore({ title: "Kogon District location map" }, "Kogon"), 0);
  assert.equal(relevanceScore({ title: "Bakhouddin Nakshband Mausoleum" }, "Kogon"), 0);
  assert.equal(relevanceScore({ title: "Kagan railway station Uzbekistan" }, "Kogon"), 5);
});
test("clean removes markup and bounds text", () => {
  assert.equal(clean("<b>Buxoro</b> shahri"), "Buxoro shahri");
  assert.equal(clean("x".repeat(220)).length, 180);
});
test("searchImages returns only safe Wikimedia-hosted thumbnails when Openverse has no results", async t => {
  const original = global.fetch;
  global.fetch = async () => ({
    ok: true,
    json: async () => ({ query: { pages: [
      { title: "File:Bukhara.jpg", imageinfo: [{ thumburl: "https://upload.wikimedia.org/a.jpg", descriptionurl: "https://commons.wikimedia.org/wiki/File:Bukhara.jpg", extmetadata: { LicenseShortName: { value: "CC BY-SA" }, Artist: { value: "Photographer" } } }] },
      { title: "File:Bad.jpg", imageinfo: [{ thumburl: "https://evil.example/a.jpg", descriptionurl: "https://evil.example/file" }] }
    ] } })
  });
  t.after(() => { global.fetch = original; });
  const items = await searchImages("Buxoro tarixiy obidalari", 4);
  assert.equal(items.length, 1);
  assert.equal(items[0].title, "Bukhara.jpg");
  assert.equal(items[0].license, "CC BY-SA");
});
