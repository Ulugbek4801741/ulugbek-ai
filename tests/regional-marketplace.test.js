"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const os = require("node:os");
const path = require("node:path");
const fs = require("node:fs/promises");
const express = require("express");

let server, base, dataDir, sellerToken, buyerToken, orderId;
const sellerPhone = "+998901234567";

test.before(async () => {
  dataDir = await fs.mkdtemp(path.join(os.tmpdir(), "ulugbek-market-"));
  process.env.ULUGBEK_DATA_DIR = dataDir;
  const app = express();
  app.use(express.json({ limit: "1.2mb" }));
  const router = require("../modules/regional-marketplace-api");
  router.setAssistant(async ({ message }) => "AI vositachi: " + message);
  app.use("/api/marketplace", router);
  await new Promise(resolve => { server = app.listen(0, "127.0.0.1", resolve); });
  base = "http://127.0.0.1:" + server.address().port + "/api/marketplace";
  sellerToken = "a".repeat(64);
});

test.after(async () => {
  if (server) await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  if (dataDir) await fs.rm(dataDir, { recursive: true, force: true });
});

test("marketplace status reports seller auth and email readiness", async () => {
  const response = await fetch(base + "/status");
  const data = await response.json();
  assert.equal(response.status, 200);
  assert.equal(data.ok, true);
  assert.equal(data.sellerAuthentication, "private-seller-access-token");
  assert.equal(data.emailDelivery, "not-configured");
});

test("seller can publish a product using a private seller token", async () => {
  const created = await fetch(base + "/products", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({
      name: "Buxoro gilami", price: 450000, category: "Uy-ro‘zg‘or",
      region: "Buxoro viloyati", district: "Kogon tumani",
      sellerName: "Sinov sotuvchi", sellerPhone,
      sellerAccessToken: sellerToken, description: "Qo‘lda to‘qilgan gilam"
    })
  });
  assert.equal(created.status, 201);
  const product = (await created.json()).product;
  assert.ok(product.id);
  const listing = await fetch(base + "/products?region=" + encodeURIComponent("Buxoro viloyati"));
  const result = await listing.json();
  assert.equal(result.total, 1);
  assert.equal(result.products[0].id, product.id);
  globalThis.testProductId = product.id;
});

test("seller token is required to publish and another token cannot claim same phone", async () => {
  const missing = await fetch(base + "/products", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Mahsulot", price: 10, sellerName: "Test", sellerPhone, region: "Buxoro", district: "Kogon", category: "Test" })
  });
  assert.equal(missing.status, 400);
  const wrong = await fetch(base + "/products", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Mahsulot", price: 10, sellerName: "Test", sellerPhone, sellerAccessToken: "b".repeat(64), region: "Buxoro", district: "Kogon", category: "Test" })
  });
  assert.equal(wrong.status, 409);
});

test("buyer order waits for seller and receives a private conversation token", async () => {
  const response = await fetch(base + "/orders", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({
      productId: globalThis.testProductId, buyerName: "Sinov xaridor",
      buyerPhone: "+998901112233", buyerEmail: "buyer@example.com",
      address: "Kogon tumani, markaziy ko‘cha", quantity: 2,
      paymentMethod: "cash_on_delivery"
    })
  });
  const data = await response.json();
  assert.equal(response.status, 201);
  assert.equal(data.order.status, "awaiting_seller");
  assert.equal(data.order.total, 900000);
  assert.equal(typeof data.buyerAccessToken, "string");
  buyerToken = data.buyerAccessToken;
  orderId = data.order.id;
});

test("only seller can confirm; email is blocked until seller approval", async () => {
  const prematureEmail = await fetch(base + "/orders/" + orderId + "/email", {
    method: "POST", headers: { authorization: "Bearer " + sellerToken }
  });
  assert.equal(prematureEmail.status, 409);
  const unauth = await fetch(base + "/orders/" + orderId + "/decision", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ decision: "accept" })
  });
  assert.equal(unauth.status, 401);
  const sellerOrders = await fetch(base + "/seller/orders", { headers: { authorization: "Bearer " + sellerToken } });
  const sellerOrderData = await sellerOrders.json();
  assert.equal(sellerOrderData.orders.length, 1);
  assert.equal("buyerEmail" in sellerOrderData.orders[0], false);
  const decision = await fetch(base + "/orders/" + orderId + "/decision", {
    method: "POST", headers: { "content-type": "application/json", authorization: "Bearer " + sellerToken },
    body: JSON.stringify({ decision: "accept" })
  });
  const data = await decision.json();
  assert.equal(decision.status, 200);
  assert.equal(data.status, "confirmed");
  assert.equal(data.emailStatus, "not_configured");
  const duplicate = await fetch(base + "/orders/" + orderId + "/decision", {
    method: "POST", headers: { "content-type": "application/json", authorization: "Bearer " + sellerToken },
    body: JSON.stringify({ decision: "accept" })
  });
  assert.equal(duplicate.status, 409);
});

test("buyer and seller can chat and ULUGBEK AI mediates the conversation", async () => {
  const response = await fetch(base + "/orders/" + orderId + "/messages", {
    method: "POST", headers: { "content-type": "application/json", authorization: "Bearer " + buyerToken },
    body: JSON.stringify({ message: "Yetkazib berish qachon?" })
  });
  const data = await response.json();
  assert.equal(response.status, 201);
  assert.match(data.assistant.message, /AI vositachi/);
  const history = await fetch(base + "/orders/" + orderId + "/messages", { headers: { authorization: "Bearer " + sellerToken } });
  assert.equal((await history.json()).messages.length, 2);
});

test("seller can retry email only after seller approval", async () => {
  const response = await fetch(base + "/orders/" + orderId + "/email", {
    method: "POST", headers: { authorization: "Bearer " + sellerToken }
  });
  assert.equal(response.status, 200);
});
