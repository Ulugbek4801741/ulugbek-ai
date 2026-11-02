"use strict";

// Test-only mock for the Gemini HTTP endpoint. It is inert unless both test gates are set.
if (process.env.NODE_ENV === "test" && process.env.ULUGBEK_TEST_MOCK_GEMINI === "true") {
  const fs = require("node:fs");
  const realFetch = global.fetch;
  global.fetch = async (input, init = {}) => {
    const url = typeof input === "string" ? input : input?.url;
    if (typeof url === "string" && url.startsWith("https://generativelanguage.googleapis.com/")) {
      const body = JSON.parse(init.body || "{}");
      if (process.env.ULUGBEK_TEST_GEMINI_CAPTURE) {
        fs.writeFileSync(process.env.ULUGBEK_TEST_GEMINI_CAPTURE, JSON.stringify({
          url,
          body,
          headerNames: Object.keys(init.headers || {}).map(name => name.toLowerCase())
        }));
      }
      return new Response(JSON.stringify({
        candidates: [{ content: { parts: [{ text: "Mock Gemini javobi" }] } }]
      }), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    return realFetch(input, init);
  };
}
