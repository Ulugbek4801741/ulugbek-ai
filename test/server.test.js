const test = require("node:test");
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");

const port = 32197;
const baseUrl = `http://127.0.0.1:${port}`;
let server;

async function waitForServer() {
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) {
      throw new Error("Server process exited before becoming ready.");
    }
    try {
      const response = await fetch(`${baseUrl}/api/health`);
      if (response.ok) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  throw new Error("Server did not become ready within 10 seconds.");
}

test("API smoke tests", async (t) => {
  server = spawn(process.execPath, ["server.js"], {
    env: { ...process.env, PORT: String(port) },
    stdio: "ignore"
  });

  try {
    await waitForServer();

    await t.test("health endpoint reports the app", async () => {
      const response = await fetch(`${baseUrl}/api/health`);
      const body = await response.json();
      assert.equal(response.status, 200);
      assert.equal(body.ok, true);
      assert.equal(body.app, "ULUGBEK AI");
    });

    await t.test("chat rejects an empty message", async () => {
      const response = await fetch(`${baseUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "   " })
      });
      assert.equal(response.status, 400);
    });

    await t.test("chat accepts a message in demo mode", async () => {
      const response = await fetch(`${baseUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "Salom" })
      });
      const body = await response.json();
      assert.equal(response.status, 200);
      assert.equal(body.mode, "demo");
      assert.equal(body.receivedCharacters, 5);
    });
  } finally {
    server.kill("SIGTERM");
  }
});
