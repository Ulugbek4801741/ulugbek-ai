"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const source = fs.readFileSync(require.resolve("../public/config.js"), "utf8");

test("GitHub Pages and Capacitor localhost use the active Render API", () => {
  for (const hostname of ["ulugbek4801741.github.io", "localhost", "127.0.0.1"]) {
    const window = { location: { hostname, origin: "https://" + hostname } };
    vm.runInNewContext(source, { window });
    assert.equal(window.ULUGBEK_API_BASE_URL, "https://ulugbek-ai2.onrender.com");
  }
});

test("Render-hosted frontend keeps its same-origin API", () => {
  const window = { location: { hostname: "ulugbek-ai2.onrender.com", origin: "https://ulugbek-ai2.onrender.com" } };
  vm.runInNewContext(source, { window });
  assert.equal(window.ULUGBEK_API_BASE_URL, window.location.origin);
});
