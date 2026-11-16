"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const search = require("../modules/universal-web-search");
const cognition = require("../native-cognition");

test("historical Boburshox query expands to canonical biography and primary-source searches", () => {
  const queries = search.buildUniversalSearchQueries("Boburshox haqida 500 yil oldingi tarixni izlab topib ber");
  assert.ok(queries.length >= 4);
  assert.ok(queries.some(query => /Zahiriddin Muhammad Bobur/i.test(query)));
  assert.ok(queries.some(query => /Babur 1483 1530/i.test(query)));
  assert.ok(queries.some(query => /Boburnoma Baburnama primary historical source/i.test(query)));
});

test("native evidence ranking resolves historical Boburshox to canonical name", () => {
  const result = cognition.reason("Boburshox haqida 500 yil oldingi tarixni izlab topib ber", [
    {
      title: "Zahiriddin Muhammad Bobur",
      source: "https://example.org/babur",
      content: "Zahiriddin Muhammad Bobur, known as Babur, was born in Andijan in 1483 and founded the Mughal Empire in India."
    }
  ]);
  assert.equal(result.answerable, true);
  assert.ok(result.facts.some(fact => /Zahiriddin Muhammad Bobur/i.test(fact.fact)));
});
