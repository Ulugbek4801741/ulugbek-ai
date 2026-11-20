"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { buildUniversalSearchQueries, selectResearchQueries } = require("./universal-web-search");

test("city overview includes a dedicated official statistics query", () => {
  const queries = buildUniversalSearchQueries("Buxoro viloyati Kogon shahri haqida ma’lumot ber");
  assert.equal(queries.length >= 3, true);
  assert.match(queries[2], /official statistics population history/i);
});

test("city overview query selection keeps the official query inside the two-query budget", () => {
  const message = "Buxoro viloyati Kogon shahri haqida ma’lumot ber";
  const allQueries = buildUniversalSearchQueries(message);
  const selected = selectResearchQueries(message, allQueries);
  assert.match(selected[1], /official statistics population history/i);
});
