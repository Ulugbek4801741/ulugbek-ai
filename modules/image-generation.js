"use strict";

const MAX_PROMPT_LENGTH = 1000;
function getEndpoint(env = process.env) {
  const raw = String(env.IMAGE_GENERATION_URL || "").trim();
  if (!raw) return null;
  let url;
  try { url = new URL(raw); } catch (_) { throw new Error("IMAGE_GENERATION_URL noto‘g‘ri."); }
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw new Error("Rasm modeli manzili xavfsiz HTTP/HTTPS URL bo‘lishi kerak.");
  }
  return url.toString().replace(/\/$/, "");
}
function validatePrompt(value) {
  const prompt = typeof value === "string" ? value.trim() : "";
  if (!prompt) { const error = new Error("Rasm tavsifi bo‘sh."); error.status = 400; throw error; }
  if (prompt.length > MAX_PROMPT_LENGTH) { const error = new Error("Rasm tavsifi 1000 belgidan oshmasin."); error.status = 413; throw error; }
  return prompt;
}
function createImageGenerator({ env = process.env, fetchImpl = globalThis.fetch } = {}) {
  return {
    status() {
      let endpoint = null;
      try { endpoint = getEndpoint(env); } catch (_) {}
      return { enabled: Boolean(endpoint), provider: endpoint ? "self-hosted-stable-diffusion-webui" : null, requiresApiKey: false };
    },
    async generate(value) {
      const prompt = validatePrompt(value);
      const endpoint = getEndpoint(env);
      if (!endpoint) { const error = new Error("Rasm yaratish modeli serverda ulanmagan. IMAGE_GENERATION_URL sozlang."); error.status = 503; throw error; }
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 90000);
      const headers = { "Content-Type": "application/json" };
      if (env.IMAGE_GENERATION_USERNAME || env.IMAGE_GENERATION_PASSWORD) {
        const token = Buffer.from(String(env.IMAGE_GENERATION_USERNAME || "") + ":" + String(env.IMAGE_GENERATION_PASSWORD || "")).toString("base64");
        headers.Authorization = "Basic " + token;
      }
      try {
        const response = await fetchImpl(endpoint + "/sdapi/v1/txt2img", {
          method: "POST", headers, redirect: "error", signal: controller.signal,
          body: JSON.stringify({ prompt, negative_prompt: "blurry, low quality, distorted, watermark, unreadable text", steps: 20, width: 512, height: 512, cfg_scale: 7, sampler_name: "Euler a" })
        });
        if (!response.ok) { const error = new Error("Rasm modeli HTTP " + response.status + " javob qaytardi."); error.status = 502; throw error; }
        const data = await response.json();
        const image = Array.isArray(data.images) ? data.images[0] : null;
        if (typeof image !== "string" || image.length < 100 || image.length > 8 * 1024 * 1024 || !/^[A-Za-z0-9+/]+={0,2}$/.test(image)) {
          const error = new Error("Rasm modeli yaroqli rasm qaytarmadi."); error.status = 502; throw error;
        }
        return { image, mimeType: "image/png", prompt };
      } catch (error) {
        if (error.name === "AbortError") { const timeout = new Error("Rasm yaratish 90 soniyada tugamadi."); timeout.status = 504; throw timeout; }
        throw error;
      } finally { clearTimeout(timer); }
    }
  };
}
module.exports = { createImageGenerator, getEndpoint, validatePrompt };
