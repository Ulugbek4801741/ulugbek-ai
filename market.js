"use strict";
const express = require("express");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const router = express.Router();
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "data");
const STORE_PATH = process.env.MARKET_STORE_PATH || path.join(DATA_DIR, "paper-market.json");
const TOTAL_SHARES = 2000000;
const DEMO_PRICE = 1;

function freshState() {
  return { mode: "paper-trading-demo", currency: "USD", totalShares: TOTAL_SHARES, treasuryShares: TOTAL_SHARES, issuedShares: 0, orders: [], audit: [], errors: [] };
}
function readState() {
  try {
    const parsed = JSON.parse(fs.readFileSync(STORE_PATH, "utf8"));
    if (parsed.mode !== "paper-trading-demo" || parsed.totalShares !== TOTAL_SHARES || !Array.isArray(parsed.orders) || !Array.isArray(parsed.audit)) throw new Error("invalid market state");
    return parsed;
  } catch (error) {
    if (error.code !== "ENOENT") {
      const state = freshState();
      state.errors.push({ at: new Date().toISOString(), message: "Saqlangan demo bozor ma’lumoti buzilgan; yangi demo holati yaratildi." });
      return state;
    }
    return freshState();
  }
}
let state = readState();
function persist() {
  fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true });
  const temp = STORE_PATH + ".tmp";
  fs.writeFileSync(temp, JSON.stringify(state, null, 2), { mode: 0o600 });
  fs.renameSync(temp, STORE_PATH);
}
function audit(action, details) {
  state.audit.unshift({ id: crypto.randomUUID(), at: new Date().toISOString(), action, details });
  state.audit = state.audit.slice(0, 200);
}
function fail(res, status, error) { return res.status(status).json({ ok: false, error }); }

router.get("/summary", (_req, res) => {
  res.set("Cache-Control", "no-store");
  res.json({ ok: true, mode: state.mode, currency: state.currency, totalShares: state.totalShares, treasuryShares: state.treasuryShares, issuedShares: state.issuedShares, pendingOrders: state.orders.filter(x => x.status === "pending").length, approvedOrders: state.orders.filter(x => x.status === "approved").length, rejectedOrders: state.orders.filter(x => x.status === "rejected").length, auditCount: state.audit.length, errorCount: state.errors.length, demoPrice: DEMO_PRICE, realTradingEnabled: false });
});
router.get("/orders", (_req, res) => {
  res.set("Cache-Control", "no-store");
  res.json({ ok: true, orders: state.orders.slice(0, 100), audit: state.audit.slice(0, 50), errors: state.errors.slice(0, 50) });
});
router.post("/orders", (req, res) => {
  const side = req.body?.side;
  const quantity = Number(req.body?.quantity);
  const price = Number(req.body?.price ?? DEMO_PRICE);
  if (!["buy", "sell"].includes(side)) return fail(res, 400, "Buyurtma turi buy yoki sell bo‘lishi kerak.");
  if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > TOTAL_SHARES) return fail(res, 400, "Aksiya soni 1 dan 2 000 000 gacha butun son bo‘lishi kerak.");
  if (!Number.isFinite(price) || price <= 0 || price > 1000000) return fail(res, 400, "Demo narx 0 dan katta va 1 000 000 dan oshmasligi kerak.");
  if (side === "buy" && quantity > state.treasuryShares) return fail(res, 409, "Demo zaxirada buncha aksiya qolmagan.");
  const order = { id: crypto.randomUUID(), side, quantity, price, status: "pending", createdAt: new Date().toISOString(), reviewedAt: null, note: "Faqat demo hisob; haqiqiy qimmatli qog‘oz emas." };
  state.orders.unshift(order); audit("order_created", { id: order.id, side, quantity, price }); persist();
  res.status(201).json({ ok: true, order });
});
router.post("/orders/:id/review", (req, res) => {
  const order = state.orders.find(x => x.id === req.params.id);
  if (!order) return fail(res, 404, "Buyurtma topilmadi.");
  if (order.status !== "pending") return fail(res, 409, "Buyurtma oldin ko‘rib chiqilgan.");
  const decision = req.body?.decision;
  if (!["approved", "rejected"].includes(decision)) return fail(res, 400, "Qaror approved yoki rejected bo‘lishi kerak.");
  if (decision === "approved") {
    if (order.side === "buy") {
      if (order.quantity > state.treasuryShares) return fail(res, 409, "Demo aksiya zaxirasi yetarli emas.");
      state.treasuryShares -= order.quantity; state.issuedShares += order.quantity;
    } else {
      if (order.quantity > state.issuedShares) return fail(res, 409, "Demo sotish uchun chiqarilgan aksiya yetarli emas.");
      state.issuedShares -= order.quantity; state.treasuryShares += order.quantity;
    }
  }
  order.status = decision; order.reviewedAt = new Date().toISOString();
  audit("order_" + decision, { id: order.id, side: order.side, quantity: order.quantity }); persist();
  res.json({ ok: true, order, summary: { treasuryShares: state.treasuryShares, issuedShares: state.issuedShares } });
});
router.get("/health", (_req, res) => res.json({ ok: true, mode: state.mode, persistence: "json-file", realTradingEnabled: false }));
module.exports = router;
