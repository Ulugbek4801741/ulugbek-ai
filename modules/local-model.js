"use strict";

// API-key-free local Ollama adapter. The model runs on infrastructure controlled
// by the operator; no hosted AI provider is contacted by this module.
const BASE_URL = (process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434").replace(/\/$/, "");
const MODEL = process.env.OLLAMA_MODEL || "qwen2.5:3b";
const TIMEOUT_MS = Math.max(5000, Math.min(120000, Number(process.env.OLLAMA_TIMEOUT_MS) || 60000));

function endpoint() {
  const url = new URL(BASE_URL);
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) {
    throw new Error("OLLAMA_BASE_URL noto‘g‘ri sozlangan.");
  }
  return url.origin;
}

async function generate(messages, options = {}) {
  if (!Array.isArray(messages) || !messages.length) throw new TypeError("Model xabarlari kerak.");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(endpoint() + "/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        messages: messages.map(item => ({
          role: ["system", "user", "assistant"].includes(item.role) ? item.role : "user",
          content: String(item.content || "").slice(0, 12000)
        })),
        stream: false,
        options: { temperature: 0.3, num_ctx: 8192, ...(options.modelOptions || {}) }
      }),
      signal: controller.signal,
      redirect: "error"
    });
    if (!response.ok) {
      const error = new Error("Mahalliy Ollama modeli HTTP " + response.status + " javob berdi.");
      error.status = response.status;
      throw error;
    }
    const data = await response.json();
    const content = data?.message?.content;
    if (typeof content !== "string" || !content.trim()) throw new Error("Mahalliy model bo‘sh javob qaytardi.");
    return content.trim().slice(0, 24000);
  } catch (error) {
    if (error.name === "AbortError") throw new Error("Mahalliy model javobi vaqti tugadi.");
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function status() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2500);
  try {
    const response = await fetch(endpoint() + "/api/tags", { signal: controller.signal, redirect: "error" });
    if (!response.ok) return { available: false, model: MODEL, provider: "ollama-local", apiKeyRequired: false };
    const data = await response.json();
    const models = Array.isArray(data.models) ? data.models : [];
    return {
      available: models.some(item => item.name === MODEL || item.model === MODEL),
      model: MODEL,
      provider: "ollama-local",
      apiKeyRequired: false,
      installedModels: models.map(item => item.name || item.model).filter(Boolean).slice(0, 30)
    };
  } catch (_) {
    return { available: false, model: MODEL, provider: "ollama-local", apiKeyRequired: false };
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = { generate, status };
