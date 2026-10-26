"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const net = require("node:net");
const os = require("node:os");
const path = require("node:path");
const fs = require("node:fs/promises");

let child;
let baseUrl;
let tempDir;

async function reservePort() {
  const server = net.createServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const port = server.address().port;
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  return port;
}

async function waitForServer(url) {
  const deadline = Date.now() + 10000;
  let lastError;
  while (Date.now() < deadline) {
    if (child && child.exitCode !== null) {
      throw new Error("Server child process exited before becoming ready.");
    }
    try {
      const response = await fetch(url + "/api/health", { signal: AbortSignal.timeout(500) });
      if (response.ok) return;
    } catch (error) {
      lastError = error;
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error("Server did not become ready: " + (lastError?.message || "timeout"));
}

test("malformed admin cookies do not crash auth, status, or logout routes", async t => {
  const port = await reservePort();
  tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "ulugbek-cookie-test-"));
  baseUrl = "http://127.0.0.1:" + port;
  child = spawn(process.execPath, ["server.js"], {
    cwd: path.resolve(__dirname, ".."),
    env: {
      ...process.env,
      PORT: String(port),
      TASK_STORE_PATH: path.join(tempDir, "tasks.json"),
      AGENT_MEMORY_PATH: path.join(tempDir, "memory.json"),
      ADMIN_SESSION_SECRET: "test-only-secret"
    },
    stdio: "ignore"
  });

  try {
    await waitForServer(baseUrl);

    const status = await fetch(baseUrl + "/api/admin/status", {
      headers: { Cookie: "ulugbek_admin=%" }
    });
    assert.equal(status.status, 200);
    assert.equal((await status.json()).authenticated, false);

    const protectedRoute = await fetch(baseUrl + "/api/admin/overview", {
      headers: { Cookie: "ulugbek_admin=%" }
    });
    assert.equal(protectedRoute.status, 401);

    const logout = await fetch(baseUrl + "/api/admin/logout", {
      method: "POST",
      headers: { Cookie: "ulugbek_admin=%" }
    });
    assert.equal(logout.status, 200);
    assert.equal((await logout.json()).ok, true);
  } finally {
    child.kill("SIGTERM");
    await new Promise(resolve => {
      if (child.exitCode !== null) return resolve();
      const timeout = setTimeout(resolve, 1500);
      child.once("exit", () => { clearTimeout(timeout); resolve(); });
    });
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});
