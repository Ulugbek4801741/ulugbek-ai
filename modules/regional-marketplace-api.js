"use strict";
const express = require("express");
const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");
const rateLimit = require("express-rate-limit");

const router = express.Router();
const root = path.resolve(process.env.ULUGBEK_DATA_DIR || path.join(__dirname, "..", "data"), "regional-marketplace");
const files = {
  products: path.join(root, "products.json"),
  requests: path.join(root, "requests.json"),
  orders: path.join(root, "orders.json"),
  sellers: path.join(root, "sellers.json"),
  messages: path.join(root, "messages.json")
};
let writeQueue = Promise.resolve();
let assistant = null;
let adminGuard = null;
function setAdminGuard(fn) { adminGuard = typeof fn === "function" ? fn : null; }
function adminOnly(req, res, next) {
  if (!adminGuard) return fail(res, 503, "Administrator himoyasi hali ulanmagan.");
  return adminGuard(req, res, next);
}

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
function hash(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}
function sameHash(a, b) {
  if (!a || !b) return false;
  const left = Buffer.from(a, "hex"), right = Buffer.from(b, "hex");
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}
function tokenFrom(req) {
  const value = String(req.get("authorization") || "");
  return value.startsWith("Bearer ") ? value.slice(7).trim() : "";
}
function fail(res, status, message) {
  return res.status(status).json({ ok: false, error: message });
}
function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(value || ""));
}
const createLimit = rateLimit({
  windowMs: 15 * 60 * 1000, limit: 12, standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { ok: false, error: "E’lon va buyurtma limiti tugadi. 15 daqiqadan keyin qayta urinib ko‘ring." }
});
function setAssistant(fn) { assistant = typeof fn === "function" ? fn : null; }

async function sendBuyerConfirmation(order) {
  const apiKey = process.env.RESEND_API_KEY || "";
  const from = process.env.MARKETPLACE_EMAIL_FROM || process.env.EMAIL_FROM || "";
  if (!apiKey || !from || !order.buyerEmail) return { status: "not_configured" };
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": "Bearer " + apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        from, to: [order.buyerEmail],
        subject: "Buyurtmangiz sotuvchi tomonidan tasdiqlandi",
        html: "<h2>Buyurtma tasdiqlandi</h2><p>Assalomu alaykum, " + escapeHtml(order.buyerName) + ".</p><p><b>" + escapeHtml(order.productName) + "</b> buyurtmangiz sotuvchi tomonidan qabul qilindi.</p><p>Buyurtma raqami: " + escapeHtml(order.id) + "</p><p>Jami: " + Number(order.total).toLocaleString("uz-UZ") + " so‘m</p><p>Yetkazish manzili: " + escapeHtml(order.address) + "</p><p>To‘lov: mahsulotni olganda, sotuvchi bilan kelishilgan usulda.</p><p>ULUGBEK AI — Regional Onlayn Do‘kon</p>"
      })
    });
    if (!response.ok) return { status: "failed", detail: "Email provayderi " + response.status + " qaytardi." };
    return { status: "sent" };
  } catch (_) {
    return { status: "failed", detail: "Email provayderiga ulanib bo‘lmadi." };
  }
}
function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
}
async function sellerByToken(token) {
  if (!token || token.length < 32) return null;
  const sellers = await readList(files.sellers);
  return sellers.find(item => sameHash(item.tokenHash, hash(token))) || null;
}
async function orderAccess(orderId, req) {
  const token = tokenFrom(req);
  if (!token) return null;
  const orders = await readList(files.orders);
  const order = orders.find(item => item.id === orderId);
  if (!order) return null;
  if (sameHash(order.buyerTokenHash, hash(token))) return { order, role: "buyer" };
  const seller = await sellerByToken(token);
  if (seller && seller.phone === order.sellerPhone) return { order, role: "seller", seller };
  return null;
}

