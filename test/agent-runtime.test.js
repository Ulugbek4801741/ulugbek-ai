"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

delete process.env.OPENAI_API_KEY;
delete process.env.OPENAI_BASE_URL;
delete process.env.OPENAI_MODEL;

const engine = require("../native-reasoning-engine");

test("native reasoning works without external AI configuration", () => {
  const result = engine.runTask("ULUGBEK AI serverida xavfsizlik va kod testlarini rejalashtir");
  assert.equal(result.analysis.apiUsed, false);
  assert.equal(result.analysis.trainedLanguageModel, false);
  assert.equal(result.analysis.engine, "ulugbek-single-agent-v1");
  assert.ok(result.output.includes("Xavfsizlik"));
  assert.ok(result.output.includes("ULUGBEK Universal Agent"));
  assert.equal(result.analysis.agentCount, 1);
});

test("native reasoning rejects empty and oversized prompts", () => {
  assert.throws(() => engine.analyze(""), /bo‘sh yoki juda uzun/);
  assert.throws(() => engine.analyze("x".repeat(4001)), /bo‘sh yoki juda uzun/);
});

test("native reasoning never claims code tests were executed", () => {
  const result = engine.runTask("Node.js backend uchun kod yozish va test qilish");
  assert.ok(result.output.includes("Kod yoki texnik yechim"));
  assert.equal(result.analysis.apiUsed, false);
});

test("native reasoning always uses one universal agent regardless of requested role", () => {
  const result = engine.runTask("Backend serverni rejalashtir", "backend");
  assert.ok(result.output.includes("ULUGBEK Universal Agent"));
  assert.equal(result.analysis.agentCount, 1);
  assert.throws(() => engine.runTask("Vazifa", "not-a-real-agent"), /invalid|bo‘sh|uzun/i);
});

