"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const router = require("../modules/provider-router");

test("OpenAI API key alone enables the official default endpoint and model", () => {
  const config = router.configuration({ OPENAI_API_KEY: "test-secret" });
  assert.equal(config.configured, true);
  assert.equal(config.provider, "openai-compatible");
  assert.equal(config.model, "gpt-4o-mini");
  assert.equal(new URL(config.endpoint).origin, "https://api.openai.com");
  assert.equal(new URL(config.endpoint).pathname, "/v1/chat/completions");
  assert.equal(config.tokenConfigured, true);
});

test("OpenAI model and base URL can be overridden", () => {
  const config = router.configuration({
    OPENAI_API_KEY: "test-secret",
    OPENAI_MODEL: "gpt-example",
    OPENAI_BASE_URL: "https://gateway.example/v1"
  });
  assert.equal(config.model, "gpt-example");
  assert.equal(config.endpoint, "https://gateway.example/v1/chat/completions");
});

test("OpenAI is not configured without an API key", () => {
  const config = router.configuration({});
  assert.equal(config.configured, false);
  assert.equal(config.provider, "not-configured");
});

test("OpenAI request sends bearer token only in server-side request headers", () => {
  const request = router.request("Salom", "System", { OPENAI_API_KEY: "test-secret" });
  assert.equal(request.url, "https://api.openai.com/v1/chat/completions");
  assert.equal(request.options.headers.Authorization, "Bearer test-secret");
  const payload = JSON.parse(request.options.body);
  assert.equal(payload.model, "gpt-4o-mini");
  assert.equal(payload.messages[1].content, "Salom");
});

test("provider rejects non-HTTP endpoint overrides", () => {
  const config = router.configuration({
    OPENAI_API_KEY: "test-secret",
    OPENAI_BASE_URL: "file:///etc/passwd"
  });
  assert.equal(config.configured, false);
  assert.equal(config.reason, "endpoint-invalid");
});
