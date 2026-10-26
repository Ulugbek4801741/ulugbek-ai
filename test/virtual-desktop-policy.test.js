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

test("users can only start or stop their own session when admin enables the service", () => {
  const session = { ownerId: "user_123456", state: "stopped" };
  assert.equal(policy.canUserControlSession({ session, authenticatedUserId: "user_123456", action: "start", adminEnabled: true }), true);
  assert.equal(policy.canUserControlSession({ session: { ...session, state: "running" }, authenticatedUserId: "user_123456", action: "stop", adminEnabled: true }), true);
  assert.equal(policy.canUserControlSession({ session, authenticatedUserId: "user_654321", action: "start", adminEnabled: true }), false);
  assert.equal(policy.canUserControlSession({ session, authenticatedUserId: "user_123456", action: "start", adminEnabled: false }), false);
  assert.equal(policy.canUserControlSession({ session, authenticatedUserId: "user_123456", action: "delete", adminEnabled: true }), false);
  assert.equal(policy.canUserControlSession({ session: { ...session, state: "running" }, authenticatedUserId: "user_123456", action: "start", adminEnabled: true }), false);
});

test("only admins can perform administrative actions", () => {
  assert.equal(policy.canAdminManageSession({ isAdmin: true, action: "set-quota" }), true);
  assert.equal(policy.canAdminManageSession({ isAdmin: false, action: "set-quota" }), false);
  assert.equal(policy.canAdminManageSession({ isAdmin: true, action: "delete-database" }), false);
});

test("only known lifecycle states are accepted", () => {
  for (const state of ["stopped", "starting", "running", "stopping", "error"]) {
    assert.equal(policy.validateSessionState(state), true);
  }
  assert.equal(policy.validateSessionState("root"), false);
  assert.equal(policy.validateSessionState(undefined), false);
});
