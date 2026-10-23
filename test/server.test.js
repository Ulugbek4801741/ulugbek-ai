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
    env: { ...process.env, PORT: String(port), ADMIN_ACCESS_CODE: "ci-test-admin-code", ADMIN_SESSION_SECRET: "ci-test-session-secret-long-enough" },
    stdio: "ignore"
  });

  try {
    await waitForServer();

    await t.test("virtual lab status endpoint works without provider API keys", async () => {
      const response = await fetch(`${baseUrl}/api/lab/status`);
      const body = await response.json();
      assert.equal(response.status, 200);
      assert.equal(body.ok, true);
      assert.equal(body.apiKeyRequired, false);
      assert.equal(body.mode, "public-web-search-and-local-json");
    });

    await t.test("virtual lab rejects an empty research query", async () => {
      const response = await fetch(`${baseUrl}/api/lab/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: "   " })
      });
      assert.equal(response.status, 400);
    });

    await t.test("voice avatar page and assets are served", async () => {
      const page = await fetch(`${baseUrl}/voice.html`);
      const script = await fetch(`${baseUrl}/voice.js`);
      const css = await fetch(`${baseUrl}/voice.css`);
      assert.equal(page.status, 200);
      assert.match(await page.text(), /ULUGBEK AI — Suhbat/);
      assert.equal(script.status, 200);
      assert.match(await script.text(), /SpeechRecognition/);
      assert.equal(css.status, 200);
    });

    await t.test("virtual lab page and client script are served", async () => {
      const page = await fetch(`${baseUrl}/lab.html`);
      const script = await fetch(`${baseUrl}/lab.js`);
      assert.equal(page.status, 200);
      assert.match(await page.text(), /Virtual laboratoriya/);
      assert.equal(script.status, 200);
    });

    await t.test("admin dashboard assets are served", async () => {
      const page = await fetch(`${baseUrl}/admin.html`);
      const script = await fetch(`${baseUrl}/admin.js`);
      const css = await fetch(`${baseUrl}/admin.css`);
      assert.equal(page.status, 200);
      assert.match(await page.text(), /Administrator paneli/);
      assert.equal(script.status, 200);
      assert.match(await script.text(), /api\/admin\/overview/);
      assert.equal(css.status, 200);
    });

    await t.test("admin API denies anonymous access and protects overview", async () => {
      const denied = await fetch(`${baseUrl}/api/admin/overview`);
      assert.equal(denied.status, 401);
      const status = await fetch(`${baseUrl}/api/admin/status`);
      assert.equal((await status.json()).authenticated, false);
    });

    await t.test("admin login rejects wrong code and accepts correct code", async () => {
      const wrong = await fetch(`${baseUrl}/api/admin/login`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: "wrong" })
      });
      assert.equal(wrong.status, 401);
      const login = await fetch(`${baseUrl}/api/admin/login`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: "ci-test-admin-code" })
      });
      assert.equal(login.status, 200);
      const cookie = login.headers.get("set-cookie").split(";")[0];
      const overview = await fetch(`${baseUrl}/api/admin/overview`, { headers: { Cookie: cookie } });
      const data = await overview.json();
      assert.equal(overview.status, 200);
      assert.equal(data.ok, true);
      assert.equal(typeof data.uptimeSeconds, "number");
      const logout = await fetch(`${baseUrl}/api/admin/logout`, { method: "POST", headers: { Cookie: cookie } });
      assert.equal(logout.status, 200);
      const deniedAfterLogout = await fetch(`${baseUrl}/api/admin/overview`, { headers: { Cookie: cookie } });
      assert.equal(deniedAfterLogout.status, 401);
    });

    await t.test("health endpoint reports the app", async () => {
      const response = await fetch(`${baseUrl}/api/health`);
      const body = await response.json();
      assert.equal(response.status, 200);
      assert.equal(body.ok, true);
      assert.equal(body.app, "ULUGBEK AI");
    });

    await t.test("diagnostics distinguish configured AI from demo mode", async () => {
      const response = await fetch(`${baseUrl}/api/diagnostics`);
      const body = await response.json();
      assert.equal(response.status, 200);
      assert.equal(body.backend, "running");
      assert.equal(body.ai, "demo-only-no-model-key");
      assert.equal(body.automaticFailover, "not-configured-requires-authorized-backup-host");
    });

    await t.test("knowledge entries can be saved and retrieved", async () => {
      const title = "CI test knowledge " + Date.now();
      const create = await fetch(`${baseUrl}/api/lab/knowledge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content: "Test content", source: "https://example.com", agent: "Verifier Agent" })
      });
      const created = await create.json();
      assert.equal(create.status, 201);
      assert.equal(created.entry.title, title);
      const listResponse = await fetch(`${baseUrl}/api/lab/knowledge`);
      const list = await listResponse.json();
      assert.ok(list.entries.some((entry) => entry.title === title));
    });

    await t.test("agent memory can be saved and retrieved", async () => {
      const content = "CI test memory " + Date.now();
      const create = await fetch(`${baseUrl}/api/lab/memory/Verifier%20Agent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content })
      });
      assert.equal(create.status, 201);
      const read = await fetch(`${baseUrl}/api/lab/memory/Verifier%20Agent`);
      const body = await read.json();
      assert.ok(body.memory.some((item) => item.content === content));
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
