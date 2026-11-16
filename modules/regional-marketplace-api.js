"use strict";

const express = require("express");
const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");
const rateLimit = require("express-rate-limit");

const router = express.Router();
const root = path.resolve(process.env.ULUGBEK_DATA_DIR || path.join(__dirname, "..", "data"), "regional-marketplace");
const productsFile = path.join(root, "products.json");
const requestsFile = path.join(root, "requests.json");
const ordersFile = path.join(root, "orders.json");
let writeQueue = Promise.resolve();

async function readList(file) {
  try {
    const value = JSON.parse(await fs.readFile(file, "utf8"));
    return Array.isArray(value) ? value : [];
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}
function mutateList(file, mutate) {
  const operation = writeQueue.then(async () => {
    await fs.mkdir(root, { recursive: true });
    const list = await readList(file);
    const result = await mutate(list);
    const temporary = file + "." + crypto.randomUUID() + ".tmp";
    await fs.writeFile(temporary, JSON.stringify(list), { encoding: "utf8", mode: 0o600 });
    await fs.rename(temporary, file);
    return result;
  });
  writeQueue = operation.catch(() => {});
  return operation;
}
function clean(value, max = 180) {
  return String(value ?? "").replace(/[<>]/g, "").trim().slice(0, max);
}
function phone(value) {
  return String(value ?? "").replace(/[^\d+]/g, "").slice(0, 20);
}
function fail(res, status, message) {
  return res.status(status).json({ ok: false, error: message });
}
const createLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 12,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { ok: false, error: "E’lon va buyurtma limiti tugadi. 15 daqiqadan keyin qayta urinib ko‘ring." }
});

router.get("/status", (_req, res) => {
  res.set("Cache-Control", "no-store");
  res.json({
    ok: true,
    service: "regional-marketplace",
    version: "0.1.0",
    storage: "server-json",
    persistence: process.env.ULUGBEK_DATA_DIR ? "configured-data-directory" : "local-filesystem-may-reset-on-redeploy",
    payments: "cash-or-card-on-delivery-agreement-only",
    sellerVerification: "not-yet-enabled"
  });
});

router.get("/products", async (req, res) => {
  try {
    const region = clean(req.query.region, 80).toLocaleLowerCase("uz-UZ");
    const district = clean(req.query.district, 80).toLocaleLowerCase("uz-UZ");
    const category = clean(req.query.category, 60).toLocaleLowerCase("uz-UZ");
    const query = clean(req.query.q, 100).toLocaleLowerCase("uz-UZ");
    const freeDelivery = req.query.freeDelivery === "true";
    const sort = clean(req.query.sort, 20);
    let items = await readList(productsFile);
    items = items.filter(item => item.status === "active");
    if (region && region !== "barcha hududlar") items = items.filter(item => String(item.region).toLocaleLowerCase("uz-UZ") === region);
    if (district) items = items.filter(item => String(item.district).toLocaleLowerCase("uz-UZ").includes(district));
    if (category && category !== "barchasi") items = items.filter(item => String(item.category).toLocaleLowerCase("uz-UZ") === category);
    if (query) items = items.filter(item => [item.name, item.description, item.category, item.sellerName, item.region, item.district].join(" ").toLocaleLowerCase("uz-UZ").includes(query));
    if (freeDelivery) items = items.filter(item => item.freeDelivery === true);
    if (sort === "price-asc") items.sort((a, b) => a.price - b.price);
    else if (sort === "price-desc") items.sort((a, b) => b.price - a.price);
    else items.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    res.set("Cache-Control", "no-store");
    res.json({ ok: true, total: items.length, products: items.slice(0, 100) });
  } catch (_) {
    fail(res, 503, "Mahsulotlar katalogini serverdan o‘qib bo‘lmadi.");
  }
});

router.get("/top-sellers", async (_req, res) => {
  try {
    const products = await readList(productsFile);
    const sellers = new Map();
    for (const item of products.filter(value => value.status === "active")) {
      const key = phone(item.sellerPhone);
      if (!key) continue;
      const current = sellers.get(key) || { name: item.sellerName, phone: key, region: item.region, district: item.district, listings: 0 };
      current.listings += 1;
      sellers.set(key, current);
    }
    res.json({ ok: true, sellers: [...sellers.values()].sort((a, b) => b.listings - a.listings).slice(0, 20) });
  } catch (_) {
    fail(res, 503, "Sotuvchilar ro‘yxatini serverdan o‘qib bo‘lmadi.");
  }
});