router.setAssistant = setAssistant;
router.setAdminGuard = setAdminGuard;
router.get("/status", (_req, res) => {
  res.set("Cache-Control", "no-store");
  res.json({
    ok: true, service: "regional-marketplace", version: "0.2.0",
    storage: "server-json",
    persistence: process.env.ULUGBEK_DATA_DIR ? "configured-data-directory" : "local-filesystem-may-reset-on-redeploy",
    payments: "cash-or-card-on-delivery-agreement-only",
    sellerAuthentication: "private-seller-access-token",
    sellerIdentityVerification: "not-yet-enabled",
    emailDelivery: process.env.RESEND_API_KEY && (process.env.MARKETPLACE_EMAIL_FROM || process.env.EMAIL_FROM) ? "configured" : "not-configured",
    aiMediator: assistant ? "connected-to-ulugbek-universal-agent" : "not-connected"
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
    let items = await readList(files.products);
    items = items.filter(item => item.status === "active");
    if (region && region !== "barcha hududlar") items = items.filter(item => String(item.region).toLocaleLowerCase("uz-UZ") === region);
    if (district) items = items.filter(item => String(item.district).toLocaleLowerCase("uz-UZ").includes(district));
    if (category && category !== "barchasi") items = items.filter(item => String(item.category).toLocaleLowerCase("uz-UZ") === category);
    if (query) items = items.filter(item => [item.name, item.description, item.category, item.sellerName, item.region, item.district].join(" ").toLocaleLowerCase("uz-UZ").includes(query));
    if (freeDelivery) items = items.filter(item => item.freeDelivery === true);
    if (sort === "price-asc") items.sort((a, b) => a.price - b.price);
    else if (sort === "price-desc") items.sort((a, b) => b.price - a.price);
    else items.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    res.set("Cache-Control", "no-store").json({ ok: true, total: items.length, products: items.slice(0, 100) });
  } catch (_) { fail(res, 503, "Mahsulotlar katalogini serverdan o‘qib bo‘lmadi."); }
});

router.get("/top-sellers", async (_req, res) => {
  try {
    const products = await readList(files.products), sellers = new Map();
    for (const item of products.filter(value => value.status === "active")) {
      const key = phone(item.sellerPhone);
      if (!key) continue;
      const current = sellers.get(key) || { name: item.sellerName, phone: key, region: item.region, district: item.district, listings: 0, verified: false };
      current.listings += 1; sellers.set(key, current);
    }
    res.json({ ok: true, sellers: [...sellers.values()].sort((a, b) => b.listings - a.listings).slice(0, 20) });
  } catch (_) { fail(res, 503, "Sotuvchilar ro‘yxatini serverdan o‘qib bo‘lmadi."); }
});

router.post("/products", createLimit, async (req, res) => {
  const body = req.body || {};
  const name = clean(body.name, 100), price = Number(body.price);
  const sellerName = clean(body.sellerName, 80), sellerPhone = phone(body.sellerPhone);
  const region = clean(body.region, 80), district = clean(body.district, 80), category = clean(body.category, 60);
  const imageData = typeof body.imageData === "string" ? body.imageData : "";
  const sellerAccessToken = String(body.sellerAccessToken || "");
  if (name.length < 2 || !Number.isFinite(price) || price < 0 || price > 100000000000 ||
      sellerName.length < 2 || sellerPhone.replace(/\D/g, "").length < 9 ||
      !region || !district || !category || sellerAccessToken.length < 32) {
    return fail(res, 400, "Mahsulot va sotuvchi ma’lumotlarini to‘liq kiriting. Sotuvchi kabinet kaliti ham kerak.");
  }
  if (imageData && (!/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(imageData) || imageData.length > 80000)) {
    return fail(res, 400, "Rasm JPG, PNG yoki WEBP bo‘lishi va 60 KB dan oshmasligi kerak.");
  }
  try {
    const existing = await readList(files.sellers);
    let seller = existing.find(item => item.phone === sellerPhone);
    if (seller && !sameHash(seller.tokenHash, hash(sellerAccessToken))) return fail(res, 409, "Bu telefon raqami uchun boshqa sotuvchi kabinet kaliti ro‘yxatdan o‘tgan. Avvalgi qurilmadagi maxfiy kalitni kiriting.");
    if (!seller) {
      seller = { id: crypto.randomUUID(), phone: sellerPhone, name: sellerName, tokenHash: hash(sellerAccessToken), createdAt: new Date().toISOString(), verified: false };
      await mutateList(files.sellers, list => list.push(seller));
    }
    const product = {
      id: crypto.randomUUID(), name, price: Math.round(price), description: clean(body.description, 700),
      category, region, district, city: clean(body.city, 80), sellerName, sellerPhone, imageData,
      freeDelivery: body.freeDelivery === true,
      discountPrice: Number.isFinite(Number(body.discountPrice)) && Number(body.discountPrice) > 0 && Number(body.discountPrice) < price ? Math.round(Number(body.discountPrice)) : null,
      soldCount: 0, status: "active", verified: false, createdAt: new Date().toISOString()
    };
    await mutateList(files.products, list => list.unshift(product));
    res.status(201).json({ ok: true, product: { ...product, imageData: undefined }, sellerAccount: "created-or-reused" });
  } catch (_) { fail(res, 503, "Mahsulot serverga saqlanmadi. Server xotirasi yoki diskini tekshirish kerak."); }
});

router.post("/requests", createLimit, async (req, res) => {
  const body = req.body || {};
  const request = {
    id: crypto.randomUUID(), title: clean(body.title, 100), description: clean(body.description, 700),
    customerName: clean(body.customerName, 80), phone: phone(body.phone),
    region: clean(body.region, 80), district: clean(body.district, 80),
    budget: Math.max(0, Math.min(100000000000, Number(body.budget) || 0)),
    status: "open", createdAt: new Date().toISOString()
  };
  if (request.title.length < 3 || request.customerName.length < 2 || request.phone.replace(/\D/g, "").length < 9 || !request.region || !request.district) {
    return fail(res, 400, "So‘rov sarlavhasi, ism, telefon, viloyat va tumanni kiriting.");
  }
  try {
    await mutateList(files.requests, list => list.unshift(request));
    res.status(201).json({ ok: true, request: { id: request.id, status: request.status, createdAt: request.createdAt } });
  } catch (_) { fail(res, 503, "Xarid so‘rovi serverga saqlanmadi."); }
});

router.post("/orders", createLimit, async (req, res) => {
  const body = req.body || {};
  const productId = clean(body.productId, 80), buyerName = clean(body.buyerName, 80);
  const buyerPhone = phone(body.buyerPhone), buyerEmail = clean(body.buyerEmail, 160).toLowerCase();
  const address = clean(body.address, 240), quantity = Math.max(1, Math.min(99, Number(body.quantity) || 1));
  const paymentMethod = ["cash_on_delivery", "card_on_delivery"].includes(body.paymentMethod) ? body.paymentMethod : "cash_on_delivery";
  if (!validEmail(buyerEmail)) return fail(res, 400, "Buyurtma tasdiq xatini olish uchun to‘g‘ri email kiriting.");
  try {
    const products = await readList(files.products);
    const product = products.find(item => item.id === productId && item.status === "active");
    if (!product) return fail(res, 404, "Mahsulot topilmadi yoki sotuvda emas.");
    if (buyerName.length < 2 || buyerPhone.replace(/\D/g, "").length < 9 || address.length < 5) return fail(res, 400, "Ism, telefon va yetkazish manzilini to‘liq kiriting.");
    const buyerAccessToken = crypto.randomBytes(32).toString("hex");
    const order = {
      id: crypto.randomUUID(), productId, productName: product.name, sellerPhone: product.sellerPhone,
      buyerName, buyerPhone, buyerEmail, buyerTokenHash: hash(buyerAccessToken), address, quantity,
      unitPrice: product.discountPrice || product.price, total: (product.discountPrice || product.price) * quantity,
      paymentMethod, status: "awaiting_seller", emailStatus: "waiting_for_seller", createdAt: new Date().toISOString()
    };
    await mutateList(files.orders, list => list.unshift(order));
    res.status(201).json({ ok: true, order: { id: order.id, status: order.status, total: order.total, paymentMethod }, buyerAccessToken });
  } catch (_) { fail(res, 503, "Buyurtma serverga saqlanmadi."); }
});

router.get("/seller/orders", async (req, res) => {
  try {
    const seller = await sellerByToken(tokenFrom(req));
    if (!seller) return fail(res, 401, "Sotuvchi kabinet kaliti noto‘g‘ri yoki yo‘q.");
    const orders = await readList(files.orders), products = await readList(files.products);
    const ownProductIds = new Set(products.filter(p => p.sellerPhone === seller.phone).map(p => p.id));
    const result = orders.filter(o => ownProductIds.has(o.productId)).map(({ buyerTokenHash, buyerEmail, ...o }) => o);
    res.set("Cache-Control", "no-store").json({ ok: true, orders: result });
  } catch (_) { fail(res, 503, "Sotuvchi buyurtmalarini o‘qib bo‘lmadi."); }
});

router.post("/orders/:id/decision", async (req, res) => {
  const seller = await sellerByToken(tokenFrom(req));
  if (!seller) return fail(res, 401, "Sotuvchi kabinet kaliti noto‘g‘ri yoki yo‘q.");
  const decision = req.body?.decision;
  if (!["accept", "reject"].includes(decision)) return fail(res, 400, "Qaror accept yoki reject bo‘lishi kerak.");
  try {
    const result = await mutateList(files.orders, list => {
      const item = list.find(value => value.id === req.params.id);
      if (!item) return { error: "not-found" };
      if (item.sellerPhone !== seller.phone) return { error: "forbidden" };
      if (item.status !== "awaiting_seller") return { error: "already-decided" };
      item.status = decision === "accept" ? "confirmed" : "rejected";
      item.sellerDecisionAt = new Date().toISOString();
      item.emailStatus = decision === "accept" ? "sending" : "not_sent";
      return { order: { ...item } };
    });
    if (result.error === "not-found") return fail(res, 404, "Buyurtma topilmadi.");
    if (result.error === "forbidden") return fail(res, 403, "Bu buyurtma sizning do‘koningizga tegishli emas.");
    if (result.error === "already-decided") return fail(res, 409, "Bu buyurtma bo‘yicha qaror avval berilgan.");
    if (decision === "reject") return res.json({ ok: true, status: "rejected", emailStatus: "not_sent" });
    const delivery = await sendBuyerConfirmation(result.order);
    await mutateList(files.orders, list => {
      const item = list.find(value => value.id === req.params.id);
      if (item) {
        item.emailStatus = delivery.status;
        if (delivery.detail) item.emailError = delivery.detail;
        if (delivery.status === "sent") item.emailSentAt = new Date().toISOString();
      }
    });
    return res.json({ ok: true, status: "confirmed", emailStatus: delivery.status, emailDetail: delivery.detail || null });
  } catch (_) { return fail(res, 503, "Buyurtma qarori saqlanmadi."); }
});

router.post("/orders/:id/email", async (req, res) => {
  const seller = await sellerByToken(tokenFrom(req));
  if (!seller) return fail(res, 401, "Sotuvchi kabinet kaliti noto‘g‘ri yoki yo‘q.");
  try {
    const order = (await readList(files.orders)).find(item => item.id === req.params.id);
    if (!order) return fail(res, 404, "Buyurtma topilmadi.");
    if (order.sellerPhone !== seller.phone) return fail(res, 403, "Bu buyurtma sizning do‘koningizga tegishli emas.");
    if (order.status !== "confirmed") return fail(res, 409, "Email faqat sotuvchi tasdiqlagan buyurtmaga yuboriladi.");
    const delivery = await sendBuyerConfirmation(order);
    await mutateList(files.orders, list => {
      const item = list.find(value => value.id === req.params.id);
      item.emailStatus = delivery.status; if (delivery.detail) item.emailError = delivery.detail;
      if (delivery.status === "sent") item.emailSentAt = new Date().toISOString();
    });
    return res.json({ ok: true, emailStatus: delivery.status, emailDetail: delivery.detail || null });
  } catch (_) { return fail(res, 503, "Email yuborish holatini yangilab bo‘lmadi."); }
});

router.get("/orders/:id/messages", async (req, res) => {
  const access = await orderAccess(req.params.id, req);
  if (!access) return fail(res, 403, "Bu suhbatga kirish ruxsati yo‘q.");
  const messages = await readList(files.messages);
  res.set("Cache-Control", "no-store").json({
    ok: true, role: access.role,
    order: { id: access.order.id, productName: access.order.productName, status: access.order.status, total: access.order.total },
    messages: messages.filter(m => m.orderId === req.params.id).slice(-80)
  });
});

router.post("/orders/:id/messages", async (req, res) => {
  const access = await orderAccess(req.params.id, req);
  if (!access) return fail(res, 403, "Bu suhbatga xabar yuborish ruxsati yo‘q.");
  const message = clean(req.body?.message, 1200);
  if (message.length < 1) return fail(res, 400, "Xabar bo‘sh bo‘lmasligi kerak.");
  const entry = { id: crypto.randomUUID(), orderId: req.params.id, role: access.role, sender: access.role === "buyer" ? "Xaridor" : "Sotuvchi", message, createdAt: new Date().toISOString() };
  try {
    await mutateList(files.messages, list => list.push(entry));
    let assistantReply = null;
    if (assistant) {
      try {
        assistantReply = await assistant({
          message,
          senderRole: access.role,
          order: { productName: access.order.productName, total: access.order.total, status: access.order.status, paymentMethod: access.order.paymentMethod },
          recentMessages: (await readList(files.messages)).filter(m => m.orderId === req.params.id).slice(-12)
        });
      } catch (_) {}
    }
    if (assistantReply) {
      const aiEntry = { id: crypto.randomUUID(), orderId: req.params.id, role: "assistant", sender: "ULUGBEK AI yordamchisi", message: clean(assistantReply, 1800), createdAt: new Date().toISOString() };
      await mutateList(files.messages, list => list.push(aiEntry));
      return res.status(201).json({ ok: true, message: entry, assistant: aiEntry });
    }
    return res.status(201).json({ ok: true, message: entry, assistant: null, assistantAvailable: Boolean(assistant) });
  } catch (_) { return fail(res, 503, "Xabar suhbatga saqlanmadi."); }
});


// Administrator biznes boshqaruvi. Maxfiy seller/buyer tokenlari hech qachon qaytarilmaydi.
router.get("/admin/overview", adminOnly, async (_req, res) => {
  try {
    const [products, sellers, orders, requests] = await Promise.all([
      readList(files.products), readList(files.sellers), readList(files.orders), readList(files.requests)
    ]);
    const confirmed = orders.filter(item => item.status === "confirmed" || item.status === "completed");
    res.set("Cache-Control", "no-store").json({
      ok: true,
      counts: {
        products: products.length, activeProducts: products.filter(item => item.status === "active").length,
        sellers: sellers.length, verifiedSellers: sellers.filter(item => item.verified === true).length,
        orders: orders.length, waitingSeller: orders.filter(item => item.status === "awaiting_seller").length,
        confirmedOrders: confirmed.length, completedOrders: orders.filter(item => item.status === "completed").length,
        requests: requests.length, openRequests: requests.filter(item => item.status === "open").length
      },
      orderValue: confirmed.reduce((sum, item) => sum + (Number(item.total) || 0), 0),
      moneyStatus: "unverified-cash-or-card-on-delivery",
      paymentNote: "Bu buyurtma qiymati; bankka pul tushgani yoki platforma daromadi emas. To‘lov provayderi ulangan emas."
    });
  } catch (_) { fail(res, 503, "Biznes ko‘rsatkichlarini o‘qib bo‘lmadi."); }
});
router.get("/admin/sellers", adminOnly, async (_req, res) => {
  try {
    const sellers = await readList(files.sellers);
    res.set("Cache-Control", "no-store").json({ ok: true, sellers: sellers.map(({ tokenHash, ...seller }) => seller) });
  } catch (_) { fail(res, 503, "Sotuvchilar ro‘yxati o‘qilmadi."); }
});
router.get("/admin/products", adminOnly, async (_req, res) => {
  try {
    const products = await readList(files.products);
    res.set("Cache-Control", "no-store").json({ ok: true, products: products.map(({ imageData, ...product }) => product) });
  } catch (_) { fail(res, 503, "Mahsulotlar ro‘yxati o‘qilmadi."); }
});
router.get("/admin/orders", adminOnly, async (_req, res) => {
  try {
    const orders = await readList(files.orders);
    res.set("Cache-Control", "no-store").json({ ok: true, orders: orders.map(({ buyerTokenHash, ...order }) => order) });
  } catch (_) { fail(res, 503, "Buyurtmalar ro‘yxati o‘qilmadi."); }
});
router.get("/admin/requests", adminOnly, async (_req, res) => {
  try {
    res.set("Cache-Control", "no-store").json({ ok: true, requests: await readList(files.requests) });
  } catch (_) { fail(res, 503, "Xaridor so‘rovlari o‘qilmadi."); }
});
router.post("/admin/sellers/:id/verification", adminOnly, async (req, res) => {
  if (typeof req.body?.verified !== "boolean") return fail(res, 400, "verified qiymati true yoki false bo‘lishi kerak.");
  try {
    const result = await mutateList(files.sellers, list => {
      const seller = list.find(item => item.id === req.params.id);
      if (!seller) return null;
      seller.verified = req.body.verified;
      seller.adminReviewedAt = new Date().toISOString();
      return { id: seller.id, verified: seller.verified };
    });
    if (!result) return fail(res, 404, "Sotuvchi topilmadi.");
    res.set("Cache-Control", "no-store").json({ ok: true, seller: result });
  } catch (_) { fail(res, 503, "Sotuvchi tasdiqlash holati saqlanmadi."); }
});
router.post("/admin/products/:id/status", adminOnly, async (req, res) => {
  const status = clean(req.body?.status, 20);
  if (!["active", "paused", "rejected"].includes(status)) return fail(res, 400, "Mahsulot holati active, paused yoki rejected bo‘lishi kerak.");
  try {
    const result = await mutateList(files.products, list => {
      const product = list.find(item => item.id === req.params.id);
      if (!product) return null;
      product.status = status;
      product.adminReviewedAt = new Date().toISOString();
      return { id: product.id, status: product.status };
    });
    if (!result) return fail(res, 404, "Mahsulot topilmadi.");
    res.set("Cache-Control", "no-store").json({ ok: true, product: result });
  } catch (_) { fail(res, 503, "Mahsulot holati saqlanmadi."); }
});
router.post("/admin/orders/:id/status", adminOnly, async (req, res) => {
  const status = clean(req.body?.status, 20);
  if (!["completed", "cancelled"].includes(status)) return fail(res, 400, "Buyurtma holati completed yoki cancelled bo‘lishi kerak.");
  try {
    const result = await mutateList(files.orders, list => {
      const order = list.find(item => item.id === req.params.id);
      if (!order) return { error: "not-found" };
      if (["completed", "cancelled", "rejected"].includes(order.status)) return { error: "final" };
      if (status === "completed" && order.status !== "confirmed") return { error: "not-confirmed" };
      order.status = status;
      order.adminUpdatedAt = new Date().toISOString();
      return { id: order.id, status: order.status };
    });
    if (result?.error === "not-found") return fail(res, 404, "Buyurtma topilmadi.");
    if (result?.error === "final") return fail(res, 409, "Yakunlangan buyurtma holatini qayta o‘zgartirib bo‘lmaydi.");
    if (result?.error === "not-confirmed") return fail(res, 409, "Buyurtma avval sotuvchi tomonidan tasdiqlanishi kerak.");
    res.set("Cache-Control", "no-store").json({ ok: true, order: result });
  } catch (_) { fail(res, 503, "Buyurtma holati saqlanmadi."); }
});
router.post("/admin/requests/:id/status", adminOnly, async (req, res) => {
  const status = clean(req.body?.status, 20);
  if (!["open", "in_progress", "closed", "rejected"].includes(status)) return fail(res, 400, "So‘rov holati noto‘g‘ri.");
  try {
    const result = await mutateList(files.requests, list => {
      const item = list.find(value => value.id === req.params.id);
      if (!item) return null;
      item.status = status;
      item.adminReviewedAt = new Date().toISOString();
      return { id: item.id, status: item.status };
    });
    if (!result) return fail(res, 404, "Xaridor so‘rovi topilmadi.");
    res.set("Cache-Control", "no-store").json({ ok: true, request: result });
  } catch (_) { fail(res, 503, "Xaridor so‘rovi holati saqlanmadi."); }
});

module.exports = router;
