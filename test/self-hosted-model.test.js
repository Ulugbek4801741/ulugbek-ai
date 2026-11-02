"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const http = require("node:http");

const appPort = 32199;
const mockPort = 32198;
const appUrl = `http://127.0.0.1:${appPort}`;
let appProcess;
let mockServer;
let providerRequests = 0;

test("native-only mode ignores configured external AI endpoints", async (t) => {
  mockServer = http.createServer((_req, res) => {
    providerRequests++;
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ choices: [{ message: { content: "This must never be used." } }] }));
  });
  await new Promise(resolve => mockServer.listen(mockPort, "127.0.0.1", resolve));

  appProcess = spawn(process.execPath, ["server.js"], {
    env: {
      ...process.env,
      NODE_ENV: "test",
      PORT: String(appPort),
      TASK_STORE_PATH: require("node:path").join(require("node:os").tmpdir(), `ulugbek-tasks-${appPort}.json`),
      AGENT_MEMORY_PATH: require("node:path").join(require("node:os").tmpdir(), `ulugbek-memory-${appPort}.json`),
      OPENAI_BASE_URL: `http://127.0.0.1:${mockPort}/v1`,
      OPENAI_MODEL: "test-local-model",
      OPENAI_API_KEY: "intentionally-unused"
    },
    stdio: "ignore"
  });

  try {
    const deadline = Date.now() + 10000;
    while (Date.now() < deadline) {
      if (appProcess.exitCode !== null) throw new Error("ULUGBEK AI server exited before becoming ready.");
      try {
        const ready = await fetch(`${appUrl}/api/health`);
        if (ready.ok) break;
      } catch {}
      await new Promise(resolve => setTimeout(resolve, 150));
    }

    await t.test("chat never calls the configured provider", async () => {
      const response = await fetch(`${appUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "Salom" })
      });
      assert.equal(response.status, 200);
      const data = await response.json();
      assert.equal(data.mode, "native-symbolic-no-external-ai");
      assert.match(data.reply, /yetarli dalil topilmadi|Salom/i);
      assert.equal(providerRequests, 0);
    });

    await t.test("planner stays on native rules even when a model endpoint exists", async () => {
      const response = await fetch(`${appUrl}/api/agent/plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task: "Sinov vazifasi" })
      });
      assert.equal(response.status, 200);
      const data = await response.json();
      assert.equal(data.mode, "native-rules");
      assert.equal(providerRequests, 0);
    });
  } finally {
    appProcess?.kill("SIGTERM");
    await new Promise(resolve => mockServer.close(resolve));
  }
});
