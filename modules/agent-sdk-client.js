"use strict";

function configuration(env = process.env) {
  const base = String(env.AGENT_SDK_URL || "").trim().replace(/\/+$/, "");
  const token = String(env.AGENT_SDK_TOKEN || "").trim();
  try {
    const url = new URL(base);
    const local = ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
    if (!["https:", "http:"].includes(url.protocol) || (!local && url.protocol !== "https:")) {
      return { configured: false, reason: "https-required" };
    }
    if (token.length < 32) return { configured: false, reason: "service-token-missing" };
    return { configured: true, baseUrl: url.origin, tokenConfigured: true };
  } catch (_) {
    return { configured: false, reason: base ? "invalid-url" : "url-missing" };
  }
}

async function answer(input = {}, options = {}) {
  const env = options.env || process.env;
  const config = configuration(env);
  if (!config.configured) return null;
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  if (typeof fetchImpl !== "function") return null;
  const message = String(input.input || "").trim();
  if (!message || message.length > 16000) return null;
  const sessionId = String(input.sessionId || "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80);
  const payload = {
    input: message,
    instructions: String(input.instructions || "").slice(0, 16000),
    session_id: sessionId || undefined,
    category: String(input.category || "general").slice(0, 40)
  };
  try {
    const response = await fetchImpl(config.baseUrl + "/v1/answer", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: "Bearer " + String(env.AGENT_SDK_TOKEN)
      },
      body: JSON.stringify(payload),
      signal: options.signal
    });
    if (!response.ok) return null;
    const data = await response.json();
    if (data?.ok !== true || typeof data.reply !== "string" || !data.reply.trim()) return null;
    return {
      reply: data.reply.trim().slice(0, 16000),
      modelUsed: data.model || "agents-sdk",
      provider: data.provider || "agents-sdk",
      externalProviderUsed: true,
      reasoning: { method: "openai-agents-sdk-handoff", answerable: true, facts: [] },
      agentSdk: {
        enabled: true,
        agent: String(data.agent || "ULUGBEK AI Coordinator").slice(0, 80),
        handoff: Array.isArray(data.handoffs) ? data.handoffs.slice(0, 5) : [],
        sessionPersisted: data.session_persisted === true
      }
    };
  } catch (_) {
    return null;
  }
}

function status(env = process.env) {
  const config = configuration(env);
  return {
    configured: config.configured,
    ready: config.configured,
    reason: config.reason || null,
    tokenConfigured: config.tokenConfigured === true,
    mode: "optional-python-openai-agents-sdk-with-node-fallback"
  };
}

module.exports = { configuration, answer, status };
