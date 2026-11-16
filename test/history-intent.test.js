"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const history = require("../modules/history-intent");

test("maps Boburshox to Babur when the question explicitly asks for old history", () => {
  const result = history.normalizeHistoryIntent("Boburshox haqida 500 yil oldingi tarixni izlab topib ber");
  assert.equal(result.isHistorical, true);
  assert.equal(result.canonicalEntity, "Zahiriddin Muhammad Bobur (Boburshoh)");
  assert.ok(result.aliases.includes("Babur"));
  assert.match(result.periodHint, /500 yil oldin/);
});

test("does not map a modern Boburshox polvon query to the historical ruler", () => {
  const result = history.normalizeHistoryIntent("Boburshox polvon Malibu otida Zomin Oqtoshda");
  assert.equal(result.canonicalEntity, null);
});

test("recognizes Babur spelling and historical context", () => {
  const result = history.normalizeHistoryIntent("Babur haqida tarixiy ma'lumot");
  assert.equal(result.canonicalEntity, "Zahiriddin Muhammad Bobur (Boburshoh)");
});
