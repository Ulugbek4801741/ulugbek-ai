"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const connectors = require("../modules/open-research-connectors");

test("normalizes scholarly metadata and retains OA state", () => {
  const item = connectors.normalizeRecord({
    provider: "Crossref", title: "Open research", url: "https://doi.org/10.1234/example",
    abstract: "A study", openAccess: true, openAccessUrl: "https://example.org/paper.pdf", year: 2024
  });
  assert.equal(item.title, "Open research");
  assert.equal(item.openAccess, true);
  assert.match(item.snippet, /Annotatsiya: A study/);
});

test("does not label publisher PDF links open access without an open license", () => {
  const item = connectors.normalizeRecord({
    provider: "Crossref", title: "Publisher copy", url: "https://doi.org/10.1234/paywall",
    openAccessUrl: "https://publisher.example/paper.pdf", qualityScore: 3
  });
  assert.equal(item.openAccess, false);
  assert.equal(item.openAccessUrl, "");
  assert.doesNotMatch(item.snippet, /Ochiq nusxa/);
});

test("rejects non-HTTPS or credential-bearing source URLs", () => {
  assert.equal(connectors.safeUrl("http://example.org/paper"), "");
  assert.equal(connectors.safeUrl("https://user:pass@example.org/paper"), "");
  assert.equal(connectors.normalizeRecord({ title: "bad", url: "http://127.0.0.1" }), null);
});

test("detects university and library discovery questions", () => {
  assert.equal(connectors.isUniversityQuery("O'zbekistondagi universitetlar ro'yxati"), true);
  assert.equal(connectors.isUniversityQuery("ochiq kutubxonalarni qidir"), true);
  assert.equal(connectors.isUniversityQuery("Alisher Navoiy hayoti"), false);
});

test("federated search isolates failed providers and deduplicates DOI", async () => {
  const fakeFetch = async url => {
    if (url.includes("api.crossref.org")) return {
      ok: true, status: 200,
      text: async () => JSON.stringify({ message: { items: [
        { title: ["A paper"], DOI: "10.1000/abc", URL: "https://doi.org/10.1000/abc", abstract: "<p>Abstract</p>", author: [{ given: "A", family: "Author" }], published: { "date-parts": [[2024]] } }
      ] } })
    };
    if (url.includes("europepmc")) throw new Error("offline");
    if (url.includes("export.arxiv.org")) return { ok: true, status: 200, text: async () => "<feed></feed>" };
    if (url.includes("zenodo.org")) return { ok: true, status: 200, text: async () => JSON.stringify({ hits: { hits: [] } }) };
    throw new Error("unexpected provider");
  };
  const result = await connectors.searchOpenResearch("test query", { fetchImpl: fakeFetch, perSource: 3 });
  assert.equal(result.results.length, 1);
  assert.equal(result.results[0].provider, "Crossref");
  assert.ok(result.failedProviders.includes("Europe PMC"));
  assert.ok(result.providers.includes("Crossref"));
});
