"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { createBusinessEngine } = require("../modules/business-engine");

test("catalog returns sellable digital services", () => {
  const engine = createBusinessEngine({ storePath: path.join(os.tmpdir(), "ulugbek-business-catalog-" + Date.now() + ".json") });
  assert.ok(engine.catalog().some(item => item.id === "website"));
  assert.ok(engine.catalog().some(item => item.id === "research"));
});

test("quotes validate complexity and provide an estimate range", () => {
  const engine = createBusinessEngine({ storePath: path.join(os.tmpdir(), "ulugbek-business-quote-" + Date.now() + ".json") });
  const result = engine.quote("website", 2);
  assert.equal(result.estimate.currency, "USD");
  assert.ok(result.estimate.minCents < result.estimate.maxCents);
  assert.throws(() => engine.quote("website", 9), /Murakkablik/);
});

test("orders do not become revenue until payment is manually verified", async () => {
  const store = path.join(os.tmpdir(), "ulugbek-business-order-" + Date.now() + ".json");
  const engine = createBusinessEngine({ storePath: store });
  const order = await engine.createOrder({ serviceId: "research", customerName: "Test", contact: "test@example.com", details: "Public market research" });
  assert.equal(engine.finance().revenueCents, 0);
  await engine.reviewOrder(order.id, { status: "accepted" });
  await engine.reviewOrder(order.id, { status: "paid", paymentReference: "bank-ref-123", amountCents: 5000 });
  assert.equal(engine.finance().revenueCents, 5000);
  assert.equal(engine.finance().paidOrders, 1);
  fs.rmSync(store, { force: true });
});

test("invalid customer data and expenses are rejected", async () => {
  const engine = createBusinessEngine({ storePath: path.join(os.tmpdir(), "ulugbek-business-invalid-" + Date.now() + ".json") });
  await assert.rejects(engine.createOrder({ serviceId: "website" }), /majburiy/);
  await assert.rejects(engine.recordExpense({ amountCents: -1, category: "server", note: "x" }), /to'g'ri/);
});
