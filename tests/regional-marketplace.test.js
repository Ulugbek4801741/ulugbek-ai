"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const os = require("node:os");
const path = require("node:path");
const fs = require("node:fs/promises");
const express = require("express");

let server;
let base;
let dataDir;

test.before(async () => {
  dataDir = await fs.mkdtemp(path.join(os.tmpdir(), "ulugbek-market-"));
  process.env.ULUGBEK_DATA_DIR = dataDir;
  const app = express();
  app.use(express.json({ limit: "1.2mb" }));
  app.use("/api/marketplace", require("../modules/regional-marketplace-api"));
  await new Promise(resolve => { server = app.listen(0, "127.0.0.1", resolve); });
  base = "http://127.0.0.1:" + server.address().port + "/api/marketplace";
});

test.after(async () => {
  if (server) await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  if (dataDir) await fs.rm(dataDir, { recursive: true, force: true });
});

test("marketplace status reports server storage", async () => {
  const response = await fetch(base + "/status");
  const data = await response.json();
  assert.equal(response.status, 200);
  assert.equal(data.ok, true);
  assert.equal(data.storage, "server-json");
});

test("seller can publish a product and it is visible by region", async () => {
  const created = await fetch(base + "/products", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({
      name: "Buxoro gilami", price: 450000, category: "Uy-ro‘zg‘or",
      region: "Buxoro viloyati", district: "Kogon tumani",
      sellerName: "Sinov sotuvchi", sellerPhone: "+998901234567",
      description: "Qo‘lda to‘qilgan gilam", freeDelivery: true
    })
  });
  assert.equal(created.status, 201);
  const product = (await created.json()).product;
  const listing = await fetch(base + "/products?region=" + encodeURIComponent("Buxoro viloyati"));
  const result = await listing.json();
  assert.equal(result.total, 1);
  assert.equal(result.products[0].id, product.id);
});

test("invalid product is rejected", async () => {
  const response = await fetch(base + "/products", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "X", price: -1 })
  });
  assert.equal(response.status, 400);
});

test("buyer can submit an order stored on the server", async () => {
  const list = await (await fetch(base + "/products")).json();
  const product = list.products[0];
  const response = await fetch(base + "/orders", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({
      productId: product.id, buyerName: "Sinov xaridor",
      buyerPhone: "+998901112233", address: "Kogon tumani, markaziy ko‘cha",
      quantity: 2, paymentMethod: "cash_on_delivery"
    })
  });
  const data = await response.json();
  assert.equal(response.status, 201);
  assert.equal(data.ok, true);
  assert.equal(data.order.total, 900000);
});

test("buyer request receives a server-generated id", async () => {
  const response = await fetch(base + "/requests", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({
      title: "Bolalar velosipedi", customerName: "Sinov xaridor",
      phone: "+998901112233", region: "Buxoro viloyati",
      district: "Kogon tumani", budget: 800000
    })
  });
  const data = await response.json();
  assert.equal(response.status, 201);
  assert.ok(data.request.id);
});
