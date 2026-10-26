"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createStorageProvider } = require("./providers");
const { getConfiguredProviders } = require("./registry");

test("storage provider requires credentials and bucket configuration", () => {
  assert.throws(() => createStorageProvider({}), /Storage sozlamasi yetishmaydi/);
});

test("registry does not enable providers with incomplete configuration", () => {
  assert.deepEqual(getConfiguredProviders({}), []);
});

test("registry enables only fully configured providers", () => {
  const providers = getConfiguredProviders({
    R2_ENDPOINT: "https://example.r2.cloudflarestorage.com",
    R2_REGION: "auto",
    R2_BUCKET: "ulugbek-test",
    R2_ACCESS_KEY_ID: "test-key",
    R2_SECRET_ACCESS_KEY: "test-secret",
  });
  assert.deepEqual(providers.map((p) => p.name), ["cloudflare-r2"]);
});
