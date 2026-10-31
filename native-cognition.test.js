"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const brain = require("./native-cognition");

test("extracts Uzbek and English concepts without external model", () => {
  const found = brain.concepts("Sun'iy intellekt va robotics tizimlari");
  assert.ok(found.includes("intellekt"));
  assert.ok(found.includes("robotics"));
});

test("ranks evidence that shares query concepts", () => {
  const entries = [
    { title: "Robotika", source: "https://example.org/robotics", content: "Robotlar sensorlar yordamida atrof-muhitni kuzatadi va vazifalarni bajaradi." },
    { title: "Tarix", source: "https://example.org/history", content: "Qadimgi tarixiy manbalarda turli davlatlar va xalqlar haqida ma'lumot bor." }
  ];
  const result = brain.reason("robotlar sensorlar", entries);
  assert.equal(result.answerable, true);
  assert.match(result.facts[0].fact, /Robotlar sensorlar/);
});

test("does not invent an answer when there is no evidence", () => {
  const result = brain.respond("kvant teleportatsiya", []);
  assert.equal(result.reasoning.answerable, false);
  assert.match(result.reply, /ishonchli javob topa olmadim/);
});

test("deduplicates identical evidence", () => {
  const entry = { title: "A", source: "https://example.org/a", content: "Robotlar sensorlar yordamida atrof muhitni kuzatadi." };
  const result = brain.reason("robotlar sensorlar", [entry, entry]);
  assert.equal(result.facts.length, 1);
});
