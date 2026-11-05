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

test("uses existing Render Gemini variables without requiring renamed secrets", () => {
  const env = { GEMINI_API_KEY: "render-gemini-secret", GEMINI_MODEL: "gemini-flash-latest" };
  const config = provider.configuration(env);
  assert.equal(config.configured, true);
  assert.equal(config.provider, "gemini");
  assert.equal(config.model, "gemini-flash-latest");
  const request = provider.request("Salom", "System", env);
  assert.match(request.url, /key=render-gemini-secret/);
});

test("uses existing Render OpenAI variables as an OpenAI-compatible endpoint", () => {
  const env = { OPENAI_API_KEY: "render-openai-secret", OPENAI_BASE_URL: "https://api.openai.com/v1/", OPENAI_MODEL: "gpt-test" };
  const config = provider.configuration(env);
  assert.equal(config.configured, true);
  assert.equal(config.provider, "openai-compatible");
  assert.equal(config.endpoint, "https://api.openai.com/v1/chat/completions");
  const request = provider.request("Hi", "System", env);
  assert.equal(request.options.headers.Authorization, "Bearer render-openai-secret");
});

test("explicit provider selection takes precedence over legacy Render credentials", () => {
  const env = {
    ULUGBEK_AI_PROVIDER: "anthropic",
    ULUGBEK_AI_MODEL: "claude-test",
    ULUGBEK_AI_TOKEN: "explicit-secret",
    GEMINI_API_KEY: "other-secret",
    GEMINI_MODEL: "gemini-flash-latest"
  };
  assert.equal(provider.configuration(env).provider, "anthropic");
  assert.equal(provider.request("Hi", "System", env).options.headers["x-api-key"], "explicit-secret");
});
