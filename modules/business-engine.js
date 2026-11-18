"use strict";

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const CATALOG = Object.freeze([
  { id: "website", name: "Veb-sayt yaratish", description: "Biznes, xizmat yoki shaxsiy sayt", basePriceCents: 5000, currency: "USD" },
  { id: "android-app", name: "Android ilova", description: "Oddiy buyurtma yoki ma'lumot ilovasi", basePriceCents: 15000, currency: "USD" },
  { id: "automation", name: "Biznes avtomatlashtirish", description: "Takroriy ishlar va hisobotlarni avtomatlashtirish", basePriceCents: 8000, currency: "USD" },
  { id: "research", name: "Internet tadqiqoti", description: "Ochiq manbalarni tekshirish va hisobot", basePriceCents: 2500, currency: "USD" },
  { id: "translation", name: "Tarjima va hujjat tayyorlash", description: "Matn, tarjima va hujjatlarni tayyorlash", basePriceCents: 1500, currency: "USD" }
]);

function createBusinessEngine(options = {}) {
  const storePath = path.resolve(options.storePath || process.env.BUSINESS_STORE_PATH || path.join(__dirname, "..", "data", "business-ledger.json"));
  let state;
  let writeChain = Promise.resolve();

  function fresh() {
    return { version: 1, orders: [], ledger: [], createdAt: new Date().toISOString() };
  }
  function load() {
    if (state) return state;
    try {
      const parsed = JSON.parse(fs.readFileSync(storePath, "utf8"));
      if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.orders) || !Array.isArray(parsed.ledger)) throw new Error("invalid business store");
      state = parsed;
    } catch (error) {
      if (error.code !== "ENOENT") throw new Error("Biznes hisoboti fayli buzilgan; ma'lumot yo'qolmasligi uchun yozish bloklandi.");
      state = fresh();
    }
    return state;
  }
  function persist() {
    const snapshot = JSON.stringify(state, null, 2);
    writeChain = writeChain.then(() => {
      fs.mkdirSync(path.dirname(storePath), { recursive: true });
      const temp = storePath + ".tmp";
      fs.writeFileSync(temp, snapshot, { mode: 0o600 });
      fs.renameSync(temp, storePath);
    });
    return writeChain;
  }
  function quote(serviceId, complexity = 1) {
    const item = CATALOG.find(service => service.id === String(serviceId));
    const level = Number(complexity);
    if (!item) throw Object.assign(new Error("Xizmat topilmadi."), { status: 404 });
    if (!Number.isInteger(level) || level < 1 || level > 5) throw Object.assign(new Error("Murakkablik 1 dan 5 gacha bo'lishi kerak."), { status: 400 });
    const estimateCents = item.basePriceCents * level;
    return { service: item, complexity: level, estimate: { minCents: Math.round(estimateCents * 0.8), maxCents: Math.round(estimateCents * 1.2), currency: "USD" }, note: "Bu dastlabki taxmin; yakuniy narx va muddat buyurtma ko'rib chiqilgach kelishiladi. To'lov hozircha avtomatik olinmaydi." };
  }
  async function createOrder(input = {}) {
    const serviceId = String(input.serviceId || "");
    const name = String(input.customerName || "").trim().slice(0, 100);
    const contact = String(input.contact || "").trim().slice(0, 180);
    const details = String(input.details || "").trim().slice(0, 3000);
    const level = Number(input.complexity || 1);
    if (!name || !contact || !details) throw Object.assign(new Error("Ism, aloqa va buyurtma tafsilotlari majburiy."), { status: 400 });
    if (!/^[^<>]{3,180}$/.test(contact)) throw Object.assign(new Error("Aloqa ma'lumoti noto'g'ri."), { status: 400 });
    const estimate = quote(serviceId, level);
    const current = load();
    const order = {
      id: crypto.randomUUID(), serviceId, customerName: name, contact, details,
      complexity: level, estimate: estimate.estimate, status: "new",
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      payment: { status: "unpaid", reference: null, verifiedAt: null }
    };
    current.orders.unshift(order);
    current.orders = current.orders.slice(0, 2000);
    await persist();
    return { ...order, note: "Buyurtma qabul qilindi. Administrator narx va muddatni kelishish uchun bog'lanadi." };
  }
  async function reviewOrder(id, input = {}) {
    const current = load();
    const order = current.orders.find(item => item.id === id);
    if (!order) throw Object.assign(new Error("Buyurtma topilmadi."), { status: 404 });
    const allowed = ["reviewing", "accepted", "in_progress", "completed", "cancelled", "paid"];
    if (!allowed.includes(input.status)) throw Object.assign(new Error("Buyurtma holati noto'g'ri."), { status: 400 });
    if (input.status === "paid") {
      const reference = String(input.paymentReference || "").trim().slice(0, 160);
      const amountCents = Number(input.amountCents);
      if (!reference || !Number.isSafeInteger(amountCents) || amountCents < 1 || amountCents > 100000000) {
        throw Object.assign(new Error("To'lovni tasdiqlash uchun to'lov identifikatori va aniq summa kerak."), { status: 400 });
      }
      if (order.payment.status !== "verified") {
        current.ledger.unshift({ id: crypto.randomUUID(), type: "revenue", orderId: id, amountCents, currency: "USD", reference, createdAt: new Date().toISOString(), verifiedBy: "admin-manual" });
        order.payment = { status: "verified", reference, amountCents, verifiedAt: new Date().toISOString() };
      }
    }
    order.status = input.status;
    order.updatedAt = new Date().toISOString();
    await persist();
    return order;
  }
  async function recordExpense(input = {}) {
    const amountCents = Number(input.amountCents);
    const category = String(input.category || "").trim();
    const note = String(input.note || "").trim().slice(0, 500);
    if (!Number.isSafeInteger(amountCents) || amountCents < 1 || amountCents > 100000000 || !["server", "storage", "equipment", "software", "other"].includes(category) || !note) {
      throw Object.assign(new Error("Xarajat summasi, toifasi va izohi to'g'ri kiritilishi kerak."), { status: 400 });
    }
    const entry = { id: crypto.randomUUID(), type: "expense", amountCents, currency: "USD", category, note, createdAt: new Date().toISOString() };
    load().ledger.unshift(entry);
    await persist();
    return entry;
  }
  function finance() {
    const current = load();
    const revenueCents = current.ledger.filter(x => x.type === "revenue").reduce((sum, x) => sum + x.amountCents, 0);
    const expenseCents = current.ledger.filter(x => x.type === "expense").reduce((sum, x) => sum + x.amountCents, 0);
    return {
      currency: "USD", revenueCents, expenseCents, availableCents: revenueCents - expenseCents,
      orderCounts: Object.fromEntries(["new", "reviewing", "accepted", "in_progress", "completed", "cancelled", "paid"].map(status => [status, current.orders.filter(x => x.status === status).length])),
      paidOrders: current.orders.filter(x => x.payment.status === "verified").length,
      paymentIntegration: "manual-verification-only",
      note: "Daromad faqat administrator haqiqiy tushumni tekshirib tasdiqlagandan keyin hisoblanadi. Bu modul mijozdan avtomatik pul olmaydi."
    };
  }
  function listOrders(limit = 100) {
    return load().orders.slice(0, Math.max(1, Math.min(500, Number(limit) || 100)));
  }
  return { catalog: () => CATALOG.map(item => ({ ...item })), quote, createOrder, reviewOrder, recordExpense, finance, listOrders };
}

module.exports = { createBusinessEngine, CATALOG };
