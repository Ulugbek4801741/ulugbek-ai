"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const builder = require("../modules/build-workspace");

test("builder accepts only safe relative source paths", () => {
  assert.equal(builder.validateRelativePath("src/index.js"), true);
  assert.equal(builder.validateRelativePath("../outside.js"), false);
  assert.equal(builder.validateRelativePath("/tmp/out.js"), false);
  assert.equal(builder.validateRelativePath("src\\\\outside.js"), false);
  assert.equal(builder.validateRelativePath("node_modules/x.js"), false);
  assert.equal(builder.validateRelativePath(".env"), false);
});

test("workspace ownership is bound to a valid browser session", () => {
  const owner = "session-id-123456";
  const manifest = { ownerHash: builder.ownerFingerprint(owner) };
  assert.equal(builder.ownsBuild(manifest, owner), true);
  assert.equal(builder.ownsBuild(manifest, "another-session-123"), false);
  assert.equal(builder.ownsBuild(manifest, "short"), false);
  assert.throws(() => builder.ownerFingerprint(""), { status: 400 });
});

test("builder validates project JSON and file limits", () => {
  const parsed = builder.parseGeneratedProject(JSON.stringify({
    title: "Demo",
    files: [{ path: "index.html", content: "<h1>Hello</h1>" }]
  }));
  assert.equal(parsed.files.length, 1);
  assert.throws(() => builder.parseGeneratedProject("not json"), /JSON/);
  assert.throws(() => builder.parseGeneratedProject(JSON.stringify({
    files: [{ path: "../secret.txt", content: "no" }]
  })), /xavfsiz/);
});

test("builder rejects empty and oversized goals before model access", async () => {
  await assert.rejects(() => builder.createBuild({ goal: " " }), { status: 400 });
  await assert.rejects(() => builder.createBuild({ goal: "x".repeat(4001) }), { status: 413 });
});
