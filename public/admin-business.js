"use strict";
(() => {
  const $ = id => document.getElementById(id);
  async function api(path, options = {}) {
    const response = await fetch(path, { ...options, credentials: "same-origin", cache: "no-store", headers: { "Content-Type": "application/json", ...(options.headers || {}) } });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || "Biznes so‘rovi bajarilmadi.");
    return body;
  }
  function card(parent, title, detail, actions = []) {
    const node = document.createElement("article"); node.className = "task-card";
    const strong = document.createElement("strong"); strong.textContent = title; node.append(strong);
    const p = document.createElement("p"); p.textContent = detail; node.append(p);
    if (actions.length) { const row = document.createElement("div"); row.className = "task-actions"; for (const action of actions) { const b = document.createElement("button"); b.className = "secondary"; b.type = "button"; b.textContent = action.label; b.addEventListener("click", action.run); row.append(b); } node.append(row); }
    parent.append(node);
  }
  function metric(label, value) {
    const node = document.createElement("article"); node.className = "metric";
    const a = document.createElement("span"); a.textContent = label;
    const b = document.createElement("strong"); b.textContent = String(value);
    node.append(a,b); return node;
  }
  async function change(path, payload) {
    await api(path, { method: "POST", body: JSON.stringify(payload) });
    await load();
  }
  async function load() {
    $("business-message").textContent = "Biznes ma’lumotlari yangilanmoqda…";
    const base = "/api/marketplace/admin";
    const [overview, sellers, products, orders, requests, system] = await Promise.all([
      api(base + "/overview"), api(base + "/sellers"), api(base + "/products"), api(base + "/orders"), api(base + "/requests"), api("/api/marketplace/status")
    ]);
    const c = overview.counts || {};
    $("business-metrics").replaceChildren(
      metric("Mahsulotlar", c.products || 0), metric("Faol mahsulotlar", c.activeProducts || 0),
      metric("Sotuvchilar", c.sellers || 0), metric("Admin ko‘rigidan o‘tgan sotuvchilar", c.verifiedSellers || 0),
      metric("Buyurtmalar", c.orders || 0), metric("Sotuvchi kutilyapti", c.waitingSeller || 0),
      metric("Tasdiqlangan buyurtmalar", c.confirmedOrders || 0), metric("Yakunlangan buyurtmalar", c.completedOrders || 0),
      metric("Xaridor so‘rovlari", c.requests || 0), metric("Ochiq so‘rovlar", c.openRequests || 0),
      metric("Buyurtmalar qiymati", Number(overview.orderValue || 0).toLocaleString("uz-UZ") + " so‘m"),
      metric("Ma’lumotlar ombori", system.databaseConfigured ? "PostgreSQL ulangan" : "JSON — vaqtinchalik"),
      metric("Xaridorga email", system.emailDelivery === "configured" ? "Ulangan" : "Ulanmagan")
    );
    const sellerBox = $("business-sellers"); sellerBox.replaceChildren();
    if (!sellers.sellers.length) sellerBox.textContent = "Hozircha sotuvchi yo‘q.";
    for (const seller of sellers.sellers) card(sellerBox, seller.name + " · " + seller.phone,
      (seller.verified ? "Admin ko‘rigidan o‘tgan" : "Admin ko‘rigidan o‘tmagan") + " · Ro‘yxatdan o‘tgan: " + (seller.createdAt || "—"),
      [{ label: seller.verified ? "Admin tasdig‘ini bekor qilish" : "Admin ko‘rigidan o‘tkazish", run: () => change(base + "/sellers/" + encodeURIComponent(seller.id) + "/verification", { verified: !seller.verified }) }]);
    const productBox = $("business-products"); productBox.replaceChildren();
    if (!products.products.length) productBox.textContent = "Hozircha mahsulot yo‘q.";
    for (const product of products.products) card(productBox, product.name + " · " + Number(product.price || 0).toLocaleString("uz-UZ") + " so‘m",
      product.sellerName + " · " + product.region + " / " + product.district + " · Holat: " + product.status + " · " + (product.verified ? "Tekshirilgan" : "Tekshirilmagan"),
      [{ label: product.status === "active" ? "E’lonni yashirish" : "E’lonni faollashtirish", run: () => change(base + "/products/" + encodeURIComponent(product.id) + "/status", { status: product.status === "active" ? "paused" : "active" }) },
       { label: "Rad etish", run: () => change(base + "/products/" + encodeURIComponent(product.id) + "/status", { status: "rejected" }) }]);
    const orderBox = $("business-orders"); orderBox.replaceChildren();
    if (!orders.orders.length) orderBox.textContent = "Hozircha buyurtma yo‘q.";
    for (const order of orders.orders) {
      const actions = [];
      if (order.status === "confirmed") actions.push({ label: "Yakunlangan deb belgilash", run: () => change(base + "/orders/" + encodeURIComponent(order.id) + "/status", { status: "completed" }) });
      if (!["completed","cancelled","rejected"].includes(order.status)) actions.push({ label: "Bekor qilish", run: () => change(base + "/orders/" + encodeURIComponent(order.id) + "/status", { status: "cancelled" }) });
      card(orderBox, order.productName + " · " + Number(order.total || 0).toLocaleString("uz-UZ") + " so‘m",
        "Buyurtma: " + order.id + " · Xaridor: " + order.buyerName + " · Xaridor tel.: " + (order.buyerPhone || "—") + " · Email: " + (order.buyerEmail || "—") + " · Manzil: " + (order.address || "—") + " · Sotuvchi: " + order.sellerPhone + " · Holat: " + order.status + " · Xat: " + (order.emailStatus || "—"), actions);
    }
    const requestBox = $("business-requests"); requestBox.replaceChildren();
    if (!requests.requests.length) requestBox.textContent = "Hozircha xaridor so‘rovi yo‘q.";
    for (const item of requests.requests) card(requestBox, item.title + " · " + item.customerName,
      item.region + " / " + item.district + " · Byudjet: " + Number(item.budget || 0).toLocaleString("uz-UZ") + " so‘m · Holat: " + item.status + " · Tel: " + item.phone,
      ["in_progress","closed","rejected"].map(status => ({ label: ({in_progress:"Ishga olindi",closed:"Yopish",rejected:"Rad etish"})[status], run: () => change(base + "/requests/" + encodeURIComponent(item.id) + "/status", { status }) })));
    $("business-message").textContent = (system.databaseConfigured ? "" : "MUHIM: PostgreSQL ulanmagan. JSON fayllar Render qayta joylanganda yo‘qolishi mumkin. ") + (overview.paymentNote || "Biznes ma’lumotlari yangilandi.");
  }
  $("business-refresh").addEventListener("click", () => load().catch(e => $("business-message").textContent = e.message));
  window.addEventListener("load", () => {
    const dashboard = $("dashboard");
    if (dashboard && !dashboard.hidden) load().catch(e => $("business-message").textContent = e.message);
    document.addEventListener("visibilitychange", () => { if (!document.hidden && dashboard && !dashboard.hidden) load().catch(() => {}); });
  });
  document.addEventListener("admin-session-ready", () => load().catch(e => $("business-message").textContent = e.message));
})();