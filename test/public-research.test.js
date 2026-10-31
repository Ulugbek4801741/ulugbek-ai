"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const research = require("../modules/public-research");

test("public research is opt-in for freshness and research intent", () => {
  assert.equal(research.needsResearch("Salom, qalaysiz?"), false);
  assert.equal(research.needsResearch("Internetdan manbalarni izlab top"), true);
  assert.equal(research.needsResearch("2026 yilgi ilmiy yangiliklar"), true);
});

test("research query rejects empty input without network access", async () => {
  assert.deepEqual(await research.searchPublicKnowledge("   "), []);
});
