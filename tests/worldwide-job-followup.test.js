"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const memory = require("../modules/conversation-memory");
const jobs = require("../modules/job-search");

test("worldwide scope is accepted as a location clarification for a pending job search", () => {
  const session = "worldwide-job-followup-test";
  const original = "Dunyo bo‘ylab masofaviy Python dasturchi ishlarini top.";
  memory.remember(session, original);
  const expanded = memory.expand(session, "Dunyo boʻylab");
  assert.match(expanded, /Python dasturchi ishlarini top/i);
  assert.equal(jobs.isWorldwideRequest(expanded), true);
  assert.equal(jobs.hasLocationHint(expanded), true);
});

test("worldwide Uzbek spelling variants are recognized", () => {
  for (const phrase of ["Dunyo bo‘ylab", "Dunyo boʻylab", "Butun dunyo", "worldwide"]) {
    assert.equal(jobs.isWorldwideRequest(phrase), true, phrase);
  }
});
