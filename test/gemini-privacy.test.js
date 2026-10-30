"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const root = path.resolve(__dirname, "..");

async function withServer(port, extraEnv, fn) {
  const capturePath = path.join(os.tmpdir(), `ulugbek-provider-capture-${port}.json`);
  try { fs.unlinkSync(capturePath); } catch {}
  const child = spawn(process.execPath, ["server.js"], {
    cwd: root,
    env: {
      ...process.env, NODE_ENV: "test", PORT: String(port),
      GEMINI_API_KEY: "unused-test-secret", GEMINI_ALLOW_CHAT_CONTENT: "true",
      ULUGBEK_TEST_GEMINI_CAPTURE: capturePath,
      TASK_STORE_PATH: path.join(os.tmpdir(), `ulugbek-provider-tasks-${port}.json`),
      AGENT_MEMORY_PATH: path.join(os.tmpdir(), `ulugbek-provider-memory-${port}.json`),
      ...extraEnv
    },
    stdio: "ignore"
  });
  const baseUrl = `http://127.0.0.1:${port}`;
  try {
    const deadline = Date.now() + 8000;
    let ready = false;
    while (Date.now() < deadline) {
      if (child.exitCode !== null) throw new Error("ULUGBEK AI server exited early.");
      try { const response = await fetch(baseUrl + "/api/health"); if (response.ok) { ready = true; break; } } catch {}
      await new Promise(resolve => setTimeout(resolve, 120));
    }
    assert.equal(ready, true, "server should start");
    await fn({ baseUrl, capturePath });
  } finally {
    child.kill("SIGTERM");
    await new Promise(resolve => {
      if (child.exitCode !== null) return resolve();
      child.once("exit", resolve);
      setTimeout(resolve, 1000);
    });
    try { fs.unlinkSync(capturePath); } catch {}
  }
}

test("ULUGBEK AI never sends chat content to Gemini, even when old consent flags are set", async t => {
  await t.test("provider stays unused when consent is disabled", async () => {
    await withServer(32211, { GEMINI_ALLOW_CHAT_CONTENT: "false" }, async ({ baseUrl, capturePath }) => {
      const response = await fetch(baseUrl + "/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "Salom" })
      });
      assert.equal(response.status, 200);
      assert.equal((await response.json()).mode, "native-symbolic-no-external-ai");
      assert.equal(fs.existsSync(capturePath), false);
    });
  });
  await t.test("provider stays unused even when old consent flag is enabled", async () => {
    await withServer(32212, { GEMINI_ALLOW_CHAT_CONTENT: "true" }, async ({ baseUrl, capturePath }) => {
      const response = await fetch(baseUrl + "/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "Faqat joriy xabar", history: [{ role: "user", content: "private" }] })
      });
      assert.equal(response.status, 200);
      assert.equal((await response.json()).mode, "native-symbolic-no-external-ai");
      assert.equal(fs.existsSync(capturePath), false);
    });
  });
});
