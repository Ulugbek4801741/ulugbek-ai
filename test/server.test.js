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

    await t.test("agent planner creates a structured plan", async () => {
      const response = await fetch(`${baseUrl}/api/agent/plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task: "Menga veb-ilova yaratish rejasini tuz" })
      });
      const body = await response.json();
      assert.equal(response.status, 200);
      assert.equal(typeof body.plan.title, "string");
      assert.ok(Array.isArray(body.plan.steps));
      assert.ok(body.plan.steps.length >= 3);
    });


    await t.test("malformed JSON receives a safe 400 response", async () => {
      const response = await fetch(`${baseUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{invalid-json"
      });
      const body = await response.json();
      assert.equal(response.status, 400);
      assert.match(body.error, /JSON/i);
    });

    await t.test("oversized JSON receives a safe 413 response", async () => {
      const response = await fetch(`${baseUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "x".repeat(25000) })
      });
      const body = await response.json();
      assert.equal(response.status, 413);
      assert.ok(typeof body.error === "string");
    });

    await t.test("planner rejects tasks above the documented limit", async () => {
      const response = await fetch(`${baseUrl}/api/agent/plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task: "x".repeat(4001) })
      });
      assert.equal(response.status, 413);
    });

    await t.test("agent planner rejects an empty task", async () => {
      const response = await fetch(`${baseUrl}/api/agent/plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task: "   " })
      });
      assert.equal(response.status, 400);
    });
  } finally {
    server.kill("SIGTERM");
  }
});
