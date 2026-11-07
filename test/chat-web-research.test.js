"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const research = require("../modules/chat-web-research");

test("parses public DuckDuckGo results and strips markup", () => {
  const html = '<a class="result__a" href="https://example.org/page">Example <b>Title</b></a><a class="result__snippet">Useful &amp; public summary</a>';
  const results = research.parseResults(html);
  assert.equal(results.length, 1);
  assert.equal(results[0].title, "Example Title");
  assert.equal(results[0].snippet, "Useful & public summary");
  assert.equal(results[0].url, "https://example.org/page");
});

test("rejects private-network and credential-bearing result URLs", () => {
  assert.equal(research.safePublicUrl("http://127.0.0.1/admin"), null);
  assert.equal(research.safePublicUrl("http://192.168.1.2/"), null);
  assert.equal(research.safePublicUrl("https://user:pass@example.org/"), null);
  assert.equal(research.safePublicUrl("javascript:alert(1)"), null);
});

test("ignores malformed or incomplete search results", () => {
  assert.deepEqual(research.parseResults('<a class="result__a" href="javascript:alert(1)">bad</a>'), []);
});


test("extracts readable text from a public HTML page", () => {
  const text = research.stripHtml("<html><head><title>Title</title><script>secret()</script></head><body><nav>Menu</nav><article><h1>Useful heading</h1><p>This is a sufficiently long public article paragraph with useful information for readers.</p></article></body></html>");
  assert.match(text, /Useful heading/);
  assert.match(text, /public article paragraph/);
  assert.doesNotMatch(text, /secret|Menu/);
});

test("identifies private and local IP addresses", () => {
  assert.equal(research.isPrivateAddress("127.0.0.1"), true);
  assert.equal(research.isPrivateAddress("10.1.2.3"), true);
  assert.equal(research.isPrivateAddress("192.168.1.5"), true);
  assert.equal(research.isPrivateAddress("8.8.8.8"), false);
});

test("rejects private URLs before attempting to fetch a page", async () => {
  assert.equal(await research.fetchPage("http://127.0.0.1/"), null);
  assert.equal(await research.fetchPage("http://192.168.0.1/"), null);
});
test("blocks reserved IPv4 and non-public IPv6 ranges", () => {
  for (const ip of ["0.0.0.0", "100.64.0.1", "169.254.169.254", "198.18.0.1", "224.0.0.1", "203.0.113.8", "::1", "fc00::1", "fd12::1", "fe80::1", "ff02::1", "::ffff:127.0.0.1"]) {
    assert.equal(research.isPrivateAddress(ip), true, ip);
  }
  assert.equal(research.isPrivateAddress("1.1.1.1"), false);
  assert.equal(research.isPrivateAddress("2606:4700:4700::1111"), false);
});

test("rejects local IPv6 URLs and permits public HTTPS URLs", () => {
  assert.equal(research.safePublicUrl("http://[::1]/"), null);
  assert.equal(research.safePublicUrl("http://[fd00::1]/"), null);
  assert.equal(research.safePublicUrl("https://example.org/article"), "https://example.org/article");
});

test("public page fetch never follows non-HTTP protocols or private hosts", async () => {
  assert.equal(await research.fetchPage("file:///etc/passwd"), null);
  assert.equal(await research.fetchPage("http://[::1]/"), null);
  assert.equal(await research.fetchPage("http://127.0.0.1/"), null);
});

test("decodes decimal and hexadecimal HTML apostrophes in search snippets", () => {
  const html = '<a class="result__a" href="https://example.org/article">O&#x27;lmasbek</a><a class="result__snippet">Bu bo&#x27;lgan va O&#39;lmasbek haqida &amp; boshqa ma&#x27;lumot.</a>';
  const [item] = research.parseResults(html);
  assert.equal(item.title, "O'lmasbek");
  assert.equal(item.snippet, "Bu bo'lgan va O'lmasbek haqida & boshqa ma'lumot.");
});
