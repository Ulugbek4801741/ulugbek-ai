"use strict";

const MAX_PROMPT_LENGTH = 1000;
const SIZES = new Set(["1024x1024", "1536x1024", "1024x1536"]);
const STYLES = new Set(["none", "realistic", "3d", "anime", "cartoon", "logo", "portrait", "cinematic", "watercolor"]);
function validatePrompt(value) {
  const prompt = typeof value === "string" ? value.trim() : "";
  if (!prompt) { const error = new Error("Rasm tavsifi bo‘sh."); error.status = 400; throw error; }
  if (prompt.length > MAX_PROMPT_LENGTH) { const error = new Error("Rasm tavsifi 1000 belgidan oshmasin."); error.status = 413; throw error; }
  return prompt;
}
function normalizeOptions(options = {}) {
  const size = SIZES.has(options.size) ? options.size : "1024x1024";
  const style = STYLES.has(options.style) ? options.style : "none";
  const stylePrompts = {
    realistic: "photorealistic, realistic lighting, fine details",
    "3d": "high quality 3D render, polished materials, dimensional lighting",
    anime: "anime illustration style, expressive clean linework",
    cartoon: "cartoon illustration, vibrant shapes, friendly visual style",
    logo: "professional logo design, clean vector-like composition, simple background",
    portrait: "professional portrait photography, natural facial detail, soft studio lighting",
    cinematic: "cinematic composition, dramatic lighting, film color grading",
    watercolor: "watercolor painting, textured paper, soft pigments"
  };
  const styledPrompt = stylePrompts[style] ? promptWithStyle(options.prompt, stylePrompts[style]) : validatePrompt(options.prompt);
  return { prompt: styledPrompt, size, style };
}
function promptWithStyle(prompt, styleText) {
  return validatePrompt(String(prompt).trim() + ", " + styleText);
}
function getStableDiffusionEndpoint(env = process.env) {
  const raw = String(env.IMAGE_GENERATION_URL || "").trim();
  if (!raw) return null;
  let url;
  try { url = new URL(raw); } catch (_) { throw new Error("IMAGE_GENERATION_URL noto‘g‘ri."); }
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw new Error("Rasm modeli manzili xavfsiz HTTP/HTTPS URL bo‘lishi kerak.");
  }
  return url.toString().replace(/\/$/, "");
}
function getOpenAIEndpoint(env = process.env) {
  const raw = String(env.IMAGE_API_URL || "https://api.openai.com/v1/images/generations").trim();
  let url;
  try { url = new URL(raw); } catch (_) { throw new Error("IMAGE_API_URL noto‘g‘ri."); }
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) throw new Error("IMAGE_API_URL HTTPS manzil bo‘lishi kerak.");
  return url.toString();
}
function imageDimensions(size) {
  const [width, height] = size.split("x").map(Number);
  return { width, height };
}
function createImageGenerator({ env = process.env, fetchImpl = globalThis.fetch } = {}) {
  const selected = String(env.IMAGE_PROVIDER || "").trim().toLowerCase();
  const provider = selected || (env.IMAGE_GENERATION_URL ? "stable-diffusion" : "");
  const isOpenAI = provider === "openai";
  const isSD = provider === "stable-diffusion" || provider === "sd" || provider === "automatic1111";
  function status() {
    const configured = isOpenAI ? Boolean(env.IMAGE_API_KEY) : isSD ? Boolean(getStableDiffusionEndpoint(env)) : false;
    return { enabled: configured, provider: configured ? (isOpenAI ? "openai-images" : "stable-diffusion-webui") : null, requiresApiKey: isOpenAI, configuredProvider: provider || null, supportedSizes: Array.from(SIZES), supportedStyles: Array.from(STYLES) };
  }
  async function generate(value, options = {}) {
    const normalized = normalizeOptions({ prompt: value, size: options.size, style: options.style });
    if (!status().enabled) { const error = new Error(isOpenAI ? "OpenAI rasm modeli uchun IMAGE_API_KEY sozlang." : "Rasm modeli ulanmagan. IMAGE_GENERATION_URL yoki IMAGE_PROVIDER/IMAGE_API_KEY sozlang."); error.status = 503; throw error; }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 90000);
    try {
      if (isOpenAI) {
        const endpoint = getOpenAIEndpoint(env);
        const response = await fetchImpl(endpoint, { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + env.IMAGE_API_KEY }, redirect: "error", signal: controller.signal, body: JSON.stringify({ model: env.IMAGE_MODEL || "gpt-image-1", prompt: normalized.prompt, size: normalized.size, quality: "medium", n: 1 }) });
        if (!response.ok) { const error = new Error("OpenAI rasm modeli HTTP " + response.status + " javob qaytardi."); error.status = 502; throw error; }
        const data = await response.json();
        const image = data?.data?.[0]?.b64_json;
        if (typeof image !== "string" || image.length < 100 || image.length > 8 * 1024 * 1024 || !/^[A-Za-z0-9+/]+={0,2}$/.test(image)) { const error = new Error("OpenAI modeli yaroqli rasm qaytarmadi."); error.status = 502; throw error; }
        return { image, mimeType: "image/png", prompt: value, size: normalized.size, style: normalized.style };
      }
      const endpoint = getStableDiffusionEndpoint(env);
      const headers = { "Content-Type": "application/json" };
      if (env.IMAGE_GENERATION_USERNAME || env.IMAGE_GENERATION_PASSWORD) {
        const token = Buffer.from(String(env.IMAGE_GENERATION_USERNAME || "") + ":" + String(env.IMAGE_GENERATION_PASSWORD || "")).toString("base64");
        headers.Authorization = "Basic " + token;
      }
      const { width, height } = imageDimensions(normalized.size);
      const response = await fetchImpl(endpoint + "/sdapi/v1/txt2img", { method: "POST", headers, redirect: "error", signal: controller.signal, body: JSON.stringify({ prompt: normalized.prompt, negative_prompt: "blurry, low quality, distorted, watermark, unreadable text", steps: 20, width, height, cfg_scale: 7, sampler_name: "Euler a" }) });
      if (!response.ok) { const error = new Error("Rasm modeli HTTP " + response.status + " javob qaytardi."); error.status = 502; throw error; }
      const data = await response.json();
      const image = Array.isArray(data.images) ? data.images[0] : null;
      if (typeof image !== "string" || image.length < 100 || image.length > 8 * 1024 * 1024 || !/^[A-Za-z0-9+/]+={0,2}$/.test(image)) { const error = new Error("Rasm modeli yaroqli rasm qaytarmadi."); error.status = 502; throw error; }
      return { image, mimeType: "image/png", prompt: value, size: normalized.size, style: normalized.style };
    } catch (error) {
      if (error.name === "AbortError") { const timeout = new Error("Rasm yaratish 90 soniyada tugamadi."); timeout.status = 504; throw timeout; }
      throw error;
    } finally { clearTimeout(timer); }
  }
  return { status, generate };
}
module.exports = { createImageGenerator, getStableDiffusionEndpoint, getOpenAIEndpoint, validatePrompt, normalizeOptions, imageDimensions };
