"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

const dataDir = path.join(os.tmpdir(), "ulugbek-on-demand-research-test-" + process.pid);
process.env.ULUGBEK_DATA_DIR = dataDir;
const worker = require("../lab-learning-worker");

test("on-demand research searches allowed language sources and saves unapproved candidates", async () => {
  const originalFetch = global.fetch;
  const requested = [];
  global.fetch = async (input) => {
    const url = new URL(String(input));
    requested.push(url.hostname);
    let body;
    if (url.pathname === "/w/api.php") {
      body = { query: { search: [{ title: "Sun'iy intellekt" }] } };
    } else {
      const lang = url.hostname.split(".")[0];
      body = {
        title: "Sun'iy intellekt",
        extract: "Sun'iy intellekt kompyuter tizimlarining odatda inson aqlini talab qiladigan vazifalarni bajarish qobiliyatidir. U mashinaviy o‘rganish usullarini ham o‘z ichiga oladi.",
        content_urls: { desktop: { page: "https://" + lang + ".wikipedia.org/wiki/Sun%27iy_intellekt" } }
      };
    }
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { "content-type": "application/json", "content-length": String(JSON.stringify(body).length) }
    });
  };
  try {
    const findings = await worker.researchQuestion("sun'iy intellekt nima");
    assert.ok(findings.length >= 1);
    assert.ok(requested.includes("uz.wikipedia.org"));
    assert.ok(findings.every(item => item.status === "pending-review"));
    assert.ok(findings.every(item => item.source.startsWith("https://")));
    const saved = JSON.parse(await fs.readFile(path.join(dataDir, "knowledge.json"), "utf8"));
    assert.ok(saved.length >= 1);
    assert.ok(saved.every(item => item.status === "pending-review"));
    assert.equal((await worker.searchKnowledge("sun'iy intellekt", 5)).length, 0);
  } finally {
    global.fetch = originalFetch;
    await fs.rm(dataDir, { recursive: true, force: true });
    worker.stop();
  }
});

test("research rejects non-Wikipedia redirects and domains", async () => {
  const originalFetch = global.fetch;
  global.fetch = async () => { throw new Error("network should not be called for a disallowed host"); };
  try {
    await assert.rejects(
      worker.researchQuestion("https://example.com/private"),
      /network should not be called/
    );
  } finally {
    global.fetch = originalFetch;
    worker.stop();
  }
});
