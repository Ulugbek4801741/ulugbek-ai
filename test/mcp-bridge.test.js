"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const { mountMcpBridge, createMcpAccessToken } = require("../modules/mcp-bridge");

async function readRpcResponse(response) {
  const raw = await response.text();
  if ((response.headers.get("content-type") || "").includes("text/event-stream")) {
    const data = raw.split(/\r?\n/).filter(line => line.startsWith("data:")).map(line => line.slice(5).trim());
    assert.ok(data.length, "MCP SSE response should contain a data event");
    return JSON.parse(data[data.length - 1]);
  }
  return raw ? JSON.parse(raw) : null;
}

test("MCP bridge exposes chat, health, and safe VIZOR tools", async t => {
  const app = express();
  app.use(express.json());
  app.post("/api/chat", (req, res) => {
    res.json({ reply: `ULUGBEK test javobi: ${req.body.message}`, mode: "mcp-test" });
  });
  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, service: "ulugbek-ai-test" });
  });

  const httpServer = app.listen(0);
  await new Promise(resolve => httpServer.once("listening", resolve));
  const port = httpServer.address().port;
  const accessToken = createMcpAccessToken("a".repeat(48));
  mountMcpBridge(app, { port, accessToken });
  t.after(() => new Promise(resolve => httpServer.close(resolve)));

  const endpoint = `http://127.0.0.1:${port}/mcp`;
  const headers = {
    "Content-Type": "application/json",
    "Accept": "application/json, text/event-stream",
    "Authorization": `Bearer ${accessToken}`
  };

  const unauthorized = await fetch(endpoint, {
    method: "POST",
    headers: { ...headers, Authorization: "" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 0, method: "initialize", params: {} })
  });
  assert.equal(unauthorized.status, 401);

  const initialized = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2025-11-25",
        capabilities: {},
        clientInfo: { name: "ulugbek-mcp-test", version: "1.0.0" }
      }
    })
  });
  assert.equal(initialized.status, 200);
  const initResult = await readRpcResponse(initialized);
  assert.equal(initResult.result?.serverInfo?.name, "ulugbek-ai-chat");

  const notification = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" })
  });
  assert.ok([200, 202, 204].includes(notification.status));

  const listed = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} })
  });
  assert.equal(listed.status, 200);
  const listResult = await readRpcResponse(listed);
  const toolNames = listResult.result?.tools?.map(tool => tool.name) || [];
  assert.deepEqual(toolNames.sort(), ["ulugbek_chat", "ulugbek_health", "ulugbek_vizor_courses", "ulugbek_vizor_diagnostic", "ulugbek_vizor_status", "ulugbek_vizor_user_simulation"]);

  const chat = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 3,
      method: "tools/call",
      params: { name: "ulugbek_chat", arguments: { message: "Salom ULUGBEK AI" } }
    })
  });
  assert.equal(chat.status, 200);
  const chatResult = await readRpcResponse(chat);
  assert.match(chatResult.result?.content?.[0]?.text || "", /ULUGBEK test javobi: Salom ULUGBEK AI/);

  const health = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 4,
      method: "tools/call",
      params: { name: "ulugbek_health", arguments: {} }
    })
  });
  assert.equal(health.status, 200);
  const healthResult = await readRpcResponse(health);
  assert.match(healthResult.result?.content?.[0]?.text || "", /ulugbek-ai-test/);
});
