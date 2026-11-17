"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const archive = require("./public-knowledge-archive");

function item(overrides = {}) {
  return { agent: "AutonomousResearchAgent", title: "Ochiq matematika",
    content: "Bu ochiq ensiklopediya sahifasidan olingan ta'limiy matn. ".repeat(3),
    source: "https://uz.wikipedia.org/wiki/Matematika", ...overrides };
}
test("only explicit public Wikipedia research records are eligible", () => {
  assert.equal(archive.eligible(item()).rights_status, "open-license");
  assert.equal(archive.eligible(item({ source: "user://private-upload" })), false);
  assert.equal(archive.eligible(item({ agent: "AutonomousOpenWebResearchAgent" })), false);
  assert.equal(archive.eligible(item({ source: "https://example.com/private" })), false);
});
test("rejects likely personal data and secrets", () => {
  assert.equal(archive.eligible(item({ content: "Contact person@example.com now" })), false);
  assert.equal(archive.eligible(item({ content: "api_key=do-not-save" })), false);
});
test("rejects unsupported language and malformed records", () => {
  assert.equal(archive.eligible(item({ source: "https://fr.wikipedia.org/wiki/Math" })), false);
  assert.equal(archive.eligible({ title: "Missing", source: "not a url" }), false);
});
