"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { createFunctionGuardian } = require("../modules/function-guardian");

test("function guardian recovers queued writes after a transient filesystem failure", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "ulugbek-function-guardian-"));
  const file = path.join(dir, "guardian.json");
  const originalWriteFile = fs.writeFile;
  let failOnce = true;

  fs.writeFile = async (...args) => {
    if (failOnce) {
      failOnce = false;
      throw Object.assign(new Error("controlled write failure"), { code: "EIO" });
    }
    return originalWriteFile(...args);
  };

  try {
    const guardian = createFunctionGuardian({ file });
    await assert.rejects(
      guardian.record({ function: "first-write" }),
      /controlled write failure/
    );

    const recovered = await guardian.record({ function: "second-write" });
    assert.equal(recovered.function, "second-write");

    const saved = JSON.parse(await fs.readFile(file, "utf8"));
    assert.deepEqual(saved.events.map(event => event.function), ["first-write", "second-write"]);
  } finally {
    fs.writeFile = originalWriteFile;
    await fs.rm(dir, { recursive: true, force: true });
  }
});
