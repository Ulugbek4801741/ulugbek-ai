"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

test("admin permissions persist allowed capabilities but keep critical actions locked", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "ulugbek-permissions-"));
  process.env.ULUGBEK_DATA_DIR = dir;
  delete process.env.AGENT_PERMISSIONS_STORE;
  const permissions = require("../agent-permissions");
  try {
    await permissions.load();
    const initial = permissions.snapshot();
    assert.equal(initial.capabilities.repository_read.enabled, true);
    assert.equal(initial.capabilities.knowledge_save.enabled, false);
    assert.match(initial.locked.production_deploy, /bloklangan/);

    const updated = await permissions.update({
      knowledge_save: true,
      automated_tests: true
    }, "admin@example.test");
    assert.equal(updated.capabilities.knowledge_save.enabled, true);
    assert.equal(updated.capabilities.automated_tests.enabled, true);
    assert.equal(updated.locked.direct_source_write.includes("bloklangan"), true);

    const stored = JSON.parse(await fs.readFile(path.join(dir, "agent-permissions.json"), "utf8"));
    assert.equal(stored.capabilities.knowledge_save, true);
    assert.equal(stored.audit.length, 1);
    await assert.rejects(
      permissions.update({ production_deploy: true }, "admin@example.test"),
      /Noma’lum ruxsat/
    );
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
    delete process.env.ULUGBEK_DATA_DIR;
  }
});
