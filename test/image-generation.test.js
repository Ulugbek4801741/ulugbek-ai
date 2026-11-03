"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { createImageGenerator, getEndpoint, validatePrompt } = require("../modules/image-generation");

test("image generation is disabled unless a self-hosted endpoint is configured", async () => {
  const generator = createImageGenerator({ env: {}, fetchImpl: async () => { throw new Error("must not fetch"); } });
  assert.deepEqual(generator.status(), { enabled: false, provider: null, requiresApiKey: false });
  await assert.rejects(generator.generate("a mountain"), error => error.status === 503);
});

test("rejects unsafe or malformed model endpoints", () => {
  assert.throws(() => getEndpoint({ IMAGE_GENERATION_URL: "file:///etc/passwd" }));
  assert.throws(() => getEndpoint({ IMAGE_GENERATION_URL: "https://user:pass@example.com" }));
  assert.throws(() => getEndpoint({ IMAGE_GENERATION_URL: "https://example.com/?token=x" }));
  assert.equal(getEndpoint({ IMAGE_GENERATION_URL: "http://127.0.0.1:7860/" }), "http://127.0.0.1:7860");
});

test("validates image prompts and limits their length", () => {
  assert.equal(validatePrompt("  a blue house  "), "a blue house");
  assert.throws(() => validatePrompt(" "));
  assert.throws(() => validatePrompt("x".repeat(1001)), error => error.status === 413);
});

test("sends a bounded prompt to Stable Diffusion and returns its PNG", async () => {
  let sent;
  const generator = createImageGenerator({
    env: { IMAGE_GENERATION_URL: "http://127.0.0.1:7860", IMAGE_GENERATION_USERNAME: "local", IMAGE_GENERATION_PASSWORD: "secret" },
    fetchImpl: async (url, options) => {
      sent = { url, options };
      return { ok: true, json: async () => ({ images: ["A".repeat(120)] }) };
    }
  });
  const result = await generator.generate("a quiet mountain village");
  assert.equal(sent.url, "http://127.0.0.1:7860/sdapi/v1/txt2img");
  assert.equal(sent.options.method, "POST");
  assert.equal(sent.options.redirect, "error");
  assert.match(sent.options.headers.Authorization, /^Basic /);
  assert.equal(JSON.parse(sent.options.body).steps, 20);
  assert.equal(result.mimeType, "image/png");
  assert.equal(result.prompt, "a quiet mountain village");
});

test("rejects invalid model output and upstream failures", async () => {
  const invalid = createImageGenerator({ env: { IMAGE_GENERATION_URL: "http://127.0.0.1:7860" }, fetchImpl: async () => ({ ok: true, json: async () => ({ images: ["bad"] }) }) });
  await assert.rejects(invalid.generate("test"), error => error.status === 502);
  const failed = createImageGenerator({ env: { IMAGE_GENERATION_URL: "http://127.0.0.1:7860" }, fetchImpl: async () => ({ ok: false, status: 503 }) });
  await assert.rejects(failed.generate("test"), error => error.status === 502);
});
