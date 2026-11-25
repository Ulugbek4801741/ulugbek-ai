"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { createImageGenerator, getStableDiffusionEndpoint, getOpenAIEndpoint, validatePrompt, normalizeOptions } = require("../modules/image-generation");

test("image generation is disabled until a provider is configured", async () => {
  const generator = createImageGenerator({ env: {}, fetchImpl: async () => { throw new Error("must not fetch"); } });
  assert.equal(generator.status().enabled, false);
  assert.equal(generator.status().provider, null);
  await assert.rejects(generator.generate("a mountain"), error => error.status === 503);
});

test("validates safe Stable Diffusion and OpenAI endpoints", () => {
  assert.throws(() => getStableDiffusionEndpoint({ IMAGE_GENERATION_URL: "file:///etc/passwd" }));
  assert.throws(() => getStableDiffusionEndpoint({ IMAGE_GENERATION_URL: "https://user:pass@example.com" }));
  assert.throws(() => getStableDiffusionEndpoint({ IMAGE_GENERATION_URL: "https://example.com/?token=x" }));
  assert.equal(getStableDiffusionEndpoint({ IMAGE_GENERATION_URL: "http://127.0.0.1:7860/" }), "http://127.0.0.1:7860");
  assert.throws(() => getOpenAIEndpoint({ IMAGE_API_URL: "http://api.example.com/v1/images" }));
  assert.equal(getOpenAIEndpoint({}), "https://api.openai.com/v1/images/generations");
});

test("validates prompt and normalizes style and size", () => {
  assert.equal(validatePrompt("  a blue house  "), "a blue house");
  assert.throws(() => validatePrompt(" "));
  assert.throws(() => validatePrompt("x".repeat(1001)), error => error.status === 413);
  assert.equal(normalizeOptions({ prompt: "a cat", size: "1536x1024", style: "anime" }).size, "1536x1024");
  assert.match(normalizeOptions({ prompt: "a cat", style: "anime" }).prompt, /anime illustration/);
  assert.equal(normalizeOptions({ prompt: "a cat", style: "unknown" }).style, "none");
});

test("Stable Diffusion provider receives bounded dimensions and optional Basic auth", async () => {
  let sent;
  const generator = createImageGenerator({
    env: { IMAGE_PROVIDER: "stable-diffusion", IMAGE_GENERATION_URL: "http://127.0.0.1:7860", IMAGE_GENERATION_USERNAME: "local", IMAGE_GENERATION_PASSWORD: "secret" },
    fetchImpl: async (url, options) => { sent = { url, options }; return { ok: true, json: async () => ({ images: ["A".repeat(120)] }) }; }
  });
  const result = await generator.generate("a quiet mountain village", { size: "1536x1024", style: "cinematic" });
  assert.equal(sent.url, "http://127.0.0.1:7860/sdapi/v1/txt2img");
  assert.equal(sent.options.method, "POST");
  assert.equal(sent.options.redirect, "error");
  assert.match(sent.options.headers.Authorization, /^Basic /);
  const body = JSON.parse(sent.options.body);
  assert.equal(body.steps, 20);
  assert.equal(body.width, 1536);
  assert.equal(body.height, 1024);
  assert.match(body.prompt, /cinematic composition/);
  assert.equal(result.mimeType, "image/png");
  assert.equal(result.prompt, "a quiet mountain village");
});

test("OpenAI Images provider calls the generation API with API key and selected style", async () => {
  let sent;
  const generator = createImageGenerator({ env: { IMAGE_PROVIDER: "openai", IMAGE_API_KEY: "test-key", IMAGE_MODEL: "gpt-image-1" }, fetchImpl: async (url, options) => { sent = { url, options }; return { ok: true, json: async () => ({ data: [{ b64_json: "B".repeat(120) }] }) }; } });
  const result = await generator.generate("a mountain at sunset", { size: "1024x1536", style: "realistic" });
  assert.equal(sent.url, "https://api.openai.com/v1/images/generations");
  assert.equal(sent.options.headers.Authorization, "Bearer test-key");
  const body = JSON.parse(sent.options.body);
  assert.equal(body.size, "1024x1536");
  assert.match(body.prompt, /photorealistic/);
  assert.equal(result.size, "1024x1536");
  assert.equal(generator.status().provider, "openai-images");
});

test("rejects invalid image outputs and upstream errors", async () => {
  const invalid = createImageGenerator({ env: { IMAGE_GENERATION_URL: "http://127.0.0.1:7860" }, fetchImpl: async () => ({ ok: true, json: async () => ({ images: ["bad"] }) }) });
  await assert.rejects(invalid.generate("test"), error => error.status === 502);
  const failed = createImageGenerator({ env: { IMAGE_GENERATION_URL: "http://127.0.0.1:7860" }, fetchImpl: async () => ({ ok: false, status: 503 }) });
  await assert.rejects(failed.generate("test"), error => error.status === 502);
});
