"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const client = require("../modules/agent-sdk-client");

test("SDK client stays disabled until URL and strong service token are configured", () => {
  assert.equal(client.status({}).configured, false);
  assert.equal(client.status({ AGENT_SDK_URL: "https://agent.example.com", AGENT_SDK_TOKEN: "short" }).configured, false);
  assert.equal(client.status({ AGENT_SDK_URL: "https://agent.example.com", AGENT_SDK_TOKEN: "x".repeat(40) }).configured, true);
});

test("SDK client accepts a private single-label Render hostname", () => {
  const status = client.status({ AGENT_SDK_URL: "http://ulugbek-agent-sdk:10000", AGENT_SDK_TOKEN: "x".repeat(40) });
  assert.equal(status.configured, true);
});

test("SDK client rejects non-HTTPS public endpoints", () => {
  const status = client.status({ AGENT_SDK_URL: "http://agent.example.com", AGENT_SDK_TOKEN: "x".repeat(40) });
  assert.equal(status.configured, false);
  assert.equal(status.reason, "https-required");
});

test("SDK client validates and normalizes successful responses", async () => {
  let request;
  const result = await client.answer(
    { input: "Salom", instructions: "Uzbek", sessionId: "session_123" },
    {
      env: { AGENT_SDK_URL: "https://agent.example.com/", AGENT_SDK_TOKEN: "x".repeat(40) },
      fetchImpl: async (url, options) => {
        request = { url, options };
        return { ok: true, json: async () => ({ ok: true, reply: "Assalomu alaykum", model: "gemini-2.5-flash", provider: "gemini", session_persisted: true, handoffs: ["research"] }) };
      }
    }
  );
  assert.equal(request.url, "https://agent.example.com/v1/answer");
  assert.equal(request.options.headers.Authorization, "Bearer " + "x".repeat(40));
  assert.equal(result.reply, "Assalomu alaykum");
  assert.equal(result.agentSdk.sessionPersisted, true);
  assert.deepEqual(result.agentSdk.handoff, ["research"]);
});

test("SDK client returns null when the private service fails", async () => {
  const result = await client.answer(
    { input: "Salom" },
    {
      env: { AGENT_SDK_URL: "https://agent.example.com", AGENT_SDK_TOKEN: "x".repeat(40) },
      fetchImpl: async () => ({ ok: false, status: 503 })
    }
  );
  assert.equal(result, null);
});
