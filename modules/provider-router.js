"use strict";

function validHttpUrl(value) {
  try {
    const url = new URL(String(value || ""));
    return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password ? url : null;
  } catch (_) { return null; }
}

function configuration(env = process.env) {
  const legacyUrl = String(env.ULUGBEK_LOCAL_MODEL_URL || "").trim();
  const legacyModel = String(env.ULUGBEK_LOCAL_MODEL_NAME || "").trim();
  const provider = String(env.ULUGBEK_AI_PROVIDER || (legacyUrl && legacyModel ? "openai-compatible" : "none")).trim().toLowerCase();
  const model = String(env.ULUGBEK_AI_MODEL || legacyModel || "").trim();
  const token = String(env.ULUGBEK_AI_TOKEN || env.ULUGBEK_LOCAL_MODEL_TOKEN || "").trim();

  if (provider === "none" || !provider) return { configured: false, provider: "not-configured", apiKeyRequired: false };
  if (!model) return { configured: false, provider, reason: "model-name-missing", apiKeyRequired: provider !== "openai-compatible" };
  if (provider === "openai-compatible") {
    const raw = String(env.ULUGBEK_AI_BASE_URL || legacyUrl).trim();
    const url = validHttpUrl(raw);
    if (!url) return { configured: false, provider, reason: "endpoint-invalid", apiKeyRequired: false };
    return { configured: true, provider, model, endpoint: url.toString(), apiKeyRequired: false, tokenConfigured: Boolean(token) };
  }
  if (provider === "gemini") return { configured: Boolean(token), provider, model, apiKeyRequired: true, tokenConfigured: Boolean(token) };
  if (provider === "anthropic") return { configured: Boolean(token), provider, model, apiKeyRequired: true, tokenConfigured: Boolean(token) };
  return { configured: false, provider, reason: "provider-unsupported", apiKeyRequired: true };
}

function request(prompt, systemPrompt, env = process.env) {
  const config = configuration(env);
  if (!config.configured) throw new Error("AI provider sozlanmagan yoki konfiguratsiya to‘liq emas.");
  const userText = String(prompt || "");
  if (config.provider === "openai-compatible") {
    const headers = { "Content-Type": "application/json", Accept: "application/json" };
    const token = String(env.ULUGBEK_AI_TOKEN || env.ULUGBEK_LOCAL_MODEL_TOKEN || "").trim();
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
  if (config.provider === "gemini") {
    const url = "https://generativelanguage.googleapis.com/v1beta/models/" +
      encodeURIComponent(config.model) + ":generateContent?key=" + encodeURIComponent(String(env.ULUGBEK_AI_TOKEN));
    return {
      url,
      options: { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: "user", parts: [{ text: userText }] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 2400 }
        }) }
    };
  }
  const url = String(env.ULUGBEK_AI_BASE_URL || "https://api.anthropic.com/v1/messages").trim();
  const parsed = validHttpUrl(url);
  if (!parsed || parsed.hostname !== "api.anthropic.com") throw new Error("Anthropic endpoint faqat rasmiy api.anthropic.com bo‘lishi mumkin.");
  return {
    url: parsed.toString(),
    options: { method: "POST", headers: {
      "Content-Type": "application/json", Accept: "application/json",
      "x-api-key": String(env.ULUGBEK_AI_TOKEN),
      "anthropic-version": "2023-06-01"
    }, body: JSON.stringify({
      model: config.model, system: systemPrompt,
      messages: [{ role: "user", content: userText }],
      temperature: 0.2, max_tokens: 2400
    }) }
  };
}

function extract(payload, provider) {
  if (provider === "openai-compatible") {
    const value = payload?.choices?.[0]?.message?.content;
    return typeof value === "string" ? value.trim() : "";
  }
  if (provider === "gemini") {
    return (payload?.candidates?.[0]?.content?.parts || [])
      .map(part => typeof part?.text === "string" ? part.text : "").join("\n").trim();
  }
  if (provider === "anthropic") {
    return (payload?.content || [])
      .filter(part => part?.type === "text" && typeof part.text === "string")
      .map(part => part.text).join("\n").trim();
  }
  return "";
}

module.exports = { configuration, request, extract, validHttpUrl };
