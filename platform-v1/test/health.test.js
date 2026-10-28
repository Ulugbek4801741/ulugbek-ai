"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createServer } = require("node:http");
const { createApp } = require("../src/app");

async function withServer(app, run) {
  const server = createServer(app);
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  try {
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
}

test("live endpoint returns service identity without exposing secrets", async () => {
  const app = createApp({ db: { query: async () => ({ rows: [{ "?column?": 1 }] }) }, redis: { ping: async () => "PONG" } });
  await withServer(app, async base => {
    const response = await fetch(base + "/health/live");
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.status, "ok");
    assert.equal(body.service, "ulugbek-ai-platform-v1");
    assert.equal("DATABASE_URL" in body, false);
  });
});

test("readiness returns 200 only when PostgreSQL and Redis respond", async () => {
  const app = createApp({
    db: { query: async () => ({ rows: [{ value: 1 }] }) },
    redis: { ping: async () => "PONG" }
  });
  await withServer(app, async base => {
    const response = await fetch(base + "/health/ready");
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      status: "ready",
      checks: { database: "ok", redis: "ok" }
    });
  });
});

test("readiness fails closed if a dependency is unavailable", async () => {
  const app = createApp({
    db: { query: async () => { throw new Error("database down"); } },
    redis: { ping: async () => "PONG" }
  });
  await withServer(app, async base => {
    const response = await fetch(base + "/health/ready");
    assert.equal(response.status, 503);
    const body = await response.json();
    assert.equal(body.status, "not_ready");
    assert.equal(body.checks.database, "unavailable");
  });
});

test("unknown routes return a stable JSON 404", async () => {
  const app = createApp({ db: { query: async () => ({}) }, redis: { ping: async () => "PONG" } });
  await withServer(app, async base => {
    const response = await fetch(base + "/does-not-exist");
    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), { error: "not_found" });
  });
});