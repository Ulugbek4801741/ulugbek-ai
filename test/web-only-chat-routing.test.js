"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const server = fs.readFileSync(path.join(root, "server.js"), "utf8");
const routeStart = server.indexOf('app.post("/api/chat"');
const routeEnd = server.indexOf("\n});", routeStart);
const chatRoute = server.slice(routeStart, routeEnd);

test("chat route uses the single web-only answer pipeline", () => {
  assert.ok(routeStart >= 0);
  assert.match(chatRoute, /webOnlyChat\.answer/);
  assert.match(chatRoute, /knowledgeBaseUsed: false/);
  assert.match(chatRoute, /synthesisModelUsed: false/);
  assert.doesNotMatch(chatRoute, /knowledgeStore\.search|researchCache\.(?:search|save)|singleAgent\.answer|agentFleet\.runTask/);
});

test("background knowledge ingestion is not started automatically", () => {
  assert.doesNotMatch(server, /publicKnowledgeArchive\.cycle\(\)|publicKnowledgeArchive\.start\(\)|languageLearningWorker\.start\(\)|learningWorker\.start\(\)/);
  const autopilot = fs.readFileSync(path.join(root, "admin-autopilot.js"), "utf8");
  assert.doesNotMatch(autopilot, /learningWorker\.start\(\)/);
});
