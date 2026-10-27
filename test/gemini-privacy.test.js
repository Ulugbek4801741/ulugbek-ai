"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const mockPath = path.join(root, "test-support", "mock-gemini-fetch.cjs");

function startServer(port, extraEnv = {}) {
  const capturePath = path.join(os.tmpdir(), `ulugbek-gemini-capture-${port}.json`);
  try { fs.unlinkSync(capturePath); } catch {}
  const child = spawn(process.execPath, ["server.js"], {
    cwd: root,
    env: {
      ...process.env,
      NODE_ENV: "test",
      PORT: String(port),
      OPENAI_API_KEY: "",
      OPENAI_BASE_URL: "",
      GEMINI_API_KEY: "test-only-key",
      GEMINI_ALLOW_CHAT_CONTENT: "false",
      ULUGBEK_TEST_MOCK_GEMINI: "true",
      ULUGBEK_TEST_GEMINI_CAPTURE: capturePath,
      TASK_STORE_PATH: path.join(os.tmpdir(), `ulugbek-gemini-tasks-${port}.json`),
      AGENT_MEMORY_PATH: path.join(os.tmpdir(), `ulugbek-gemini-memory-${port}.json`),
      NODE_OPTIONS: `--require=${mockPath}`,
      ...extraEnv
    },
    stdio: "ignore"
  });
  return { child, capturePath, baseUrl: `http://127.0.0.1:${port}` };
}

async function waitFor(url, child) {
  const deadline = Date.now() + 8000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error("ULUGBEK AI test server exited early.");
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error("ULUGBEK AI test server readiness timed out.");
}

async function withServer(port, extraEnv, fn) {
  const server = startServer(port, extraEnv);
  try {
    await waitFor(server.baseUrl + "/api/health", server.child);
    await fn(server);
  } finally {
    server.child.kill("SIGTERM");
    await new Promise(resolve => {
      if (server.child.exitCode !== null) return resolve();
      server.child.once("exit", resolve);
      setTimeout(resolve, 1000);
    });
    try { fs.unlinkSync(server.capturePath); } catch {}
  }
}

test("Gemini chat requires explicit consent and sends only the current turn", async t => {
  await t.test("blocks Gemini when consent is disabled", async () => {
    await withServer(32211, { GEMINI_ALLOW_CHAT_CONTENT: "false" }, async ({ baseUrl, capturePath }) => {
      const response = await fetch(baseUrl + "/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "Salom" })
      });
      assert.equal(response.status, 403);
      assert.equal((await response.json()).mode, "privacy-blocked");
      assert.equal(fs.existsSync(capturePath), false, "must not contact Gemini without consent");
    });
  });

  await t.test("sends only the current message after explicit consent", async () => {
    await withServer(32212, { GEMINI_ALLOW_CHAT_CONTENT: "true" }, async ({ baseUrl, capturePath }) => {
      const response = await fetch(baseUrl + "/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "Faqat joriy xabar",
          sessionId: "testsession12345678",
          history: [{ role: "user", content: "old private message" }]
        })
      });
      assert.equal(response.status, 200);
      const data = await response.json();
      assert.equal(data.mode, "gemini-current-message-only");
      assert.equal(data.reply, "Mock Gemini javobi");
      const captured = JSON.parse(fs.readFileSync(capturePath, "utf8"));
      assert.deepEqual(captured.body.contents, [{ role: "user", parts: [{ text: "Faqat joriy xabar" }] }]);
      assert.ok(captured.body.systemInstruction);
      assert.equal(JSON.stringify(captured.body).includes("old private message"), false);
      assert.ok(captured.headerNames.includes("x-goog-api-key"));
    });
  });
});
