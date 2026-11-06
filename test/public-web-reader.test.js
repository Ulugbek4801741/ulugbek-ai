"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const reader = require("../modules/public-web-reader");

test("only accepts public HTTPS hostnames and rejects local or non-web targets", () => {
  assert.equal(reader.normalizePublicUrl("https://example.org/path").hostname, "example.org");
  for (const url of [
    "http://example.org", "file:///etc/passwd", "ftp://example.org/file",
    "https://localhost/", "https://127.0.0.1/", "https://192.168.1.2/",
    "https://user:pass@example.org/", "https://example.org:8443/"
  ]) assert.equal(reader.normalizePublicUrl(url), null, url);
});

test("blocks private, loopback, link-local and reserved IP addresses", () => {
  for (const ip of ["127.0.0.1", "10.0.0.2", "172.16.0.1", "192.168.0.1",
    "169.254.169.254", "0.0.0.0", "224.0.0.1", "::1", "fc00::1", "fe80::1"])
    assert.equal(reader.isPublicAddress(ip), false, ip);
  for (const ip of ["8.8.8.8", "1.1.1.1", "2606:4700:4700::1111"])
    assert.equal(reader.isPublicAddress(ip), true, ip);
});

test("robots policy blocks disallowed paths and honors longer allow rules", () => {
  const robots = "User-agent: *\nDisallow: /private\nAllow: /private/open\n";
  assert.equal(reader.robotsAllows(robots, "/private/secret").allowed, false);
  assert.equal(reader.robotsAllows(robots, "/private/open/article").allowed, true);
  assert.equal(reader.robotsAllows(robots, "/public").allowed, true);
});

test("robots policy honors wildcard and end-anchor rules and crawl delay", () => {
  const robots = "User-agent: ULUGBEK-AI-OpenKnowledge\nDisallow: /*?download=1$\nCrawl-delay: 3\n";
  assert.equal(reader.robotsAllows(robots, "/article?download=1").allowed, false);
  assert.equal(reader.robotsAllows(robots, "/article?download=0").allowed, true);
  assert.equal(reader.robotsAllows(robots, "/article").delayMs, 3000);
});

test("extracts page title and readable text while dropping scripts and navigation", () => {
  const page = reader.extractReadablePage("<html><head><title>O‘zbekiston &amp; fan</title><script>secret()</script></head><body><nav>Menu</nav><article>Ochiq bilimlar sahifasi. Bu matn o‘rganish uchun kerak.</article></body></html>");
  assert.equal(page.title, "O‘zbekiston & fan");
  assert.match(page.content, /Ochiq bilimlar sahifasi/);
  assert.doesNotMatch(page.content, /secret|Menu/);
});
