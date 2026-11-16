"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { buildKnowledgeEntries, trimWords, isGitHubRepositoryUrl } = require("../modules/github-research-memory");

test("imports only review-candidate repositories with allowlisted licenses", () => {
  const report = {
    generatedAt: "2026-11-16T07:30:00.000Z",
    repositories: [
      { repository: "expressjs/express", url: "https://github.com/expressjs/express", license: "MIT", status: "review-candidate", readmeExcerpt: "Express documentation and design notes with enough useful words to pass the minimum text threshold safely.", latestRelease: { notes: "Release changes and compatibility notes." } },
      { repository: "nodejs/node", url: "https://github.com/nodejs/node", license: "NOASSERTION", status: "license-review-required", readmeExcerpt: "This text must not be imported." },
      { repository: "example/private", url: "https://github.com/example/private", license: "MIT", status: "fetch-failed", readmeExcerpt: "This failed source must not be imported." }
    ]
  };
  const entries = buildKnowledgeEntries(report);
  assert.equal(entries.length, 1);
  assert.equal(entries[0].agent, "AutonomousGitHubResearchAgent");
  assert.equal(entries[0].status, "pending-review");
  assert.equal(entries[0].factualUseAllowed, false);
  assert.equal(entries[0].license, "MIT");
});

test("limits each source to at most 200 words across README and release notes", () => {
  const longText = Array.from({ length: 180 }, (_, i) => "readme" + i).join(" ");
  const longNotes = Array.from({ length: 180 }, (_, i) => "release" + i).join(" ");
  const [entry] = buildKnowledgeEntries({
    generatedAt: "2026-11-16T07:30:00.000Z",
    repositories: [{
      repository: "example/project",
      url: "https://github.com/example/project",
      license: "Apache-2.0",
      status: "review-candidate",
      readmeExcerpt: longText,
      latestRelease: { notes: longNotes }
    }]
  });
  assert.equal(entry.content.split(/\s+/).length, 200);
  assert.equal(trimWords(longText, 100).split(/\s+/).length, 100);
});

test("never imports sources with missing license or without text", () => {
  const entries = buildKnowledgeEntries({
    repositories: [
      { repository: "example/a", url: "https://github.com/example/a", license: null, status: "review-candidate", readmeExcerpt: "Some text." },
      { repository: "example/b", url: "https://github.com/example/b", license: "MIT", status: "review-candidate", readmeExcerpt: "" }
    ]
  });
  assert.equal(entries.length, 0);
});

test("accepts only canonical public GitHub repository URLs", () => {
  assert.equal(isGitHubRepositoryUrl("https://github.com/expressjs/express"), true);
  assert.equal(isGitHubRepositoryUrl("https://example.com/expressjs/express"), false);
  assert.equal(isGitHubRepositoryUrl("http://github.com/expressjs/express"), false);
  assert.equal(isGitHubRepositoryUrl("https://user:password@github.com/expressjs/express"), false);
});
