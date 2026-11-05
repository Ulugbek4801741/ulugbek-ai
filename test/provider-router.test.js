"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const provider = require("../modules/provider-router");

test("provider router stays disabled until a valid model is configured", () => {
  assert.equal(provider.configuration({}).configured, false);
  assert.equal(provider.configuration({ ULUGBEK_AI_PROVIDER: "gemini", ULUGBEK_AI_MODEL: "gemini-test" }).configured, false);
});
test("supports local and OpenAI-compatible model endpoints without requiring a key", () => {
  const env = { ULUGBEK_LOCAL_MODEL_URL: "http://127.0.0.1:11434/v1/chat/completions", ULUGBEK_LOCAL_MODEL_NAME: "qwen-local" };
  assert.equal(provider.configuration(env).configured, true);
  const request = provider.request("Salom", "Tizim", env);
  assert.equal(request.options.method, "POST");
  assert.equal(JSON.parse(request.options.body).model, "qwen-local");
});
test("builds Gemini and Anthropic requests only when credentials exist", () => {
  const gemini = { ULUGBEK_AI_PROVIDER: "gemini", ULUGBEK_AI_MODEL: "gemini-2.5-flash", ULUGBEK_AI_TOKEN: "test-secret" };
  const request = provider.request("Salom", "System", gemini);
  assert.match(request.url, /generativelanguage\.googleapis\.com/);
  assert.equal(JSON.parse(request.options.body).contents[0].parts[0].text, "Salom");
  const anthropic = { ULUGBEK_AI_PROVIDER: "anthropic", ULUGBEK_AI_MODEL: "claude-test", ULUGBEK_AI_TOKEN: "test-secret" };
  const a = provider.request("Hi", "System", anthropic);
  assert.match(a.url, /api\.anthropic\.com/);
  assert.equal(JSON.parse(a.options.body).system, "System");
});
test("extracts provider-specific text responses", () => {
  assert.equal(provider.extract({ choices: [{ message: { content: " OpenAI " } }] }, "openai-compatible"), "OpenAI");
  assert.equal(provider.extract({ candidates: [{ content: { parts: [{ text: "Gemini" }] } }] }, "gemini"), "Gemini");
  assert.equal(provider.extract({ content: [{ type: "text", text: "Claude" }] }, "anthropic"), "Claude");
});
test("does not allow custom untrusted Anthropic API hosts", () => {
  assert.throws(() => provider.request("x", "y", {
    ULUGBEK_AI_PROVIDER: "anthropic", ULUGBEK_AI_MODEL: "claude-test",
    ULUGBEK_AI_TOKEN: "secret", ULUGBEK_AI_BASE_URL: "https://attacker.example/messages"
  }));
});
