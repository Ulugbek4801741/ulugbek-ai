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

test("configured OpenAI-compatible provider serves chat while planner remains native", async (t) => {
  mockServer = http.createServer((_req, res) => {
    providerRequests++;
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ choices: [{ message: { content: "Provider test response." } }] }));
  });
  await new Promise(resolve => mockServer.listen(mockPort, "127.0.0.1", resolve));

  appProcess = spawn(process.execPath, ["server.js"], {
    env: {
      ...process.env,
      NODE_ENV: "test",
      PORT: String(appPort),
      TASK_STORE_PATH: require("node:path").join(require("node:os").tmpdir(), `ulugbek-tasks-${appPort}.json`),
      AGENT_MEMORY_PATH: require("node:path").join(require("node:os").tmpdir(), `ulugbek-memory-${appPort}.json`),
      ULUGBEK_AI_PROVIDER: "openai-compatible",
      ULUGBEK_AI_BASE_URL: `http://127.0.0.1:${mockPort}/v1/chat/completions`,
      ULUGBEK_AI_MODEL: "test-local-model",
      ULUGBEK_AI_TOKEN: "test-token",
      OPENAI_BASE_URL: "",
      OPENAI_MODEL: "",
      OPENAI_API_KEY: ""
    },
    stdio: "ignore"
  });

  try {
    const deadline = Date.now() + 10000;
    let ready = false;
    while (Date.now() < deadline) {
      if (appProcess.exitCode !== null) throw new Error("ULUGBEK AI server exited before becoming ready.");
      try {
        const response = await fetch(`${appUrl}/api/health`);
        if (response.ok) { ready = true; break; }
      } catch {}
      await new Promise(resolve => setTimeout(resolve, 150));
    }
    assert.equal(ready, true, "ULUGBEK AI server did not become ready.");

    await t.test("chat calls the configured compatible provider", async () => {
      const response = await fetch(`${appUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "Salom" })
      });
      assert.equal(response.status, 200);
      const data = await response.json();
      assert.equal(data.mode, "self-hosted-single-agent-no-external-ai");
      assert.equal(data.reply, "Provider test response.");
      assert.equal(providerRequests, 1);
    });

    await t.test("planner stays on native rules and does not call the model", async () => {
      const response = await fetch(`${appUrl}/api/agent/plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task: "Sinov vazifasi" })
      });
      assert.equal(response.status, 200);
      const data = await response.json();
      assert.equal(data.mode, "native-rules");
      assert.equal(providerRequests, 1);
    });
  } finally {
    appProcess?.kill("SIGTERM");
    await new Promise(resolve => mockServer.close(resolve));
  }
});
