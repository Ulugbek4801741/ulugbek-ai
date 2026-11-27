"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const router = require("../modules/provider-router");

test("API key variables never activate a hosted provider", () => {
  const config = router.configuration({
    OPENAI_API_KEY: "must-not-be-used",
    GEMINI_API_KEY: "must-not-be-used",
    ANTHROPIC_API_KEY: "must-not-be-used"
  });
  assert.equal(config.configured, false);
  assert.equal(config.provider, "not-configured");
});

test("Ollama local model works without an API key", () => {
  const env = { ULUGBEK_OLLAMA_URL: "http://127.0.0.1:11434", ULUGBEK_OLLAMA_MODEL: "qwen2.5:3b" };
  const config = router.configuration(env);
  assert.equal(config.configured, true);
  assert.equal(config.provider, "ollama");
  assert.equal(config.apiKeyRequired, false);
  const request = router.request("Salom", "O'zbekcha javob ber", env);
  assert.match(request.url, /api\/chat$/);
  assert.equal(JSON.parse(request.options.body).model, "qwen2.5:3b");
});

test("local OpenAI-compatible protocol is allowed only for a configured local model endpoint", () => {
  const env = {
    ULUGBEK_LOCAL_MODEL_URL: "http://127.0.0.1:8080/v1/chat/completions",
    ULUGBEK_LOCAL_MODEL_NAME: "local-model"
  };
  const config = router.configuration(env);
  assert.equal(config.configured, true);
  assert.equal(config.provider, "local-compatible");
  assert.equal(config.apiKeyRequired, false);
});

test("official OpenAI endpoint is blocked", () => {
  const config = router.configuration({
    ULUGBEK_AI_PROVIDER: "openai-compatible",
    ULUGBEK_AI_BASE_URL: "https://api.openai.com/v1/chat/completions",
    ULUGBEK_LOCAL_MODEL_NAME: "any-model"
  });
  assert.equal(config.configured, false);
  assert.equal(config.reason, "hosted-provider-blocked");
});

test("missing local model endpoint does not pretend the AI is ready", () => {
  const config = router.configuration({
    ULUGBEK_AI_PROVIDER: "openai-compatible",
    ULUGBEK_LOCAL_MODEL_NAME: "local-model"
  });
  assert.equal(config.configured, false);
});
