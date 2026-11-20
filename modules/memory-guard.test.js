"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createMemoryGuard } = require("./memory-guard");

test("memory guard exposes bounded concurrency and memory snapshot", () => {
  const guard = createMemoryGuard({ maxConcurrent: 1, heapLimitBytes: 128 * 1024 * 1024 });
  const state = guard.status();
  assert.equal(state.maxConcurrent, 1);
  assert.equal(state.activeRequests, 0);
  assert.ok(state.heapUsedMB >= 0);
  assert.equal(typeof state.rejectedRequests, "number");
});

test("middleware releases slot exactly once on finish/close", () => {
  const guard = createMemoryGuard({ maxConcurrent: 1, heapLimitBytes: 1024 *  1024 * 1024 });
  const listeners = {};
  const response = {
    set() { return this; },
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.payload = payload; return this; },
    once(event, callback) { listeners[event] = callback; return this; }
  };
  let nextCalled = 0;
  guard.middleware()({}, response, () => nextCalled++);
  assert.equal(nextCalled, 1);
  assert.equal(guard.status().activeRequests, 1);
  listeners.finish();
  listeners.close();
  assert.equal(guard.status().activeRequests, 0);
});
