"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");

const port = 32198;
const baseUrl = `http://127.0.0.1:${port}`;

test("server startup does not bypass a persisted watchdog quarantine", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "ulugbek-quarantine-startup-"));
  const storePath = path.join(dir, "admin-autopilot.json");
  await fs.writeFile(storePath, JSON.stringify({
    enabled: false,
    quarantined: true,
    quarantineReason: "persisted test quarantine",
    restartAttempts: 0,
    consecutiveErrors: 3,
    events: []
  }));
  const server = spawn(process.execPath, ["server.js"], {
    env: {
      ...process.env,
      PORT: String(port),
      ULUGBEK_DATA_DIR: dir,
      ADMIN_AUTOPILOT_STORE: storePath,
      ADMIN_ACCESS_CODE: "ci-test-admin-code",
      ADMIN_SESSION_SECRET: "ci-test-session-secret-long-enough",
      OPENAI_API_KEY: "",
      GEMINI_API_KEY: ""
    },
    stdio: "ignore"
  });

  try {
    const deadline = Date.now() + 10000;
    let body = null;
    while (Date.now() < deadline) {
      if (server.exitCode !== null) throw new Error("Server exited before becoming ready.");
      try {
        const response = await fetch(baseUrl + "/api/health");
        if (response.ok) {
          body = await response.json();
          break;
        }
      } catch {}
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    assert.ok(body, "server should become ready");
    assert.equal(body.publicResearchWorker.enabled, false);
    assert.equal(body.publicResearchWorker.running, false);
  } finally {
    server.kill("SIGTERM");
    await fs.rm(dir, { recursive: true, force: true });
  }
});
