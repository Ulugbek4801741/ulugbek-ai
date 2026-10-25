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
    env: { ...process.env, PORT: String(port), FRONTEND_ORIGIN: "https://ulugbek4801741.github.io", ADMIN_ACCESS_CODE: "ci-test-admin-code", ADMIN_SESSION_SECRET: "ci-test-session-secret-long-enough", LAB_ADMIN_TOKEN: "ci-test-lab-admin-token-long-enough-32chars" },
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

    await t.test("open-knowledge learning rejects empty topics without an API key", async () => {
      const response = await fetch(`${baseUrl}/api/lab/learn`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer ci-test-lab-admin-token-long-enough-32chars" },
        body: JSON.stringify({ topic: "   " })
      });
      assert.equal(response.status, 400);
      assert.match((await response.json()).error, /mavzu bo‘sh/);
    });

    await t.test("knowledge submissions are marked pending review, not human reviewed", async () => {
      const response = await fetch(`${baseUrl}/api/lab/knowledge`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer ci-test-lab-admin-token-long-enough-32chars" },
        body: JSON.stringify({
          title: "CI test knowledge entry",
          content: "This is test-only content; it has not been independently verified.",
          source: "https://example.org/ci-test"
        })
      });
      assert.equal(response.status, 201);
      const body = await response.json();
      assert.equal(body.entry.status, "pending-review");
    });

    await t.test("knowledge and agent memory endpoints deny anonymous access", async () => {
      const knowledge = await fetch(`${baseUrl}/api/lab/knowledge`);
      assert.equal(knowledge.status, 401);
      const memory = await fetch(`${baseUrl}/api/lab/memory/Verifier%20Agent`);
      assert.equal(memory.status, 401);
      const write = await fetch(`${baseUrl}/api/lab/knowledge`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "unauthorized", content: "should not save" })
      });
      assert.equal(write.status, 401);
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

    await t.test("chat page has no admin button or password gate; Google OAuth routes are present", async () => {
      const page = await fetch(`${baseUrl}/voice.html`);
      const pageText = await page.text();
      const script = await (await fetch(`${baseUrl}/voice.js`)).text();
      assert.doesNotMatch(pageText, /admin-gate|admin-gate-open|type="password"/);
      assert.doesNotMatch(script, /api\/admin\/chat-gate|admin-gate-open/);
      const login = await fetch(`${baseUrl}/api/auth/google`);
      assert.equal(login.status, 503);
      assert.match(await login.text(), /Google kirishi sozlanmagan/);
    });

    await t.test("admin API denies anonymous access and protects overview", async () => {
      const denied = await fetch(`${baseUrl}/api/admin/overview`);
      assert.equal(denied.status, 401);
      const status = await fetch(`${baseUrl}/api/admin/status`);
      assert.equal((await status.json()).authenticated, false);
    });

    await t.test("configured GitHub Pages origin can call backend and CSP permits it", async () => {
      const response = await fetch(`${baseUrl}/api/health`, { headers: { Origin: "https://ulugbek4801741.github.io" } });
      assert.equal(response.status, 200);
      assert.equal(response.headers.get("access-control-allow-origin"), "https://ulugbek4801741.github.io");
      assert.match(response.headers.get("content-security-policy") || "", /connect-src[^;]*https:\/\/ulugbek4801741\.github\.io/);
      const denied = await fetch(`${baseUrl}/api/health`, { headers: { Origin: "https://untrusted.example" } });
      assert.equal(denied.headers.get("access-control-allow-origin"), null);
    });

    await t.test("health endpoint reports the app", async () => {
      const response = await fetch(`${baseUrl}/api/health`);
      const body = await response.json();
      assert.equal(response.status, 200);
      assert.equal(body.ok, true);
      assert.equal(body.app, "ULUGBEK AI");
    });

    await t.test("module catalogue endpoint lists capabilities and labels planned integrations honestly", async () => {
      const response = await fetch(`${baseUrl}/api/modules`);
      const body = await response.json();
      assert.equal(response.status, 200);
      assert.equal(body.ok, true);
      assert.ok(body.modules.length >= 10);
      assert.equal(body.modules.find((item) => item.id === "phone-agent").status, "planned");
    });

    await t.test("workflow policy endpoint fails closed", async () => {
      const response = await fetch(`${baseUrl}/api/workflows/policy`);
      const body = await response.json();
      assert.equal(response.status, 200);
      assert.equal(body.policy.failClosed, true);
      assert.equal(body.policy.execution, "disabled_without_explicitly-configured-adapter");
    });

    await t.test("workflow endpoint creates a plan but never enables external execution", async () => {
      const response = await fetch(`${baseUrl}/api/workflows`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task: "Prepare a report", action: "send_message" })
      });
      const body = await response.json();
      assert.equal(response.status, 201);
      assert.equal(body.workflow.requiresHumanApproval, true);
      assert.equal(body.workflow.executionAllowed, false);
      assert.equal(body.execution, "disabled");
    });

    await t.test("workflow endpoint rejects empty and oversized tasks", async () => {
      const empty = await fetch(`${baseUrl}/api/workflows`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task: "   " })
      });
      assert.equal(empty.status, 400);
      const oversized = await fetch(`${baseUrl}/api/workflows`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task: "x".repeat(4001) })
      });
      assert.equal(oversized.status, 413);
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
        headers: { "Content-Type": "application/json", "Authorization": "Bearer ci-test-lab-admin-token-long-enough-32chars" },
        body: JSON.stringify({ title, content: "Test content", source: "https://example.com", agent: "Verifier Agent" })
      });
      const created = await create.json();
      assert.equal(create.status, 201);
      assert.equal(created.entry.title, title);
      const listResponse = await fetch(`${baseUrl}/api/lab/knowledge`, { headers: { "Authorization": "Bearer ci-test-lab-admin-token-long-enough-32chars" } });
      const list = await listResponse.json();
      assert.ok(list.entries.some((entry) => entry.title === title));
    });

    await t.test("agent memory can be saved and retrieved", async () => {
      const content = "CI test memory " + Date.now();
      const create = await fetch(`${baseUrl}/api/lab/memory/Verifier%20Agent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer ci-test-lab-admin-token-long-enough-32chars" },
        body: JSON.stringify({ content })
      });
      assert.equal(create.status, 201);
      const read = await fetch(`${baseUrl}/api/lab/memory/Verifier%20Agent`, { headers: { "Authorization": "Bearer ci-test-lab-admin-token-long-enough-32chars" } });
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
