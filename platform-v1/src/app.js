"use strict";

const express = require("express");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

function createApp({ db, redis, startedAt = Date.now() } = {}) {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", Number(process.env.TRUST_PROXY_HOPS || 0));
  app.use(helmet());
  app.use(express.json({ limit: "32kb", strict: true }));
  app.use("/api/", rateLimit({
    windowMs: 60_000,
    limit: 120,
    standardHeaders: "draft-8",
    legacyHeaders: false
  }));

  app.get("/health/live", (_req, res) => {
    res.set("Cache-Control", "no-store");
    res.status(200).json({
      status: "ok",
      service: "ulugbek-ai-platform-v1",
      uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000)
    });
  });

  app.get("/health/ready", async (_req, res) => {
    const checks = { database: "unknown", redis: "unknown" };
    try {
      if (!db || !redis) throw new Error("Required dependency clients are missing");
      await db.query("SELECT 1");
      checks.database = "ok";
      const pong = await redis.ping();
      if (pong !== "PONG") throw new Error("Redis health check returned an unexpected response");
      checks.redis = "ok";
      res.set("Cache-Control", "no-store");
      return res.status(200).json({ status: "ready", checks });
    } catch (_error) {
      if (checks.database === "unknown") checks.database = "unavailable";
      if (checks.redis === "unknown") checks.redis = "unavailable";
      res.set("Cache-Control", "no-store");
      return res.status(503).json({ status: "not_ready", checks });
    }
  });

  app.use((_req, res) => {
    res.status(404).json({ error: "not_found" });
  });

  app.use((err, _req, res, _next) => {
    const status = Number.isInteger(err.status) && err.status >= 400 && err.status < 500 ? err.status : 500;
    res.status(status).json({ error: status === 500 ? "internal_error" : "invalid_request" });
  });

  return app;
}

module.exports = { createApp };