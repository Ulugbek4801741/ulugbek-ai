"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const { createMarketplaceRouter } = require("../modules/marketplace-api");

async function withApp(run) {
  const saved = {};
  for (const key of ["DATABASE_URL", "AUTH_SESSION_SECRET", "AUTH_OTP_SECRET", "ADMIN_SESSION_SECRET", "RESEND_API_KEY", "TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_FROM_NUMBER"]) {
    saved[key] = process.env[key];
    delete process.env[key];
  }
  const app = express();
  app.use(express.json());
  app.use("/api/marketplace", createMarketplaceRouter());
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });
  try {
    const address = server.address();
    await run("http://127.0.0.1:" + address.port);
  } finally {
    await new Promise(resolve => server.close(resolve));
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

test("marketplace status reports unavailable integrations without exposing secrets", async () => {
  await withApp(async base => {
    const response = await fetch(base + "/api/marketplace/status");
    const data = await response.json();
    assert.equal(response.status, 200);
    assert.equal(data.ok, true);
    assert.equal(data.databaseConfigured, false);
    assert.equal(data.authReady, false);
    assert.equal(data.emailDeliveryReady, false);
    assert.equal(data.smsDeliveryReady, false);
    assert.equal(data.payments.paymeReady, false);
    assert.equal(data.payments.clickReady, false);
    assert.equal(JSON.stringify(data).includes("SECRET"), false);
  });
});

test("registration fails closed until database and strong authentication secrets are configured", async () => {
  await withApp(async base => {
    const response = await fetch(base + "/api/marketplace/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Origin": "https://ulugbek4801741.github.io" },
      body: JSON.stringify({ phone: "+998901234567", email: "test@example.com", password: "a-long-test-password" })
    });
    const data = await response.json();
    assert.equal(response.status, 503);
    assert.equal(data.setupRequired, true);
    assert.match(data.error, /AUTH_SESSION_SECRET/);
  });
});

test("marketplace mutation rejects untrusted browser origins", async () => {
  await withApp(async base => {
    const response = await fetch(base + "/api/marketplace/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Origin": "https://attacker.invalid" },
      body: JSON.stringify({})
    });
    assert.equal(response.status, 403);
  });
});

test("course catalog fails clearly when PostgreSQL is not configured", async () => {
  await withApp(async base => {
    const response = await fetch(base + "/api/marketplace/courses");
    const data = await response.json();
    assert.equal(response.status, 503);
    assert.equal(data.ok, false);
    assert.equal(data.error, "Kurslar katalogini yuklab bo‘lmadi.");
  });
});
