"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const policy = require("../modules/app-integration-policy");

test("catalog contains official store links and declares no automatic installation", () => {
  const result = policy.getIntegrationCatalog();
  assert.equal(result.ok, true);
  assert.deepEqual(result.items.map((item) => item.id), ["google-play", "microsoft-store", "apple-app-store"]);
  assert.ok(result.items.every((item) => item.url.startsWith("https://")));
  assert.equal(result.policy.automaticDownloads, false);
  assert.equal(result.policy.automaticInstalls, false);
  assert.equal(result.policy.automaticPermissionGrants, false);
});

test("opening a store requires explicit user confirmation", () => {
  assert.deepEqual(policy.validateIntegrationAction({ type: "open_store", storeId: "google-play" }), {
    allowed: false,
    reason: "user_confirmation_required"
  });
  assert.equal(policy.validateIntegrationAction({ type: "open_store", storeId: "google-play", confirmed: true }).allowed, true);
});

test("unknown stores and arbitrary actions are rejected", () => {
  assert.equal(policy.validateIntegrationAction({ type: "download_apk", url: "https://bad.example/app.apk", confirmed: true }).allowed, false);
  assert.equal(policy.validateIntegrationAction({ type: "open_store", storeId: "unknown", confirmed: true }).allowed, false);
  assert.equal(policy.validateIntegrationAction(null).allowed, false);
});
