"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { createAdminAuth } = require("../modules/admin-auth");

const secret = "test-session-secret-that-is-at-least-32-characters";

test("five wrong PIN attempts lock one identifier for one hour", async () => {
  let now = 1_800_000_000_000;
  const auth = createAdminAuth({ accessCode: "test-admin-pin-123", sessionSecret: secret, now: () => now });
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    const result = await auth.login({ code: "wrong-pin", identifier: "device-a" });
    assert.equal(result.ok, false);
    assert.equal(result.remainingAttempts, Math.max(0, 5 - attempt));
  }
  const blocked = await auth.login({ code: "test-admin-pin-123", identifier: "device-a" });
  assert.equal(blocked.status, 429);
  assert.equal(blocked.lockedUntil, now + 60 * 60 * 1000);
  const other = await auth.login({ code: "test-admin-pin-123", identifier: "device-b" });
  assert.equal(other.ok, true);
});

test("valid PIN creates a signed one-hour session and logout revokes it", async () => {
  let now = 1_800_000_000_000;
  const auth = createAdminAuth({ accessCode: "test-admin-pin-123", sessionSecret: secret, now: () => now });
  const result = await auth.login({ code: "test-admin-pin-123", identifier: "device-a" });
  assert.equal(result.ok, true);
  assert.equal(result.expiresAt, now + 60 * 60 * 1000);
  assert.ok(auth.verifySession(result.token));
  assert.equal(auth.revoke(result.token), true);
  assert.equal(auth.verifySession(result.token), false);
  const next = await auth.login({ code: "test-admin-pin-123", identifier: "device-a" });
  assert.equal(next.ok, true);
  now += 60 * 60 * 1000 + 1;
  assert.equal(auth.verifySession(next.token), false);
});

test("lockout survives auth-module restart and expires after one hour", async () => {
  let now = 1_800_000_000_000;
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "ulugbek-admin-auth-"));
  const storePath = path.join(dir, "lockouts.json");
  try {
    const first = createAdminAuth({ accessCode: "test-admin-pin-123", sessionSecret: secret, storePath, now: () => now });
    for (let attempt = 0; attempt < 5; attempt += 1) await first.login({ code: "wrong", identifier: "same-device" });
    const restarted = createAdminAuth({ accessCode: "test-admin-pin-123", sessionSecret: secret, storePath, now: () => now });
    const blocked = await restarted.login({ code: "test-admin-pin-123", identifier: "same-device" });
    assert.equal(blocked.status, 429);
    now += 60 * 60 * 1000 + 1;
    const allowed = await restarted.login({ code: "test-admin-pin-123", identifier: "same-device" });
    assert.equal(allowed.ok, true);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test("admin login fails closed when server secrets are missing or too short", async () => {
  const auth = createAdminAuth({ accessCode: "", sessionSecret: "short" });
  assert.equal(auth.configured(), false);
  assert.equal((await auth.login({ code: "anything", identifier: "device" })).status, 503);
});
