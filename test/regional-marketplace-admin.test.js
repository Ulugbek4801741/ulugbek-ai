"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const express = require("express");

const dataDir = require("node:fs").mkdtempSync(path.join(os.tmpdir(), "ulugbek-marketplace-admin-"));
process.env.ULUGBEK_DATA_DIR = dataDir;
delete process.env.DATABASE_URL;
const router = require("../modules/regional-marketplace-api");
router.setAdminGuard((req, res, next) => {
  if (req.get("x-test-admin") === "yes") return next();
  return res.status(401).json({ ok: false, error: "unauthorized" });
});

async function writeList(name, value) {
  const root = path.join(dataDir, "regional-marketplace");
  await fs.mkdir(root, { recursive: true });
  await fs.writeFile(path.join(root, name + ".json"), JSON.stringify(value), "utf8");
}
async function startServer() {
  const app = express();
  app.use(express.json());
  app.use("/api/marketplace", router);
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });
  return { base: "http://127.0.0.1:" + server.address().port, close: () => new Promise(resolve => server.close(resolve)) };
}

test("business admin APIs require the existing administrator guard and hide access hashes", async t => {
  await Promise.all([
    writeList("sellers", [{ id: "seller-1", name: "Test seller", phone: "+998901234567", tokenHash: "private-token-hash", verified: false }]),
    writeList("products", [{ id: "product-1", name: "Test product", price: 12000, sellerName: "Test seller", sellerPhone: "+998901234567", region: "Buxoro", district: "Kogon", status: "active", imageData: "private-image-data" }]),
    writeList("orders", [{ id: "order-1", productId: "product-1", productName: "Test product", sellerPhone: "+998901234567", buyerName: "Test buyer", buyerPhone: "+998901112233", buyerEmail: "buyer@example.com", address: "Kogon", total: 24000, status: "confirmed", buyerTokenHash: "private-buyer-hash" }]),
    writeList("requests", [{ id: "request-1", title: "Need a product", customerName: "Buyer", phone: "+998901112233", region: "Buxoro", district: "Kogon", budget: 50000, status: "open" }])
  ]);
  const app = await startServer();
  t.after(() => app.close());

  const status = await fetch(app.base + "/api/marketplace/status");
  const statusData = await status.json();
  assert.equal(status.status, 200);
  assert.equal(statusData.databaseConfigured, false);
  assert.equal(statusData.databaseConnected, false);
  assert.equal(statusData.storage, "server-json");

  const denied = await fetch(app.base + "/api/marketplace/admin/orders");
  assert.equal(denied.status, 401);

  const sellers = await fetch(app.base + "/api/marketplace/admin/sellers", { headers: { "x-test-admin": "yes" } });
  const sellerData = await sellers.json();
  assert.equal(sellers.status, 200);
  assert.equal("tokenHash" in sellerData.sellers[0], false);

  const products = await fetch(app.base + "/api/marketplace/admin/products", { headers: { "x-test-admin": "yes" } });
  const productData = await products.json();
  assert.equal("imageData" in productData.products[0], false);

  const orders = await fetch(app.base + "/api/marketplace/admin/orders", { headers: { "x-test-admin": "yes" } });
  const orderData = await orders.json();
  assert.equal("buyerTokenHash" in orderData.orders[0], false);

  const overview = await fetch(app.base + "/api/marketplace/admin/overview", { headers: { "x-test-admin": "yes" } });
  const summary = await overview.json();
  assert.equal(summary.counts.products, 1);
  assert.equal(summary.counts.sellers, 1);
  assert.equal(summary.counts.confirmedOrders, 1);
  assert.equal(summary.orderValue, 24000);
  assert.match(summary.paymentNote, /bankka pul tushgani/);
});

test("admin moderation and order state changes persist safely", async t => {
  const app = await startServer();
  t.after(() => app.close());
  const headers = { "Content-Type": "application/json", "x-test-admin": "yes" };

  const seller = await fetch(app.base + "/api/marketplace/admin/sellers/seller-1/verification", {
    method: "POST", headers, body: JSON.stringify({ verified: true })
  });
  assert.equal(seller.status, 200);

  const product = await fetch(app.base + "/api/marketplace/admin/products/product-1/status", {
    method: "POST", headers, body: JSON.stringify({ status: "paused" })
  });
  assert.equal(product.status, 200);

  const order = await fetch(app.base + "/api/marketplace/admin/orders/order-1/status", {
    method: "POST", headers, body: JSON.stringify({ status: "completed" })
  });
  assert.equal(order.status, 200);
  const secondChange = await fetch(app.base + "/api/marketplace/admin/orders/order-1/status", {
    method: "POST", headers, body: JSON.stringify({ status: "cancelled" })
  });
  assert.equal(secondChange.status, 409);

  const request = await fetch(app.base + "/api/marketplace/admin/requests/request-1/status", {
    method: "POST", headers, body: JSON.stringify({ status: "closed" })
  });
  assert.equal(request.status, 200);
});
