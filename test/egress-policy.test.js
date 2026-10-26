"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { validateModelEndpoint } = require("../modules/egress-policy");

test("allows HTTPS only for explicitly configured provider hosts", () => {
  const old = process.env.AI_ALLOWED_HOSTS;
  process.env.AI_ALLOWED_HOSTS = "api.openai.com,api.example.ai";
  try {
    assert.equal(validateModelEndpoint("https://api.openai.com/v1").allowed, true);
    assert.equal(validateModelEndpoint("https://api.example.ai/v1").allowed, true);
    assert.equal(validateModelEndpoint("https://evil.example/v1").allowed, false);
    assert.equal(validateModelEndpoint("http://api.openai.com/v1").allowed, false);
    assert.equal(validateModelEndpoint("https://user:pass@api.openai.com/v1").allowed, false);
    assert.equal(validateModelEndpoint("https://127.0.0.1/v1").allowed, false);
    assert.equal(validateModelEndpoint("https://169.254.169.254/latest/meta-data").allowed, false);
  } finally {
    if (old === undefined) delete process.env.AI_ALLOWED_HOSTS;
    else process.env.AI_ALLOWED_HOSTS = old;
  }
});
