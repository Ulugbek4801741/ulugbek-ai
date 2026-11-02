"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const net = require("node:net");
const os = require("node:os");
const path = require("node:path");
const fs = require("node:fs/promises");

async function unusedPort() {
  const server = net.createServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  const port = address.port;
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  return port;
}

test("HTTP health and diagnostics endpoints report real single-instance limits", { timeout: 20000 }, async () => {
  const port = await unusedPort();
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "ulugbek-server-health-"));
  const child = spawn(process.execPath, ["server.js"], {
    cwd: path.resolve(__dirname, ".."),
    env: {
      ...process.env,
      NODE_ENV: "test",
      PORT: String(port),
      TASK_STORE_PATH: path.join(tempDir, "tasks.json"),
      DEVELOPER_AGENT_ENABLED: "false",
      LAB_LEARNING_WORKER_ENABLED: "false"
    },
    stdio: "ignore"
  });

  const base = `http://127.0.0.1:${port}`;
  try {
    let healthResponse;
    for (let attempt = 0; attempt < 100; attempt += 1) {
      if (child.exitCode !== null) throw new Error(`Server exited early with code ${child.exitCode}`);
      try {
        healthResponse = await fetch(`${base}/api/health`, { signal: AbortSignal.timeout(1000) });
        break;
      } catch (_) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    assert.ok(healthResponse, "server did not become ready within 10 seconds");
    assert.equal(healthResponse.status, 200);
    const health = await healthResponse.json();
    assert.equal(health.ok, true);
    assert.equal(health.storageMode, "local-json");
    assert.equal(health.workerConcurrency, 1);
    assert.equal(health.multiInstanceSafe, false);
    assert.equal(health.automaticFailoverReady, false);
    assert.ok(Number.isFinite(health.processUptimeSeconds));

    const diagnosticsResponse = await fetch(`${base}/api/diagnostics`, { signal: AbortSignal.timeout(2000) });
    assert.equal(diagnosticsResponse.status, 200);
    const diagnostics = await diagnosticsResponse.json();
    assert.match(diagnostics.productionDatabase, /not-configured/i);
    assert.match(diagnostics.automaticFailover, /not-configured/i);
  } finally {
    child.kill("SIGTERM");
    await Promise.race([
      new Promise(resolve => child.once("exit", resolve)),
      new Promise(resolve => setTimeout(resolve, 3000))
    ]);
    if (child.exitCode === null) child.kill("SIGKILL");
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});
