"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  createMcpAccessToken,
  isValidMcpBearerToken
} = require("../modules/mcp-bridge");

test("MCP access token is derived from the configured admin session secret", () => {
  const secret = "a".repeat(48);
  const token = createMcpAccessToken(secret);
  assert.match(token, /^[a-f0-9]{64}$/);
  assert.equal(createMcpAccessToken(secret), token);
  assert.notEqual(createMcpAccessToken("b".repeat(48)), token);
});

test("MCP access token is disabled when the admin session secret is weak", () => {
  assert.equal(createMcpAccessToken(""), "");
  assert.equal(createMcpAccessToken("short"), "");
});

test("MCP accepts only the matching Bearer token", () => {
  const token = "c".repeat(64);
  assert.equal(isValidMcpBearerToken(token, "Bearer " + token), true);
  assert.equal(isValidMcpBearerToken(token, "bearer " + token), true);
  assert.equal(isValidMcpBearerToken(token, "Bearer " + "d".repeat(64)), false);
  assert.equal(isValidMcpBearerToken(token, ""), false);
  assert.equal(isValidMcpBearerToken("", "Bearer " + token), false);
  assert.equal(isValidMcpBearerToken(token, "Basic " + token), false);
});
