"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("GitHub Pages and native localhost target the active ULUGBEK Render service", () => {
  const source = fs.readFileSync(path.join(__dirname, "../public/config.js"), "utf8");
  assert.match(source, /https:\/\/ulugbek-ai2\.onrender\.com/);
  assert.doesNotMatch(source, /ulugbek-ai-1\.onrender\.com/);
  assert.match(source, /isGitHubPages \|\| isNativeLocalhost/);
});
