"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const router = require("../modules/provider-router");

test("Groq provider requires a server-side API key", () => {
  const config = router.configuration({ ULUGBEK_AI_PROVIDER: "groq" });
  assert.equal(config.provider, "groq");
  assert.equal(config.model, "openai/gpt-oss-120b");
  assert.equal(config.configured, false);
  assert.equal(config.apiKeyRequired, true);
});

test("Groq provider builds an authenticated OpenAI-compatible request", () => {
  const env = { ULUGBEK_AI_PROVIDER: "groq", GROQ_API_KEY: "test-secret" };
  const config = router.configuration(env);
  assert.equal(config.configured, true);
  assert.equal(config.endpoint, "https://api.groq.com/openai/v1/chat/completions");
  const request = router.request("Salom", "Sen ULUGBEK AI", env);
  assert.equal(request.url, config.endpoint);
  assert.equal(request.options.headers.Authorization, "Bearer test-secret");
  const body = JSON.parse(request.options.body);
  assert.equal(body.model, "openai/gpt-oss-120b");
  assert.equal(body.messages[1].content, "Salom");
});

test("Groq endpoint cannot be redirected to an untrusted host", () => {
  const config = router.configuration({
    ULUGBEK_AI_PROVIDER: "groq",
    GROQ_API_KEY: "test-secret",
    GROQ_BASE_URL: "https://example.com/v1/chat/completions"
  });
  assert.equal(config.configured, false);
  assert.equal(config.reason, "endpoint-invalid");
});

test("Groq chat completion content is extracted", () => {
  assert.equal(router.extract({
    choices: [{ message: { content: "  Assalomu alaykum!  " } }]
  }, "groq"), "Assalomu alaykum!");
});
