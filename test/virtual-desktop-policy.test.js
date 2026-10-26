"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const policy = require("../modules/virtual-desktop-policy");

test("creates a stopped, private session request for a trusted user", () => {
  const session = policy.createSessionRequest("user_123456");
  assert.equal(session.ownerId, "user_123456");
  assert.equal(session.state, "stopped");
  assert.equal(session.persistentStorage, true);
  assert.equal(session.publicIp, false);
  assert.equal(session.privileged, false);
});

test("rejects missing or malformed user identifiers", () => {
  assert.throws(() => policy.createSessionRequest(""), /verified user ID/);
  assert.throws(() => policy.createSessionRequest("../other-user"), /verified user ID/);
  assert.throws(() => policy.createSessionRequest(null), /verified user ID/);
});

test("session can only be accessed by its owner", () => {
  const session = policy.createSessionRequest("user_123456");
  assert.equal(policy.canAccessSession(session, "user_123456"), true);
  assert.equal(policy.canAccessSession(session, "user_654321"), false);
  assert.equal(policy.canAccessSession(session, ""), false);
  assert.equal(policy.canAccessSession(null, "user_123456"), false);
});

test("only known lifecycle states are accepted", () => {
  for (const state of ["stopped", "starting", "running", "stopping", "error"]) {
    assert.equal(policy.validateSessionState(state), true);
  }
  assert.equal(policy.validateSessionState("root"), false);
  assert.equal(policy.validateSessionState(undefined), false);
});
