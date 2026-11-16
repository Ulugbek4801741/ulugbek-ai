"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  isCurrentPopulationQuestion,
  isCurrentPopulationEvidence,
  filterCurrentPopulationEvidence
} = require("../modules/universal-web-search");

test("detects current population questions in Uzbek", () => {
  assert.equal(isCurrentPopulationQuestion("Hindiston aholisi soni hozir qancha?"), true);
  assert.equal(isCurrentPopulationQuestion("Hindiston aholisi haqida tarixiy ma’lumot"), false);
});

test("accepts a recent population estimate with a numeric value", () => {
  assert.equal(isCurrentPopulationEvidence({
    title: "India population 2026 estimate",
    snippet: "India population in 2026 is estimated at 1,476,625,576 people."
  }, 2026), true);
});

test("accepts a labeled 2025 UN population estimate as latest dated data", () => {
  assert.equal(isCurrentPopulationEvidence({
    title: "UNFPA India population data",
    snippet: "2025 total population: 1,463,900,000."
  }, 2026), true);
});

test("rejects obsolete future-tense 2025 projections", () => {
  assert.equal(isCurrentPopulationEvidence({
    title: "India population",
    snippet: "India is expected to overtake China by 2025."
  }, 2026), false);
});

test("rejects a number with no recent year or a year with no population number", () => {
  assert.equal(isCurrentPopulationEvidence({
    title: "India population",
    snippet: "India population is 1.4 billion."
  }, 2026), false);
  assert.equal(isCurrentPopulationEvidence({
    title: "India population 2026",
    snippet: "India is the world's most populous country."
  }, 2026), false);
});

test("filters stale and non-numeric population sources", () => {
  const results = filterCurrentPopulationEvidence([
    { title: "India population 2026", snippet: "Population 1,476,625,576." },
    { title: "India population", snippet: "Expected to overtake China by 2025." },
    { title: "India population 2026", snippet: "Largest population." }
  ], 2026);
  assert.equal(results.length, 1);
});
