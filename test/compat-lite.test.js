"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const compat = require("../public/compat.js");

function environment(overrides = {}) {
  return {
    navigator: { deviceMemory: 8, hardwareConcurrency: 8 },
    document: { createElement() {}, getElementById() {} },
    fetch() {},
    Promise,
    XMLHttpRequest: function XMLHttpRequest() {},
    ...overrides
  };
}

test("low-memory devices receive the lite interface profile", () => {
  const result = compat.detect(environment({
    navigator: { deviceMemory: 2, hardwareConcurrency: 2 }
  }));
  assert.equal(result.profile, "lite");
  assert.equal(result.fallbacks.interface, "reduced-motion-lite-ui");
});

test("older browsers without fetch use the legacy text interface", () => {
  const result = compat.detect(environment({ fetch: undefined }));
  assert.equal(result.profile, "legacy");
  assert.equal(result.fallbacks.network, "xmlhttprequest");
});

test("modern devices keep the full interface profile", () => {
  const result = compat.detect(environment());
  assert.equal(result.profile, "full");
});
