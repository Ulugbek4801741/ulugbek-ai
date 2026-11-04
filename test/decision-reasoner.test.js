"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const reasoner = require("../modules/decision-reasoner");

test("qaror savolida foyda va zarar omillarini ajratadi", () => {
  const result = reasoner.analyze("Bu ish foydali bo'ladimi, zarar va xavfi bormi?");
  assert.equal(result.isDecisionQuestion, true);
  assert.ok(result.detectedFactors.some(x => x.factor === "foyda"));
  assert.ok(result.detectedFactors.some(x => x.factor === "ehtimoliy zarar"));
});
test("sabab va oqibat savolini taniydi", () => {
  assert.equal(reasoner.analyze("Agar shunday qilsam oqibati nima?").requestsCauseEffect, true);
});
test("dalilsiz vaziyatda ishonch darajasini oshirmaydi", () => {
  assert.equal(reasoner.analyze("Qaror qilsam nima bo'ladi?").confidence, "no-evidence");
});
test("oddiy salomlashuvga qo'shimcha tahlil yozmaydi", () => {
  assert.equal(reasoner.explain(reasoner.analyze("Salom")), "");
});
