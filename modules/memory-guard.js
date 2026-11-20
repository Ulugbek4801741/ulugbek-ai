"use strict";

function createMemoryGuard(options = {}) {
  const maxConcurrent = Math.max(1, Number(options.maxConcurrent) || 2);
  const heapLimitBytes = Math.max(64 * 1024 * 1024, Number(options.heapLimitBytes) || 210 * 1024 * 1024);
  let active = 0;
  let rejected = 0;

  function snapshot() {
    const memory = process.memoryUsage();
    return {
      activeRequests: active,
      maxConcurrent,
      rejectedRequests: rejected,
      heapUsedMB: Math.round(memory.heapUsed / 1024 / 1024),
      heapTotalMB: Math.round(memory.heapTotal / 1024 / 1024),
      rssMB: Math.round(memory.rss / 1024 / 1024),
      heapLimitMB: Math.round(heapLimitBytes / 1024 / 1024)
    };
  }

  function middleware() {
    return (req, res, next) => {
      const memory = process.memoryUsage();
      if (active >= maxConcurrent || memory.heapUsed >= heapLimitBytes) {
        rejected += 1;
        res.set("Retry-After", "10").set("Cache-Control", "no-store");
        return res.status(503).json({
          ok: false,
          error: "Server xotirasi band. 10 soniyadan keyin qayta urinib ko‘ring.",
          code: "CHAT_MEMORY_GUARD",
          memory: snapshot()
        });
      }
      active += 1;
      let released = false;
      const release = () => {
        if (released) return;
        released = true;
        active = Math.max(0, active - 1);
      };
      res.once("finish", release);
      res.once("close", release);
      next();
    };
  }

  return { middleware, status: snapshot };
}

module.exports = { createMemoryGuard };
