"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const engine = require("../native-reasoning-engine");

test("native reasoning works without external AI configuration", () => {
  delete process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_BASE_URL;
  delete process.env.OPENAI_MODEL;
  const result = engine.runTask("ULUGBEK AI serverida xavfsizlik va kod testlarini rejalashtir");
  assert.equal(result.analysis.apiUsed, false);
  assert.equal(result.analysis.trainedLanguageModel, false);
  assert.equal(result.analysis.engine, "ulugbek-native-rule-reasoner-v1");
  assert.ok(result.output.includes("Xavfsizlik"));
  assert.ok(result.output.includes("Agent rollari"));
});

test("native reasoning rejects empty and oversized prompts", () => {
  assert.throws(() => engine.analyze(""), /bo‘sh yoki juda uzun/);
  assert.throws(() => engine.analyze("x".repeat(4001)), /bo‘sh yoki juda uzun/);
});

test("native reasoning never claims code tests were executed", () => {
  const result = engine.runTask("Node.js backend uchun kod yozish va test qilish");
  assert.ok(result.output.includes("haqiqiy kompilyatsiya yoki test"));
  assert.equal(result.analysis.apiUsed, false);
});
