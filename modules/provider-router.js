"use strict";

function validHttpUrl(value) {
  try {
    const url = new URL(String(value || ""));
    return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password ? url : null;
  } catch (_) { return null; }
}

function providerFor(env) {
  const explicit = String(env.ULUGBEK_AI_PROVIDER || "").trim().toLowerCase();
  if (explicit) return explicit;
  if (String(env.ULUGBEK_OLLAMA_URL || env.ULUGBEK_OLLAMA_BASE_URL || "").trim() && String(env.ULUGBEK_OLLAMA_MODEL || "").trim()) return "ollama";
  if (String(env.ULUGBEK_LOCAL_MODEL_URL || "").trim() && String(env.ULUGBEK_LOCAL_MODEL_NAME || "").trim()) return "openai-compatible";
  return "none";
}

function modelFor(provider, env) {
  if (provider === "ollama") return String(env.ULUGBEK_OLLAMA_MODEL || "").trim();
  if (env.ULUGBEK_AI_MODEL) return String(env.ULUGBEK_AI_MODEL).trim();
  if (provider === "openai-compatible") return String(env.ULUGBEK_LOCAL_MODEL_NAME || "").trim();
  return "";
}

function tokenFor(provider, env) {
  if (provider === "ollama") return String(env.ULUGBEK_OLLAMA_TOKEN || "").trim();
  if (env.ULUGBEK_AI_TOKEN || env.ULUGBEK_LOCAL_MODEL_TOKEN) {
    return String(env.ULUGBEK_AI_TOKEN || env.ULUGBEK_LOCAL_MODEL_TOKEN).trim();
  }
  return "";
}

function endpointFor(provider, env) {
  if (provider === "openai-compatible") {
    const configured = String(env.ULUGBEK_AI_BASE_URL || env.ULUGBEK_LOCAL_MODEL_URL || "").trim();
    return configured;
  }
  return "";
}

function configuration(env = process.env) {
  const provider = providerFor(env);
  if (provider === "ollama") {
    const local = require("./ollama-provider").configuration(env);
    return local.configured ? local : { ...local, apiKeyRequired: false };
  }
  const model = modelFor(provider, env);
  const token = tokenFor(provider, env);
  if (provider === "none" || !provider) return { configured: false, provider: "not-configured", apiKeyRequired: false };
  if (!model) return { configured: false, provider, reason: "model-name-missing", apiKeyRequired: false };
  if (provider === "openai-compatible") {
    const url = validHttpUrl(endpointFor(provider, env));
    if (!url || url.hostname === "api.openai.com") {
      return { configured: false, provider: "local-compatible", reason: !url ? "endpoint-invalid" : "hosted-provider-blocked", apiKeyRequired: false };
    }
    return { configured: true, provider: "local-compatible", model, endpoint: url.toString(), apiKeyRequired: false, tokenConfigured: Boolean(token) };
  }
  return { configured: false, provider, reason: "provider-unsupported", apiKeyRequired: false };
}

function request(prompt, systemPrompt, env = process.env) {
  const config = configuration(env);
  if (!config.configured) throw new Error("Mustaqil mahalliy AI modeli sozlanmagan.");
  const userText = String(prompt || "");
  if (config.provider === "ollama") {
    return require("./ollama-provider").request([
      { role: "system", content: systemPrompt },
      { role: "user", content: userText }
    ], env);
  }
  const headers = { "Content-Type": "application/json", Accept: "application/json" };
  const token = tokenFor("openai-compatible", env);
  if (token) headers.Authorization = "Bearer " + token;
  return {
    url: config.endpoint,
    options: { method: "POST", headers, body: JSON.stringify({
      model: config.model,
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userText }],
      temperature: 0.2, max_tokens: 2400, stream: false
    }) }
  };
}

function extract(payload, provider) {
  if (provider === "ollama") return require("./ollama-provider").extract(payload);
  if (provider === "local-compatible" || provider === "openai-compatible") {
    const value = payload?.choices?.[0]?.message?.content;
    return typeof value === "string" ? value.trim() : "";
  }
  return "";
}

module.exports = { configuration, request, extract, validHttpUrl };
