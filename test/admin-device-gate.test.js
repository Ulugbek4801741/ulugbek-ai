"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { createAdminDeviceGate } = require("../modules/admin-device-gate");

test("first device enrols after five phrase checks; second device waits 24 hours after logout", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "ulugbek-admin-device-"));
  let clock = 1_800_000_000_000;
  const gate = createAdminDeviceGate({
    activationPhrase: "test-only-secret-phrase",
    storePath: path.join(dir, "devices.json"),
    now: () => clock
  });
  const firstId = "device-one";
  for (let i = 1; i <= 5; i += 1) {
    const result = await gate.step({ phrase: "test-only-secret-phrase", identifier: firstId });
    assert.equal(result.count, i);
  }
  assert.equal(await gate.ready("", firstId), true);
  const firstToken = gate.issueToken();
  await gate.register(firstToken, firstId);
  assert.equal(await gate.isTrusted(firstToken), true);
  await gate.markLogout(firstToken);

  const secondId = "device-two";
  assert.equal(await gate.canEnroll(""), false);
  const blocked = await gate.step({ phrase: "test-only-secret-phrase", identifier: secondId });
  assert.equal(blocked.status, 403);

  clock += 24 * 60 * 60 * 1000;
  assert.equal(await gate.canEnroll(""), true);
  for (let i = 1; i <= 5; i += 1) {
    const result = await gate.step({ phrase: "test-only-secret-phrase", identifier: secondId });
    assert.equal(result.count, i);
  }
  assert.equal(await gate.ready("", secondId), true);
  const secondToken = gate.issueToken();
  await gate.register(secondToken, secondId);
  assert.equal(await gate.isTrusted(secondToken), true);
  await fs.rm(dir, { recursive: true, force: true });
});

test("wrong activation phrase never unlocks the device", async () => {
  const gate = createAdminDeviceGate({ activationPhrase: "test-only-secret-phrase" });
  for (let i = 0; i < 4; i += 1) {
    const result = await gate.step({ phrase: "wrong", identifier: "device" });
    assert.equal(result.ok, false);
  }
  assert.equal(await gate.ready("", "device"), false);
});
