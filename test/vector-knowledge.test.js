"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

test("vector service requests reject HTTP redirects", async () => {
  const previousFetch = global.fetch;
  const previousEmbeddingUrl = process.env.EMBEDDING_API_URL;
  const previousQdrantUrl = process.env.QDRANT_URL;
  const previousApiKey = process.env.QDRANT_API_KEY;
  const modulePath = require.resolve("../modules/vector-knowledge");

  process.env.EMBEDDING_API_URL = "https://embedding.internal";
  process.env.QDRANT_URL = "https://qdrant.internal";
  delete process.env.QDRANT_API_KEY;
  delete require.cache[modulePath];

  const calls = [];
  global.fetch = async (url, options) => {
    calls.push({ url: String(url), options });
    return {
      ok: true,
      text: async () => JSON.stringify({ result: { points_count: 0 } })
    };
  };

  try {
    const vector = require("../modules/vector-knowledge");
    const status = await vector.status();

    assert.equal(status.enabled, true);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].options.redirect, "error");
    assert.match(calls[0].url, /^https:\/\/qdrant\.internal\//);
  } finally {
    global.fetch = previousFetch;
    if (previousEmbeddingUrl === undefined) delete process.env.EMBEDDING_API_URL;
    else process.env.EMBEDDING_API_URL = previousEmbeddingUrl;
    if (previousQdrantUrl === undefined) delete process.env.QDRANT_URL;
    else process.env.QDRANT_URL = previousQdrantUrl;
    if (previousApiKey === undefined) delete process.env.QDRANT_API_KEY;
    else process.env.QDRANT_API_KEY = previousApiKey;
    delete require.cache[modulePath];
  }
});
