"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const images = require("../modules/chat-image-search");

test("Kogon image search expands to the city, historic Kagan station and Bukhara-1 station", () => {
  const result = images.normalizePlaceQuery("Buxoro viloyati Kogon shahri haqida ma'lumot ber");
  assert.equal(result.place, "Kogon");
  assert.deepEqual(result.queries, [
    "Kogon Uzbekistan",
    "Kagan railway station Uzbekistan",
    "Bukhara-1 railway station Kogon Uzbekistan"
  ]);
});

test("major Uzbek city names are normalized for image search", () => {
  const result = images.normalizePlaceQuery("Samarqand shahri haqida ma'lumot ber");
  assert.equal(result.place, "Samarkand");
  assert.equal(images.relevanceScore({ title: "Samarkand Registan square", tags: [] }, result.place), 3);
});

test("image relevance rejects generic Bukhara photos for a Kogon request", () => {
  assert.equal(images.relevanceScore({ title: "Kogon railway station", tags: [] }, "Kogon"), 5);
  assert.equal(images.relevanceScore({ title: "Bukhara old town", tags: [] }, "Kogon"), 0);
  assert.equal(images.relevanceScore({ title: "Bukhara-1 railway station", tags: [] }, "Kogon"), 4);
});

test("Openverse returns openly licensed, attributed Kogon images without Wikimedia dependency", async () => {
  const originalFetch = global.fetch;
  const records = [
    ["Kogon railway station", "kogon-1"],
    ["Historic Kagan station", "kagan-2"],
    ["Bukhara-1 railway station", "bukhara1-3"],
    ["Kogon city view", "kogon-4"]
  ].map(([title, id]) => ({
    id, title, thumbnail: "https://api.openverse.org/v1/images/" + id + "/thumb/",
    foreign_landing_url: "https://photos.example.org/" + id,
    url: "https://cdn.example.org/" + id + ".jpg",
    license: "by-sa", license_version: "4.0", license_url: "https://creativecommons.org/licenses/by-sa/4.0/",
    creator: "Test photographer", provider: "Test source", tags: []
  }));
  global.fetch = async () => ({ ok: true, status: 200, async json() { return { results: records }; } });
  try {
    const found = await images.searchImages("Kogon city image fallback test", 4);
    assert.equal(found.length, 4);
    assert.equal(found[0].provider, "Test source");
    assert.equal(found[0].artist, "Test photographer");
    assert.match(found[0].license, /by-sa/);
    assert.ok(found.every(item => item.thumbnail.startsWith("https://api.openverse.org/")));
  } finally {
    global.fetch = originalFetch;
  }
});
