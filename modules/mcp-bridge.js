"use strict";

const rateLimit = require("express-rate-limit");

let sdkPromise;

function loadMcpSdk() {
  if (!sdkPromise) {
    sdkPromise = Promise.all([
      import("@modelcontextprotocol/sdk/server/mcp.js"),
      import("@modelcontextprotocol/sdk/server/streamableHttp.js"),
      import("zod/v4")
    ]).then(([serverSdk, transportSdk, zod]) => ({
      McpServer: serverSdk.McpServer,
      StreamableHTTPServerTransport: transportSdk.StreamableHTTPServerTransport,
      z: zod.z
    }));
  }
  return sdkPromise;
}

function jsonRpcMethodNotAllowed(res) {
  return res.status(405).set("Allow", "POST").json({
    jsonrpc: "2.0",
    error: { code: -32000, message: "Method not allowed. Use POST." },
    id: null
  });
}

async function fetchLocalJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    signal: AbortSignal.timeout(120000)
  });
  const data = await response.json().catch(() => ({ error: "ULUGBEK AI JSON javob qaytarmadi." }));
  return { response, data };
}

async function createUlugbekMcpServer(port) {
  const { McpServer, z } = await loadMcpSdk();
  const server = new McpServer(
    { name: "ulugbek-ai-chat", version: "1.0.0" },
    { capabilities: { tools: {} } }
  );
  const baseUrl = `http://127.0.0.1:${port}`;

  server.registerTool(
    "ulugbek_chat",
    {
      description: "ULUGBEK AI haqiqiy chatiga foydalanuvchi savolini yuboradi va uning javobini qaytaradi. Bu demo emas: so‘rov ULUGBEK AI /api/chat endpointidan o‘tadi. Uzbek, English yoki boshqa qo‘llab-quvvatlanadigan tilda savol yuboring.",
      inputSchema: {
        message: z.string().trim().min(1).max(4000).describe("ULUGBEK AI chatiga yuboriladigan savol yoki topshiriq (4000 belgigacha)."),
        sessionId: z.string().regex(/^[a-zA-Z0-9_-]{8,80}$/).optional().describe("Ixtiyoriy suhbat identifikatori; bir xil qiymat suhbat kontekstini saqlaydi."),
        countryCode: z.string().length(2).optional().describe("Huquqiy savollar uchun davlatning ISO ikki harfli kodi, masalan UZ.")
      }
    },
    async ({ message, sessionId, countryCode }) => {
      try {
        const { response, data } = await fetchLocalJson(`${baseUrl}/api/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Accept": "application/json" },
          body: JSON.stringify({ message, sessionId, countryCode })
        });
        const output = {
          httpStatus: response.status,
          ok: response.ok,
          ...data
        };
        const serialized = JSON.stringify(output);
        return {
          content: [{ type: "text", text: serialized.length > 24000 ? serialized.slice(0, 24000) + " [javob qisqartirildi]" : serialized }],
          isError: !response.ok
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `ULUGBEK AI chatiga ulanish xatosi: ${error.message}` }],
          isError: true
        };
      }
    }
  );

  server.registerTool(
    "ulugbek_health",
    {
      description: "ULUGBEK AI ishlab turgan serverining /api/health holatini tekshiradi. Model va til moduli tayyorligini ko‘rsatadi."
    },
    async () => {
      try {
        const { response, data } = await fetchLocalJson(`${baseUrl}/api/health`, {
          headers: { "Accept": "application/json" }
        });
        return {
          content: [{ type: "text", text: JSON.stringify({ httpStatus: response.status, ...data }) }],
          isError: !response.ok
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `ULUGBEK AI holatini tekshirish xatosi: ${error.message}` }],
          isError: true
        };
      }
    }
  );

  return server;
}

function mountMcpBridge(app, options = {}) {
  const port = Number(options.port || process.env.PORT) || 3000;
  const mcpRateLimit = rateLimit({
    windowMs: 60 * 1000,
    limit: 20,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { error: "MCP sinov so‘rovlari limiti tugadi. Bir daqiqadan keyin qayta urinib ko‘ring." }
  });

  app.post("/mcp", mcpRateLimit, async (req, res) => {
    let server;
    let transport;
    try {
      const { StreamableHTTPServerTransport } = await loadMcpSdk();
      server = await createUlugbekMcpServer(port);
      transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
      await server.connect(transport);
      res.on("close", () => {
        transport.close().catch(() => {});
        server.close().catch(() => {});
      });
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      console.error("ULUGBEK AI MCP bridge xatosi:", error.message);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: "2.0",
          error: { code: -32603, message: "ULUGBEK AI MCP bridge ichki xatosi." },
          id: null
        });
      }
      if (transport) await transport.close().catch(() => {});
      if (server) await server.close().catch(() => {});
    }
  });

  app.get("/mcp", (_req, res) => jsonRpcMethodNotAllowed(res));
  app.delete("/mcp", (_req, res) => jsonRpcMethodNotAllowed(res));
}

module.exports = { mountMcpBridge };
