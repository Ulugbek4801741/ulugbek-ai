"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { createDecision, approveDecision } = require("../modules/autonomous-decision");

test("mustaqil eng yuqori baholangan variantni tanlaydi, lekin bajarishga ruxsat bermaydi", () => {
  const d = createDecision({ goal: "Vazifani rejalash", evidence: ["a", "b", "c"], options: [
    { id: "a", title: "Sekin yo‘l", risk: "read", score: 4 },
    { id: "b", title: "Yaxshi yo‘l", risk: "reversible", score: 9 }
  ]});
  assert.equal(d.selectedOption.id, "b");
  assert.equal(d.executionAllowed, false);
  assert.equal(d.status, "awaiting_user_approval");
  assert.equal(d.confidence, "moderate");
});

test("tasdiqsiz yoki boshqa vazifa tasdig‘i bilan bloklaydi", () => {
  const d = createDecision({ goal: "Hisobot tayyorlash", options: [
    { id: "draft", title: "Qoralama", risk: "draft", score: 5 }
  ]});
  assert.equal(approveDecision(d, { confirmed: true, optionId: "draft", goal: "Boshqa ish" }).allowed, false);
  assert.equal(approveDecision(d, { confirmed: false, optionId: "draft", goal: "Hisobot tayyorlash" }).allowed, false);
});

test("aniq tasdiq faqat tanlangan vazifaga ruxsat beradi", () => {
  const d = createDecision({ goal: "Xabar yuborish", options: [
    { id: "send", title: "Xabarni yuborish", risk: "external", score: 8 }
  ]});
  const result = approveDecision(d, { confirmed: true, optionId: "send", goal: "Xabar yuborish" });
  assert.equal(result.allowed, true);
  assert.equal(result.requiresActionSpecificChecks, true);
});

test("variant bo‘lmasa tasdiq bilan ham bajarishga yo‘l qo‘ymaydi", () => {
  const d = createDecision({ goal: "Noaniq vazifa" });
  assert.equal(approveDecision(d, { confirmed: true, optionId: "1", goal: "Noaniq vazifa" }).allowed, false);
});
