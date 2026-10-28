"use strict";

const { Pool } = require("pg");
const Redis = require("ioredis");
const { createApp } = require("./app");

const required = ["DATABASE_URL", "REDIS_URL"];
for (const name of required) {
  if (!process.env[name]) {
    console.error(`Missing required environment variable: ${name}`);
    process.exit(1);
  }
}

const port = Number(process.env.PORT || 8080);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error("PORT must be a valid TCP port");
  process.exit(1);
}

const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: Number(process.env.PG_POOL_MAX || 20),
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
  ssl: process.env.PG_SSL === "true" ? { rejectUnauthorized: true } : undefined
});
const redis = new Redis(process.env.REDIS_URL, {
  maxRetriesPerRequest: 2,
  connectTimeout: 5000,
  enableReadyCheck: true,
  lazyConnect: true
});

let server;
let shuttingDown = false;

async function start() {
  await redis.connect();
  await db.query("SELECT 1");
  const app = createApp({ db, redis });
  server = app.listen(port, "0.0.0.0", () => {
    console.log(`ULUGBEK AI Platform v1 listening on port ${port}`);
  });
}

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`Received ${signal}; shutting down gracefully`);
  const forceExit = setTimeout(() => process.exit(1), 10000);
  forceExit.unref();
  if (server) {
    await new Promise(resolve => server.close(resolve));
  }
  await Promise.allSettled([db.end(), redis.quit()]);
  clearTimeout(forceExit);
  process.exit(0);
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

start().catch(async error => {
  console.error("Startup failed; service will not accept traffic.", error.message);
  await Promise.allSettled([db.end(), redis.quit()]);
  process.exit(1);
});