"use strict";
const $ = (id) => document.getElementById(id);
async function request(path, options = {}) {
  const response = await fetch(path, { ...options, credentials: "same-origin", cache: "no-store", headers: { "Content-Type": "application/json", ...(options.headers || {}) } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || "So‘rov bajarilmadi.");
  return body;
}
function metric(label, value) {
  const card = document.createElement("article"); card.className = "metric";
  const title = document.createElement("span"); title.textContent = label;
  const val = document.createElement("strong"); val.textContent = String(value);
  card.append(title, val); return card;
}
function showDashboard(show) { $("login-card").hidden = show; $("dashboard").hidden = !show; $("status").textContent = show ? "Himoyalangan sessiya" : "Kirish talab qilinadi"; }
async function loadOverview() {
  const data = await request("/api/admin/overview");
  $("cards").replaceChildren(
    metric("Server ishlash vaqti", Math.floor(data.uptimeSeconds / 60) + " daqiqa"),
    metric("Node.js", data.nodeVersion),
    metric("AI modeli", data.aiConfigured ? data.model : "Ulanmagan"),
    metric("Xotira (RSS)", Math.round(data.memory.rssBytes / 1024 / 1024) + " MB")
  );
  $("details").textContent = JSON.stringify(data, null, 2);
}
async function checkSession() {
  try { const status = await request("/api/admin/status"); if (status.authenticated) { showDashboard(true); await loadOverview(); } else showDashboard(false); }
  catch (_) { showDashboard(false); $("status").textContent = "Backend server talab qilinadi"; }
}
$("logout").addEventListener("click", async () => { try { await request("/api/admin/logout", { method: "POST", body: "{}" }); } finally { showDashboard(false); } });
$("refresh").addEventListener("click", async () => { try { await loadOverview(); $("status").textContent = "Yangilandi"; } catch (error) { $("details").textContent = error.message; } });
checkSession();