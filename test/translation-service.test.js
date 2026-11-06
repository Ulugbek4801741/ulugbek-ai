"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { createTranslationService, protectTokens } = require("../modules/translation-service");
function fakeFetch(responseText) {
  return async (_url, options) => {
    const body = JSON.parse(options.body);
    assert.equal(body.messages[1].content.includes("Target language: uz"), true);
    return { ok: true, status: 200, json: async () => ({ choices: [{ message: { content: responseText } }] }) };
  };
}
test("translates text to Uzbek and restores protected URLs", async () => {
  const service = createTranslationService({
    env: { ULUGBEK_AI_PROVIDER: "openai-compatible", ULUGBEK_AI_MODEL: "test", ULUGBEK_AI_BASE_URL: "http://127.0.0.1:12345/v1/chat/completions" },
    fetchImpl: fakeFetch('{"sourceLanguage":"en","translatedText":"Salom ULUGBEKTOKEN0ENDTOKEN"}')
  });
  const result = await service.translate("Hello https://example.com", { sourceLanguage: "en", targetLanguage: "uz" });
  assert.equal(result.text, "Salom https://example.com");
  assert.equal(result.sourceLanguage, "en");
  assert.equal(result.translated, true);
});
test("returns unchanged text when source and target are the same", async () => {
  const service = createTranslationService({ env: {}, fetchImpl: async () => { throw new Error("must not call"); } });
  const result = await service.translate("Assalomu alaykum", { sourceLanguage: "uz", targetLanguage: "uz" });
  assert.equal(result.translated, false);
  assert.equal(result.text, "Assalomu alaykum");
});
test("fails clearly when translation provider is not configured", async () => {
  const service = createTranslationService({ env: {}, fetchImpl: async () => { throw new Error("must not call"); } });
  await assert.rejects(service.translate("Hello", { sourceLanguage: "en", targetLanguage: "uz" }), { code: "translation-provider-not-configured", statusCode: 503 });
});
test("does not send translation text to hosted AI providers", async () => {
  const service = createTranslationService({
    env: { ULUGBEK_AI_PROVIDER: "openai-compatible", ULUGBEK_AI_MODEL: "test", ULUGBEK_AI_BASE_URL: "https://api.example.com/v1/chat/completions" },
    fetchImpl: async () => { throw new Error("hosted endpoint must not be called"); }
  });
  await assert.rejects(service.translate("Hello", { sourceLanguage: "en", targetLanguage: "uz" }), {
    code: "translation-provider-not-configured", statusCode: 503
  });
});

test("rejects empty and oversized input", async () => {
  const service = createTranslationService({ env: {}, fetchImpl: async () => { throw new Error("must not call"); } });
  await assert.rejects(service.translate(""), { statusCode: 400 });
  await assert.rejects(service.translate("x".repeat(4001)), { statusCode: 413 });
});
test("protects URLs and inline code", () => {
  const result = protectTokens("Open https://example.com and use " + String.fromCharCode(96) + "npm test" + String.fromCharCode(96));
  assert.equal(result.text.includes("https://example.com"), false);
  assert.equal(result.restore(result.text).includes("npm test"), true);
});
