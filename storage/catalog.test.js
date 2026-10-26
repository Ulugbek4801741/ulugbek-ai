"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { listStorageProviders } = require("./catalog");

test("catalog lists S3-compatible, dedicated SDK and user-drive options distinctly", () => {
  const providers = listStorageProviders();
  const byId = new Map(providers.map((provider) => [provider.id, provider]));
  assert.ok(byId.has("cloudflare-r2"));
  assert.ok(byId.has("backblaze-b2"));
  assert.equal(byId.get("google-cloud-storage").status, "adapter-needed");
  assert.equal(byId.get("azure-blob-storage").status, "adapter-needed");
  assert.equal(byId.get("google-drive").status, "oauth-integration-needed");
  assert.ok(providers.every((provider) => provider.id && provider.type && provider.status));
});

test("registry can start safely with no credentials and reports no active providers", () => {
  const { createStorageRegistry } = require("./registry");
  const registry = createStorageRegistry({});
  assert.deepEqual(registry.list(), []);
  assert.throws(() => registry.get("cloudflare-r2"), /sozlanmagan/);
});