router.post("/products", createLimit, async (req, res) => {
  const body = req.body || {};
  const name = clean(body.name, 100);
  const price = Number(body.price);
  const sellerName = clean(body.sellerName, 80);
  const sellerPhone = phone(body.sellerPhone);
  const region = clean(body.region, 80);
  const district = clean(body.district, 80);
  const category = clean(body.category, 60);
  const imageData = typeof body.imageData === "string" ? body.imageData : "";
  if (name.length < 2 || !Number.isFinite(price) || price < 0 || price > 100000000000 ||
      sellerName.length < 2 || sellerPhone.replace(/\D/g, "").length < 9 ||
      !region || !district || !category) {
    return fail(res, 400, "Mahsulot, narx, sotuvchi, telefon, viloyat, tuman va toifa ma’lumotlarini to‘liq kiriting.");
  }
  if (imageData && (!/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(imageData) || imageData.length > 80000)) {
    return fail(res, 400, "Rasm JPG, PNG yoki WEBP bo‘lishi va 60 KB dan oshmasligi kerak.");
  }
  const product = {
    id: crypto.randomUUID(),
    name, price: Math.round(price), description: clean(body.description, 700),
    category, region, district, city: clean(body.city, 80),
    sellerName, sellerPhone, imageData,
    freeDelivery: body.freeDelivery === true,
    discountPrice: Number.isFinite(Number(body.discountPrice)) && Number(body.discountPrice) > 0 && Number(body.discountPrice) < price ? Math.round(Number(body.discountPrice)) : null,
    soldCount: 0, status: "active", verified: false,
    createdAt: new Date().toISOString()
  };
  try {
    await mutateList(productsFile, list => list.unshift(product));
    res.status(201).json({ ok: true, product });
  } catch (_) {
    fail(res, 503, "Mahsulot serverga saqlanmadi. Server xotirasi yoki diskini tekshirish kerak.");
  }
});

router.post("/requests", createLimit, async (req, res) => {
  const body = req.body || {};
  const request = {
    id: crypto.randomUUID(),
    title: clean(body.title, 100), description: clean(body.description, 700),
    customerName: clean(body.customerName, 80), phone: phone(body.phone),
    region: clean(body.region, 80), district: clean(body.district, 80),
    budget: Math.max(0, Math.min(100000000000, Number(body.budget) || 0)),
    status: "open", createdAt: new Date().toISOString()
  };
  if (request.title.length < 3 || request.customerName.length < 2 ||
      request.phone.replace(/\D/g, "").length < 9 || !request.region || !request.district) {
    return fail(res, 400, "So‘rov sarlavhasi, ism, telefon, viloyat va tumanni kiriting.");
  }
  try {
    await mutateList(requestsFile, list => list.unshift(request));
    res.status(201).json({ ok: true, request: { id: request.id, status: request.status, createdAt: request.createdAt } });
  } catch (_) {
    fail(res, 503, "Xarid so‘rovi serverga saqlanmadi.");
  }
});

router.post("/orders", createLimit, async (req, res) => {
  const body = req.body || {};
  const productId = clean(body.productId, 80);
  const buyerName = clean(body.buyerName, 80);
  const buyerPhone = phone(body.buyerPhone);
  const address = clean(body.address, 240);
  const quantity = Math.max(1, Math.min(99, Number(body.quantity) || 1));
  const paymentMethod = ["cash_on_delivery", "card_on_delivery"].includes(body.paymentMethod) ? body.paymentMethod : "cash_on_delivery";
  try {
    const products = await readList(productsFile);
    const product = products.find(item => item.id === productId && item.status === "active");
    if (!product) return fail(res, 404, "Mahsulot topilmadi yoki sotuvda emas.");
    if (buyerName.length < 2 || buyerPhone.replace(/\D/g, "").length < 9 || address.length < 5) {
      return fail(res, 400, "Ism, telefon va yetkazish manzilini to‘liq kiriting.");
    }
    const order = {
      id: crypto.randomUUID(), productId, productName: product.name,
      sellerPhone: product.sellerPhone, buyerName, buyerPhone, address,
      quantity, unitPrice: product.discountPrice || product.price,
      total: (product.discountPrice || product.price) * quantity,
      paymentMethod, status: "new", createdAt: new Date().toISOString()
    };
    await mutateList(ordersFile, list => list.unshift(order));
    await mutateList(productsFile, list => {
      const item = list.find(value => value.id === productId);
      if (item) item.soldCount = Number(item.soldCount || 0) + quantity;
    });
    res.status(201).json({ ok: true, order: { id: order.id, status: order.status, total: order.total, paymentMethod } });
  } catch (_) {
    fail(res, 503, "Buyurtma serverga saqlanmadi.");
  }
});

module.exports = router;
