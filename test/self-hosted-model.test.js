const test = require("node:test");
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const http = require("node:http");

const appPort = 32199;
const mockPort = 32198;
const appUrl = `http://127.0.0.1:${appPort}`;
let appProcess;
let mockServer;
let appStderr = "";

function waitFor(url, processRef) {
  const deadline = Date.now() + 10000;
  return new Promise((resolve, reject) => {
    const attempt = async () => {
      if (processRef?.exitCode !== null && processRef?.exitCode !== undefined) {
        return reject(new Error("ULUGBEK AI server exited before becoming ready."));
      }
      try {
        const response = await fetch(url);
        if (response.ok) return resolve();
      } catch {}
      if (Date.now() >= deadline) return reject(new Error("Server readiness timed out."));
      setTimeout(attempt, 150);
    };
    attempt();
  });
}

test("self-hosted OpenAI-compatible model works without an API key", async (t) => {
  mockServer = http.createServer(async (req, res) => {
    if (req.method !== "POST" || req.url !== "/v1/chat/completions") {
      res.writeHead(404).end();
      return;
    }
    let raw = "";
    for await (const chunk of req) raw += chunk;
    const body = JSON.parse(raw);
    const isPlan = body.response_format?.type === "json_object";
    const content = isPlan
      ? JSON.stringify({
          title: "Mahalliy model rejasi",
          steps: [{ title: "Tekshiruv", detail: "Mahalliy endpoint javobi tekshirildi.", role: "Verifier Agent" }],
          note: "Sinov modeli javobi."
        })
      : "Salom, bu o‘z serveridagi sinov modeli.";
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ choices: [{ message: { content } }] }));
  });
  await new Promise(resolve => mockServer.listen(mockPort, "127.0.0.1", resolve));

  appProcess = spawn(process.execPath, ["server.js"], {
    env: {
      ...process.env,
      PORT: String(appPort),
      TASK_STORE_PATH: require("node:path").join(require("node:os").tmpdir(), `ulugbek-tasks-${appPort}.json`),
      AGENT_MEMORY_PATH: require("node:path").join(require("node:os").tmpdir(), `ulugbek-memory-${appPort}.json`),
      OPENAI_BASE_URL: `http://127.0.0.1:${mockPort}/v1`,
      OPENAI_MODEL: "test-local-model",
      OPENAI_API_KEY: ""
    },
    stdio: ["ignore", "ignore", "pipe"]
  });

  appProcess.stderr.on("data", chunk => { appStderr += chunk.toString(); });

  try {
    await waitFor(`${appUrl}/api/health`, appProcess).catch(error => { throw new Error(error.message + " stderr: " + appStderr); });

    await t.test("chat uses the configured local endpoint without Authorization", async () => {
      const response = await fetch(`${appUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "Salom" })
      });
      assert.equal(response.status, 200);
      const data = await response.json();
      assert.equal(data.mode, "multi-agent");
      assert.ok(Array.isArray(data.agents));
      assert.ok(data.agents.length >= 2);
      assert.match(data.reply, /sinov modeli/);
    });

    await t.test("agent planner uses the configured local endpoint without an API key", async () => {
      const response = await fetch(`${appUrl}/api/agent/plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task: "Sinov vazifasi" })
      });
      assert.equal(response.status, 200);
      const data = await response.json();
      assert.equal(data.mode, "ai");
      assert.equal(data.plan.title, "Mahalliy model rejasi");
    });
  } finally {
    appProcess?.kill("SIGTERM");
    await new Promise(resolve => mockServer.close(resolve));
  }
});
