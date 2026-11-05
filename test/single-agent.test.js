"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { createSingleAgent, configuration, knowledgeContext } = require("../modules/single-agent");

test("single agent answers arithmetic without requiring a language model", async () => {
  const result = await createSingleAgent({ env: {} }).answer("1+1= javob nechun bo‘ladi?");
  assert.equal(result.reply, "Hisoblash: 1+1 = 2" + String.fromCharCode(10) + "Javob: 2.");
  assert.equal(result.reasoning.method, "verified-native-arithmetic");
});

test("single agent stays disabled until local model URL and name are configured", () => {
  assert.equal(configuration({}).configured, false);
});

test("single agent rejects unsafe endpoint protocols and embedded credentials", () => {
  assert.equal(configuration({ ULUGBEK_LOCAL_MODEL_URL: "file:///etc/passwd", ULUGBEK_LOCAL_MODEL_NAME: "model" }).configured, false);
  assert.equal(configuration({ ULUGBEK_LOCAL_MODEL_URL: "https://user:pass@example.com/v1/chat/completions", ULUGBEK_LOCAL_MODEL_NAME: "model" }).configured, false);
});

test("single agent sends one unified prompt and returns local model answer", async () => {
  let request;
  const agent = createSingleAgent({
    env: {
      ULUGBEK_LOCAL_MODEL_URL: "http://127.0.0.1:11434/v1/chat/completions",
      ULUGBEK_LOCAL_MODEL_NAME: "qwen2.5:7b"
    },
    fetchImpl: async (url, options) => {
      request = { url, options, body: JSON.parse(options.body) };
      return { ok: true, json: async () => ({ choices: [{ message: { content: "1+1=2" } }] }) };
    }
  });
  const result = await agent.answer("Python dasturidagi xatoni qanday topaman?");
  assert.equal(result.reply, "1+1=2");
  assert.equal(result.externalProviderUsed, false);
  assert.equal(request.body.messages.length, 2);
  assert.match(request.body.messages[0].content, /yagona universal yordamchi agent/);
  assert.equal(request.body.model, "qwen2.5:7b");
  assert.equal(request.options.redirect, "error");
});

test("single agent supplies bounded knowledge as evidence, not instructions", async () => {
  let sent = "";
  const agent = createSingleAgent({
    env: { ULUGBEK_LOCAL_MODEL_URL: "http://127.0.0.1:11434/v1/chat/completions", ULUGBEK_LOCAL_MODEL_NAME: "local" },
    fetchImpl: async (_url, options) => {
      sent = JSON.parse(options.body).messages[1].content;
      return { ok: true, json: async () => ({ choices: [{ message: { content: "Dalil asosida javob." } }] }) };
    }
  });
  await agent.answer("Savol", [{ title: "Dars", content: "Matn", source: "https://example.org", status: "approved" }]);
  assert.match(sent, /faqat tekshiriladigan dalil/);
  assert.match(knowledgeContext([{ title: "A", content: "B" }]), /A/);
});

test("single agent can use Gemini through the provider adapter", async () => {
  let sentUrl = "";
  let sentBody;
  const agent = createSingleAgent({
    env: { ULUGBEK_AI_PROVIDER: "gemini", ULUGBEK_AI_MODEL: "gemini-test", ULUGBEK_AI_TOKEN: "test-key" },
    fetchImpl: async (url, options) => {
      sentUrl = String(url);
      sentBody = JSON.parse(options.body);
      return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: "Gemini javobi" }] } }] }) };
    }
  });
  const result = await agent.answer("Kotlin nima?");
  assert.equal(result.reply, "Gemini javobi");
  assert.equal(result.provider, "gemini");
  assert.equal(result.externalProviderUsed, true);
  assert.ok(sentUrl.includes("generativelanguage.googleapis.com"));
  assert.equal(sentBody.contents[0].parts[0].text.includes("Kotlin nima?"), true);
});
test("single agent can use Claude through the provider adapter", async () => {
  let sentBody;
  const agent = createSingleAgent({
    env: { ULUGBEK_AI_PROVIDER: "anthropic", ULUGBEK_AI_MODEL: "claude-test", ULUGBEK_AI_TOKEN: "test-key" },
    fetchImpl: async (_url, options) => {
      sentBody = JSON.parse(options.body);
      return { ok: true, json: async () => ({ content: [{ type: "text", text: "Claude javobi" }] }) };
    }
  });
  const result = await agent.answer("Java nima?");
  assert.equal(result.reply, "Claude javobi");
  assert.equal(result.provider, "anthropic");
  assert.equal(result.externalProviderUsed, true);
  assert.equal(sentBody.model, "claude-test");
});
