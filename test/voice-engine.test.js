const test = require("node:test");
const assert = require("node:assert/strict");
const { createVoiceEngine } = require("../modules/voice-engine");

const secret = "test-only-private-token-value-123456";

test("voice engine stays disabled until private server URL and token are configured", () => {
  const engine = createVoiceEngine({ env: {} });
  assert.equal(engine.status().ready, false);
  assert.equal(engine.status().externalProviderFallback, false);
});

test("voice engine rejects empty and oversized text before network access", async () => {
  let called = false;
  const engine = createVoiceEngine({
    env: { ULUGBEK_TTS_URL: "http://127.0.0.1:8787", ULUGBEK_TTS_TOKEN: secret },
    fetchImpl: async () => { called = true; }
  });
  await assert.rejects(engine.synthesize({ text: " " }), { status: 400 });
  await assert.rejects(engine.synthesize({ text: "a".repeat(4001) }), { status: 413 });
  assert.equal(called, false);
});

test("voice engine sends text only to configured private server with server-side token", async () => {
  let captured;
  const engine = createVoiceEngine({
    env: { ULUGBEK_TTS_URL: "http://127.0.0.1:8787", ULUGBEK_TTS_TOKEN: secret },
    fetchImpl: async (url, options) => {
      captured = { url: String(url), options };
      return new Response(Buffer.from("test-audio"), { status: 200, headers: { "content-type": "audio/wav" } });
    }
  });
  const result = await engine.synthesize({
    text: "Assalomu alaykum",
    language: "uz-UZ",
    voice: "female",
    emotion: "warm"
  });
  assert.equal(captured.url, "http://127.0.0.1:8787/v1/audio/speech");
  assert.equal(captured.options.headers.Authorization, "Bearer " + secret);
  assert.deepEqual(JSON.parse(captured.options.body), {
    text: "Assalomu alaykum", language: "uz-UZ", voice: "female", emotion: "warm"
  });
  assert.equal(result.contentType, "audio/wav");
  assert.equal(result.audio.toString(), "test-audio");
});

test("voice engine refuses public HTTP endpoints and non-audio responses", async () => {
  const publicHttp = createVoiceEngine({
    env: { ULUGBEK_TTS_URL: "http://example.com", ULUGBEK_TTS_TOKEN: secret },
    fetchImpl: async () => new Response("no")
  });
  await assert.rejects(publicHttp.synthesize({ text: "Salom" }), { status: 503 });

  const invalidAudio = createVoiceEngine({
    env: { ULUGBEK_TTS_URL: "http://localhost:8787", ULUGBEK_TTS_TOKEN: secret },
    fetchImpl: async () => new Response("not audio", { headers: { "content-type": "text/plain" } })
  });
  await assert.rejects(invalidAudio.synthesize({ text: "Salom" }), { status: 502 });
});
