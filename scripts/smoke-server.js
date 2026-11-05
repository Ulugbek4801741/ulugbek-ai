"use strict";

const { spawn } = require("node:child_process");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

const port = 43000 + Math.floor(Math.random() * 10000);
const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), "ulugbek-ai-smoke-"));
const child = spawn(process.execPath, ["server.js"], {
  cwd: process.cwd(),
  env: { ...process.env, PORT: String(port), NODE_ENV: "test", ULUGBEK_DATA_DIR: dataDir },
  stdio: ["ignore", "pipe", "pipe"]
});
let logs = "";
child.stdout.on("data", chunk => { logs += chunk.toString(); });
child.stderr.on("data", chunk => { logs += chunk.toString(); });

try {
  let response = null;
  const deadline = Date.now() + 20000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error("Server process exited early.");
    try {
      response = await fetch(`http://127.0.0.1:${port}/api/health`, { signal: AbortSignal.timeout(1500) });
      if (response.ok) break;
    } catch (_) {}
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  if (!response || !response.ok) throw new Error("Health endpoint did not become ready within 20 seconds.");
  const health = await response.json();
  if (health.app !== "ULUGBEK AI" || health.ok !== true) {
    throw new Error("Unexpected health response: " + JSON.stringify(health));
  }
  const diagnostics = await fetch(`http://127.0.0.1:${port}/api/diagnostics`, { signal: AbortSignal.timeout(3000) });
  if (!diagnostics.ok) throw new Error("Diagnostics endpoint returned HTTP " + diagnostics.status);
  console.log("STARTUP_SMOKE_OK", JSON.stringify({
    healthStatus: response.status,
    diagnosticsStatus: diagnostics.status,
    app: health.app,
    uptime: health.processUptimeSeconds
  }));
} catch (error) {
  console.error("STARTUP_SMOKE_FAILED:", error.message);
  console.error(logs);
  process.exitCode = 1;
} finally {
  if (child.exitCode === null) {
    child.kill("SIGTERM");
    await Promise.race([
      new Promise(resolve => child.once("exit", resolve)),
      new Promise(resolve => setTimeout(resolve, 5000))
    ]);
    if (child.exitCode === null) child.kill("SIGKILL");
  }
  await fs.rm(dataDir, { recursive: true, force: true });
}
