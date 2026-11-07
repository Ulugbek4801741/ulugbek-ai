"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const {
  normalizePublicUrl,
  robotsAllows,
  extractReadablePage
} = require("../modules/public-web-reader");

test("read-only reader accepts only safe public HTTPS URLs", () => {
  assert.equal(normalizePublicUrl("https://example.org/public")?.href, "https://example.org/public");
  assert.equal(normalizePublicUrl("http://example.org/"), null);
  assert.equal(normalizePublicUrl("https://127.0.0.1/"), null);
  assert.equal(normalizePublicUrl("https://user:pass@example.org/"), null);
});

test("robots rules deny disallowed paths and prefer the most specific allow", () => {
  const robots = [
    "User-agent: *",
    "Disallow: /private",
    "Allow: /private/public"
  ].join("\n");
  assert.equal(robotsAllows(robots, "/private/secret").allowed, false);
  assert.equal(robotsAllows(robots, "/private/public/article").allowed, true);
  assert.equal(robotsAllows(robots, "/public/article").allowed, true);
});

test("reader extracts visible page text without script or navigation content", () => {
  const page = extractReadablePage(
    "<html><head><title>Open knowledge</title></head><body>" +
    "<nav>menu</nav><article><h1>Science</h1><p>Public knowledge text.</p></article>" +
    "<script>secret()</script></body></html>"
  );
  assert.equal(page.title, "Open knowledge");
  assert.match(page.content, /Science/);
  assert.match(page.content, /Public knowledge text/);
  assert.doesNotMatch(page.content, /secret|menu/);
});
