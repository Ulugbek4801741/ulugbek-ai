"use strict";

const crypto = require("node:crypto");
const rateLimit = require("express-rate-limit");

function createMcpAccessToken(sessionSecret) {
  if (typeof sessionSecret !== "string" || sessionSecret.length < 32) return "";
  return crypto.createHmac("sha256", sessionSecret)
    .update("ULUGBEK_AI_MCP_ACCESS_V1")
    .digest("hex");
}

function isValidMcpBearerToken(expected, authorization) {
  if (typeof expected !== "string" || !expected ||
      typeof authorization !== "string") return false;
  const match = authorization.match(/^Bearer\s+([A-Za-z0-9._~-]+)$/i);
  if (!match) return false;
  const supplied = Buffer.from(match[1]);
  const actual = Buffer.from(expected);
  return supplied.length === actual.length && crypto.timingSafeEqual(supplied, actual);
}

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

async function createUlugbekMcpServer(port, accessToken) {
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

  server.registerTool(
    "ulugbek_vizor_status",
    { description: "VIZOR ta’lim platformasining PostgreSQL ulanishi va funksiyalar tayyorligini tekshiradi." },
    async () => {
      try {
        const { response, data } = await fetchLocalJson(`${baseUrl}/api/vizor/status`, { headers: { "Accept": "application/json" } });
        return { content: [{ type: "text", text: JSON.stringify({ httpStatus: response.status, ...data }) }], isError: !response.ok };
      } catch (error) {
        return { content: [{ type: "text", text: `VIZOR holatini tekshirish xatosi: ${error.message}` }], isError: true };
      }
    }
  );

  server.registerTool(
    "ulugbek_vizor_courses",
    { description: "VIZOR kurslar katalogini oddiy foydalanuvchi ko‘radigan ochiq ma’lumotlar bilan o‘qiydi." },
    async () => {
      try {
        const { response, data } = await fetchLocalJson(`${baseUrl}/api/vizor/courses`, { headers: { "Accept": "application/json" } });
        return { content: [{ type: "text", text: JSON.stringify({ httpStatus: response.status, ...data }) }], isError: !response.ok };
      } catch (error) {
        return { content: [{ type: "text", text: `VIZOR katalogini olish xatosi: ${error.message}` }], isError: true };
      }
    }
  );

  server.registerTool(
    "ulugbek_vizor_diagnostic",
    { description: "VIZOR PostgreSQL bazasida o‘quvchi, ota-ona, o‘qituvchi, kurs, dars, davomat, test, reyting va bildirishnoma oqimlarini vaqtinchalik tranzaksiyada sinaydi. Sinov ma’lumotlari ROLLBACK bilan bekor qilinadi." },
    async () => {
      try {
        const { response, data } = await fetchLocalJson(`${baseUrl}/api/internal/vizor-diagnostic`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${accessToken}` },
          body: "{}"
        });
        return { content: [{ type: "text", text: JSON.stringify({ httpStatus: response.status, ...data }) }], isError: !response.ok };
      } catch (error) {
        return { content: [{ type: "text", text: `VIZOR diagnostikasi xatosi: ${error.message}` }], isError: true };
      }
    }
  );


  server.registerTool(
    "ulugbek_vizor_user_simulation",
    { description: "VIZOR ilovasida oddiy foydalanuvchi kabi sinov o‘tkazadi: vaqtinchalik o‘quvchi, ota-ona va o‘qituvchi akkauntlari bilan kurs yaratish, kursga yozilish, dars, davomat, progress, test, reyting va ota-ona bildirishnomalarini haqiqiy HTTP API orqali tekshiradi. Sinov tugagach QA akkauntlari va kurs ma’lumotlarini o‘chiradi; haqiqiy foydalanuvchilarga xabar yubormaydi va to‘lov qilmaydi." },
    async () => {
      const callApi = async (path, options = {}) => {
        const headers = { "Accept": "application/json" };
        if (options.token) headers.Authorization = "Bearer " + options.token;
        if (options.body !== undefined) headers["Content-Type"] = "application/json";
        const { response, data } = await fetchLocalJson(baseUrl + path, {
          method: options.method || "GET",
          headers,
          body: options.body === undefined ? undefined : JSON.stringify(options.body)
        });
        if (!response.ok) {
          const error = new Error(data.error || ("HTTP " + response.status));
          error.status = response.status;
          error.data = data;
          throw error;
        }
        return data;
      };
      const ensureUser = async (username, displayName, email, phone, role) => {
        const password = crypto.createHmac("sha256", accessToken).update("VIZOR_QA:" + username).digest("hex");
        try {
          const registered = await callApi("/api/vizor/register", {
            method: "POST",
            body: { username, displayName, email, phone, password, role }
          });
          return { token: registered.token, user: registered.user };
        } catch (error) {
          if (error.status !== 409) throw error;
          const loggedIn = await callApi("/api/vizor/login", {
            method: "POST",
            body: { identifier: username, password }
          });
          return { token: loggedIn.token, user: loggedIn.user };
        }
      };

      let student, teacher, parent, courseId = "";
      let result = { ok: false, checks: {} };
      let failure = "";
      let cleanup = { courseDeleted: false, qaAccountsDeleted: false };
      try {
        student = await ensureUser("ulugbek_qa_student","ULUGBEK QA O‘quvchi","ulugbek-qa-student@ulugbek-ai.invalid","+999000000001","student");
        teacher = await ensureUser("ulugbek_qa_teacher","ULUGBEK QA O‘qituvchi","ulugbek-qa-teacher@ulugbek-ai.invalid","+999000000002","teacher");
        parent = await ensureUser("ulugbek_qa_parent","ULUGBEK QA Ota-ona","ulugbek-qa-parent@ulugbek-ai.invalid","+999000000003","parent");
        result.checks.syntheticAccounts = Boolean(student.token && teacher.token && parent.token);

        const course = await callApi("/api/vizor/courses", {
          method: "POST", token: teacher.token,
          body: { title: "[QA] VIZOR foydalanuvchi sinovi", description: "Vaqtinchalik avtomatik sinov kursi. Sinov tugagach o‘chiriladi.", category: "VIZOR QA", price: 0 }
        });
        courseId = course.course.id;
        result.checks.teacherCourseCreation = Boolean(courseId);

        const lesson = await callApi("/api/vizor/courses/" + encodeURIComponent(courseId) + "/lessons", {
          method: "POST", token: teacher.token,
          body: { title: "[QA] Birinchi dars", videoUrl: "https://youtu.be/aqz-KE-bpKQ", durationMinutes: 60 }
        });
        result.checks.lessonCreation = Boolean(lesson.lesson?.id);

        await callApi("/api/vizor/courses/" + encodeURIComponent(courseId) + "/enroll", { method: "POST", token: student.token, body: {} });
        result.checks.studentEnrollment = true;

        await callApi("/api/vizor/parent/link", { method: "POST", token: parent.token, body: { parentCode: student.user.parentCode } });
        result.checks.parentLink = true;

        await callApi("/api/vizor/lessons/" + encodeURIComponent(lesson.lesson.id) + "/attendance", { method: "POST", token: student.token, body: {} });
        result.checks.attendance = true;

        await callApi("/api/vizor/lessons/" + encodeURIComponent(lesson.lesson.id) + "/progress", { method: "POST", token: student.token, body: { completed: true, secondsWatched: 120 } });
        result.checks.lessonProgress = true;

        const createdTest = await callApi("/api/vizor/courses/" + encodeURIComponent(courseId) + "/tests", {
          method: "POST", token: teacher.token,
          body: { title: "[QA] 2+2 testi", questions: [{ prompt: "2 + 2 nechaga teng?", options: ["3","4"], correctIndex: 1 }] }
        });
        const visibleTests = await callApi("/api/vizor/courses/" + encodeURIComponent(courseId) + "/tests", { token: student.token });
        const attempt = await callApi("/api/vizor/tests/" + encodeURIComponent(createdTest.test.id) + "/attempts", {
          method: "POST", token: student.token, body: { answers: [1] }
        });
        result.checks.quizAndScoring = attempt.percentage === 100 && visibleTests.tests.length === 1;

        const children = await callApi("/api/vizor/parent/children", { token: parent.token });
        const notices = await callApi("/api/vizor/notifications", { token: parent.token });
        result.checks.parentMonitoring = children.children.some(child => child.id === student.user.id);
        result.checks.parentNotifications = notices.notifications.length >= 2;

        const rankings = await callApi("/api/vizor/rankings?period=week");
        result.checks.weeklyRanking = rankings.rankings.some(item => item.id === student.user.id);

        const teacherCourses = await callApi("/api/vizor/teacher/courses", { token: teacher.token });
        const catalog = await callApi("/api/vizor/courses");
        result.checks.teacherDashboard = teacherCourses.courses.some(item => item.id === courseId);
        result.checks.publicCatalog = catalog.courses.some(item => item.id === courseId);
        result.ok = Object.values(result.checks).every(Boolean);
      } catch (error) {
        failure = error.message;
      } finally {
        if (courseId && teacher?.token) {
          try {
            await callApi("/api/vizor/courses/" + encodeURIComponent(courseId), { method: "DELETE", token: teacher.token });
            cleanup.courseDeleted = true;
          } catch (_) {}
        }
        try {
          const { response, data } = await fetchLocalJson(baseUrl + "/api/internal/vizor-qa-cleanup", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": "Bearer " + accessToken },
            body: "{}"
          });
          cleanup.qaAccountsDeleted = response.ok && data.ok === true;
        } catch (_) {}
      }
      result.cleanup = cleanup;
      if (failure) result.error = failure;
      return {
        content: [{ type: "text", text: JSON.stringify(result) }],
        isError: !result.ok || !cleanup.qaAccountsDeleted
      };
    }
  );

  return server;
}

function mountMcpBridge(app, options = {}) {
  const port = Number(options.port || process.env.PORT) || 3000;
  const accessToken = typeof options.accessToken === "string" ? options.accessToken : "";
  const requireMcpBearer = (req, res, next) => {
    if (!accessToken) {
      return res.status(503).json({ error: "MCP autentifikatsiyasi serverda sozlanmagan." });
    }
    if (!isValidMcpBearerToken(accessToken, req.get("Authorization"))) {
      res.set("WWW-Authenticate", 'Bearer realm="ULUGBEK AI MCP"');
      return res.status(401).json({ error: "MCP ulanish tokeni noto‘g‘ri yoki yo‘q." });
    }
    next();
  };
  const mcpRateLimit = rateLimit({
    windowMs: 60 * 1000,
    limit: 20,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { error: "MCP sinov so‘rovlari limiti tugadi. Bir daqiqadan keyin qayta urinib ko‘ring." }
  });

  app.post("/mcp", requireMcpBearer, mcpRateLimit, async (req, res) => {
    let server;
    let transport;
    try {
      const { StreamableHTTPServerTransport } = await loadMcpSdk();
      server = await createUlugbekMcpServer(port, accessToken);
      transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
      await server.connect(transport);
      res.on("close", () => {
        try { Promise.resolve(transport.close()).catch(() => {}); } catch (_) {}
        try { Promise.resolve(server.close()).catch(() => {}); } catch (_) {}
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
      if (transport) {
        try { await transport.close(); } catch (_) {}
      }
      if (server) {
        try { await server.close(); } catch (_) {}
      }
    }
  });

  app.get("/mcp", (_req, res) => jsonRpcMethodNotAllowed(res));
  app.delete("/mcp", (_req, res) => jsonRpcMethodNotAllowed(res));
}

module.exports = { mountMcpBridge, createMcpAccessToken, isValidMcpBearerToken };
