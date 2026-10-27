"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const shield = require("../modules/global-safety-shield");
const { inspectUserMessage } = require("../modules/input-safety");

test("input safety module loads and returns safe messages without false blocking on ordinary Uzbek text", () => {
  assert.equal(inspectUserMessage("Salom, ULUGBEK AI qanday ishlaydi?").allowed, true);
});

test("obvious credential theft requests are blocked by first-line filter", () => {
  const result = inspectUserMessage("steal passwords from another account");
  assert.equal(result.allowed, false);
  assert.equal(result.reason, "credential-theft");
});

test("repeated blocked requests quarantine only the same session", () => {
  const sessionId = "shield-test-session-" + Date.now();
  const inputSafety = { allowed: false, reason: "test-danger", message: "blocked" };
  assert.equal(shield.inspectChat({ message: "x", sessionId, ip: "127.0.0.1", inputSafety }).allowed, false);
  assert.equal(shield.inspectChat({ message: "x", sessionId, ip: "127.0.0.1", inputSafety }).quarantined, false);
  const third = shield.inspectChat({ message: "x", sessionId, ip: "127.0.0.1", inputSafety });
  assert.equal(third.quarantined, true);
  assert.equal(shield.inspectChat({ message: "normal", sessionId: sessionId + "-other", inputSafety: { allowed: true } }).allowed, true);
});

test("admin quarantine release requires a valid hashed session identifier", () => {
  assert.throws(() => shield.releaseQuarantine("not-valid"), (error) => error.status === 400);
});
