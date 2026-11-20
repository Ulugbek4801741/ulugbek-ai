"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const vault = require("../modules/knowledge-vault-sync");

test("vault accepts only known Wikimedia open-license research records", () => {
  const base = { agent: "AutonomousResearchAgent", title: "Test",
    content: "This is a sufficiently long public encyclopedia extract for a regression test. ".repeat(2),
    createdAt: "2026-01-01T00:00:00Z", status: "pending-review" };
  const accepted = vault.eligible({ ...base, source: "https://uz.wikipedia.org/wiki/Toshkent" });
  assert.equal(accepted.license, "CC BY-SA 4.0");
  assert.equal(accepted.language, "uz");
  assert.equal(vault.eligible({ ...base, source: "https://example.com/article" }), false);
  assert.equal(vault.eligible({ ...base, agent: "ZIP import", source: "https://uz.wikipedia.org/wiki/Toshkent" }), false);
  assert.equal(vault.eligible({ ...base, source: "http://uz.wikipedia.org/wiki/Toshkent" }), false);
});
