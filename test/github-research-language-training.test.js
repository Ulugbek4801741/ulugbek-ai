"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { createLanguageCognition } = require("../modules/language-cognition");
const { buildKnowledgeEntries } = require("../modules/github-research-memory");

test("GitHub research notes train local language patterns but never factual approval", async () => {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), "ulugbek-language-corpus-"));
  try {
    const text = [
      "Express is a web framework for Node.js applications and provides routing middleware.",
      "Middleware functions can inspect requests and responses before the application sends output.",
      "Application configuration allows developers to define behavior for different environments.",
      "The routing system maps HTTP methods and paths to application handlers.",
      "Error handling middleware receives errors and can return structured responses.",
      "The release notes describe compatibility changes and security maintenance for users.",
      "Developers should review documentation before adopting a new application programming interface.",
      "Automated tests help verify behavior and reduce regressions across software releases.",
      "The project maintains backward compatibility where possible and documents breaking changes.",
      "Open source contributions are reviewed before changes are accepted into the main branch."
    ].join(" ");
    const [entry] = buildKnowledgeEntries({
      generatedAt: "2026-11-16T07:30:00.000Z",
      repositories: [{
        repository: "expressjs/express",
        url: "https://github.com/expressjs/express",
        license: "MIT",
        status: "review-candidate",
        readmeExcerpt: text,
        latestRelease: { notes: "Release notes and API compatibility information." }
      }]
    });
    const engine = createLanguageCognition({ dataDir });
    await engine.initialize();
    const result = await engine.trainFromEntries([entry]);
    const status = engine.status();
    assert.equal(result.addedSources, 1);
    assert.equal(result.corpusSources, 1);
    assert.equal(status.modelTrained, true);
    assert.equal(status.corpusSources, 1);
    assert.equal(status.neuralWeightsTrained, false);
    assert.equal(status.factualAutoApproval, false);
    assert.equal(status.unreviewedTextUsedOnlyForLanguagePatterns, true);
  } finally {
    await fs.rm(dataDir, { recursive: true, force: true });
  }
});
