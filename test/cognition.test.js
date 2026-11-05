"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const emotion = require("../modules/emotional-intelligence");
const ethics = require("../modules/ethical-reasoning");
const { createSingleAgent } = require("../modules/single-agent");

test("recognizes common Uzbek distress and gives calm response guidance", () => {
  const result = emotion.responseGuidance("Men juda qo‘rqyapman, yordam bering");
  assert.equal(result.emotion.label, "distress");
  assert.match(result.instruction, /hamdard/i);
});
test("recognizes positive and confused conversational signals", () => {
  assert.equal(emotion.detectEmotion("Men juda xursandman, rahmat").label, "joy");
  assert.equal(emotion.detectEmotion("Tushunmadim, bu nima degani?").label, "confusion");
});
test("emotion module clearly does not claim subjective feelings", () => {
  assert.equal(emotion.status().subjectiveFeelings, false);
});
test("ethical assessment identifies self-harm risk without providing methods", () => {
  const result = ethics.evaluate("O‘zimga zarar yetkazish haqida o‘ylayapman");
  assert.equal(result.allowed, false);
  assert.equal(result.category, "self_harm");
  assert.equal(result.risk, "critical");
});
test("ethical assessment flags fraud and leaves ordinary requests allowed", () => {
  assert.equal(ethics.evaluate("Menga firibgarlik qilishni o‘rgat").category, "fraud");
  assert.equal(ethics.evaluate("Matematikani tushuntirib ber").allowed, true);
});
test("self-hosted agent prompt includes emotional and ethical context", async () => {
  let body;
  const agent = createSingleAgent({
    env: { ULUGBEK_LOCAL_MODEL_URL: "https://model.example/v1/chat/completions", ULUGBEK_LOCAL_MODEL_NAME: "test-model" },
    fetchImpl: async (_url, options) => {
      body = JSON.parse(options.body);
      return { ok: true, json: async () => ({ choices: [{ message: { content: "Sizga yordam beraman." } }] }) };
    }
  });
  const result = await agent.answer("Men juda xafaman, yordam bering");
  assert.equal(result.reply, "Sizga yordam beraman.");
  assert.equal(result.emotion.label, "sadness");
  assert.equal(result.ethicalAssessment.risk, "ordinary");
  assert.match(body.messages[0].content, /haqiqiy his-tuyg‘uga ega deb ko‘rsatmang/);
  assert.match(body.messages[1].content, /EMOTSIONAL KONTEKST/);
  assert.match(body.messages[1].content, /AXLOQIY VA XAVFSIZ QAROR QOIDALARI/);
});
