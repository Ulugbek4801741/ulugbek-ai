"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { detect } = require("../public/compat.js");

function environment(overrides) {
  return Object.assign({
    fetch: function(){},
    Promise: Promise,
    XMLHttpRequest: function(){},
    document: { createElement: function(){}, getElementById: function(){} },
    navigator: { deviceMemory: 8, hardwareConcurrency: 8 },
    localStorage: { getItem: function(){ return null; } },
    speechSynthesis: {}
  }, overrides || {});
}

test("modern devices use the full profile", () => {
  const result = detect(environment({}));
  assert.equal(result.profile, "full");
  assert.equal(result.fallbacks.network, "fetch");
  assert.equal(result.fallbacks.voiceInput, "text-input");
});

test("low-memory devices get the lite profile", () => {
  const env = environment({ navigator: { deviceMemory: 2, hardwareConcurrency: 2 } });
  const result = detect(env);
  assert.equal(result.profile, "lite");
  assert.equal(result.fallbacks.interface, "reduced-motion-lite-ui");
});

test("old browsers without fetch use the legacy interface", () => {
  const env = environment({ fetch: undefined, Promise: undefined, speechSynthesis: undefined });
  const result = detect(env);
  assert.equal(result.profile, "legacy");
  assert.equal(result.fallbacks.network, "xmlhttprequest");
  assert.equal(result.fallbacks.voiceOutput, "text-only");
});

test("devices without DOM or network transport are marked unsupported", () => {
  const result = detect({ navigator: {}, document: {} });
  assert.equal(result.profile, "unsupported");
});

test("storage access is guarded when browser privacy settings throw", () => {
  const env = environment({});
  Object.defineProperty(env, "localStorage", { get: function(){ throw new Error("blocked"); } });
  const result = detect(env);
  assert.equal(result.capabilities.localStorage, false);
  assert.equal(result.fallbacks.storage, "memory-only");
});
