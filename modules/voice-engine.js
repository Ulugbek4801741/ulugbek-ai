"use strict";

const MAX_TEXT_LENGTH = 4000;
const MAX_AUDIO_BYTES = 10 * 1024 * 1024;
const ALLOWED_AUDIO_TYPES = new Set(["audio/mpeg", "audio/wav", "audio/x-wav", "audio/ogg", "audio/webm", "application/octet-stream"]);

function configuredTarget(raw) {
  if (!raw) return null;
  let url;
  try { url = new URL(raw); } catch (_) { return null; }
  const loopback = ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  if ((url.protocol !== "https:" && !(url.protocol === "http:" && loopback)) ||
      url.username || url.password || url.search || url.hash) return null;
  return url;
}

function createVoiceEngine({ env = process.env, fetchImpl = globalThis.fetch } = {}) {
  function status() {
    const target = configuredTarget(env.ULUGBEK_TTS_URL);
    const tokenReady = typeof env.ULUGBEK_TTS_TOKEN === "string" && env.ULUGBEK_TTS_TOKEN.length >= 24;
    return {
      provider: "self-hosted-voice-engine",
      configured: Boolean(target && tokenReady),
      ready: Boolean(target && tokenReady && typeof fetchImpl === "function"),
      externalProviderFallback: false,
      supportedLanguages: "engine-declared; not assumed to be 200+",
      note: target && tokenReady
        ? "Faqat administrator sozlagan shaxsiy TTS serveriga yuboriladi."
        : "Shaxsiy TTS server URL va kamida 24 belgili token server muhitida sozlanmagan."
    };
  }

  async function synthesize({ text, language = "uz-UZ", voice = "female", emotion = "neutral" } = {}) {
    if (typeof text !== "string" || !text.trim()) {
      const error = new Error("Ovozga aylantirish uchun matn kiriting.");
      error.status = 400; throw error;
    }
    if (text.length > MAX_TEXT_LENGTH) {
      const error = new Error("Ovoz matni 4000 belgidan oshmasligi kerak.");
      error.status = 413; throw error;
    }
    if (!/^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/.test(language)) {
      const error = new Error("Til kodi noto‘g‘ri.");
      error.status = 400; throw error;
    }
    if (!["female", "male", "neutral"].includes(voice) ||
        !["neutral", "warm", "happy", "sad", "serious", "excited", "whisper"].includes(emotion)) {
      const error = new Error("Ovoz turi yoki hissiyot tanlovi noto‘g‘ri.");
      error.status = 400; throw error;
    }

    const target = configuredTarget(env.ULUGBEK_TTS_URL);
    const token = env.ULUGBEK_TTS_TOKEN;
    if (!target || typeof token !== "string" || token.length < 24 || typeof fetchImpl !== "function") {
      const error = new Error("Mustaqil ovoz serveri hali sozlanmagan.");
      error.status = 503; throw error;
    }

    const endpoint = new URL("/v1/audio/speech", target);
    let response;
    try {
      response = await fetchImpl(endpoint, {
        method: "POST",
        headers: {
          "Authorization": "Bearer " + token,
          "Content-Type": "application/json",
          "Accept": "audio/*"
        },
        body: JSON.stringify({ text: text.trim(), language, voice, emotion }),
        signal: AbortSignal.timeout(45000)
      });
    } catch (_) {
      const error = new Error("Shaxsiy ovoz serveriga ulanib bo‘lmadi.");
      error.status = 502; throw error;
    }
    if (!response.ok) {
      const error = new Error("Ovoz serveri so‘rovni bajarmadi (HTTP " + response.status + ").");
      error.status = 502; throw error;
    }
    const contentType = (response.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
    if (!ALLOWED_AUDIO_TYPES.has(contentType)) {
      const error = new Error("Ovoz serveri audio formatida javob qaytarmadi.");
      error.status = 502; throw error;
    }
    const declaredLength = Number(response.headers.get("content-length") || 0);
    if (declaredLength > MAX_AUDIO_BYTES) {
      const error = new Error("Audio fayl hajmi ruxsat etilgan chegaradan katta.");
      error.status = 502; throw error;
    }
    const chunks = [];
    let totalBytes = 0;
    if (!response.body || typeof response.body.getReader !== "function") {
      const error = new Error("Ovoz serveri oqimli audio javob qaytarmadi.");
      error.status = 502; throw error;
    }
    const reader = response.body.getReader();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        totalBytes += value.byteLength;
        if (totalBytes > MAX_AUDIO_BYTES) {
          await reader.cancel();
          const error = new Error("Audio fayl hajmi ruxsat etilgan chegaradan katta.");
          error.status = 502; throw error;
        }
        chunks.push(Buffer.from(value));
      }
    } finally {
      reader.releaseLock();
    }
    if (!totalBytes) {
      const error = new Error("Audio fayl bo‘sh.");
      error.status = 502; throw error;
    }
    return { audio: Buffer.concat(chunks, totalBytes), contentType };
  }

  return { status, synthesize };
}

module.exports = { createVoiceEngine };
