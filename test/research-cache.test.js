"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "ulugbek-research-cache-"));
process.env.ULUGBEK_DATA_DIR = dataDir;
const cache = require("../modules/research-cache");

test("research cache ranks matching title terms above body-only terms", () => {
  const titleMatch = cache.scoreEntry("Node.js server security", {
    title: "Node.js server security guide", content: "General documentation"
  });
  const bodyMatch = cache.scoreEntry("Node.js server security", {
    title: "General guide", content: "Node.js server security documentation"
  });
  assert.ok(titleMatch > bodyMatch);
});

test("research cache ignores un-read snippets and non-HTTPS sources", async () => {
  const result = await cache.save([
    { title: "Snippet only", url: "https://example.org/a", snippet: "x".repeat(200), pageRead: false },
    { title: "HTTP page", url: "http://example.org/b", snippet: "x".repeat(200), pageRead: true }
  ], "test query");
  assert.equal(result.saved, 0);
  assert.equal((await cache.status()).count, 0);
});

test("research cache stores and retrieves read public pages with their source", async () => {
  const source = "https://example.org/node-server-security";
  const result = await cache.save([{
    title: "Node server security",
    url: source,
    host: "example.org",
    snippet: "Node.js server security guidance and safe configuration. ".repeat(5),
    pageRead: true,
    qualityScore: 3
  }], "Node.js server security");
  assert.equal(result.saved, 1);
  const hits = await cache.search("Node.js server security", 5);
  assert.equal(hits.length, 1);
  assert.equal(hits[0].source, source);
  assert.equal(hits[0].status, "retrieved-unverified");
});
