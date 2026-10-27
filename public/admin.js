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
function enforceAgentIsolation(data) {
  const isolation = data?.agentIsolation || {};
  const locked = isolation.enabled === true && isolation.specialistAgentsEnabled === false && isolation.taskExecutionEnabled === false;
  $("submit-task").disabled = true;
  $("task-role").disabled = true;
  $("task-prompt").disabled = true;
  $("task-message").textContent = locked
    ? "Izolyatsiya faol: Chat Agentdan boshqa agentlarni ishga tushirish server tomonidan bloklangan."
    : "Agent ruxsat holati aniq tasdiqlanmadi. Xavfsizlik uchun topshiriq berish o‘chirilgan.";
  $("agent-isolation-banner").classList.add("agent-lock-active");
  const strong = $("agent-isolation-banner").querySelector("strong");
  const paragraph = $("agent-isolation-banner").querySelector("p");
  strong.textContent = locked ? "Izolyatsiya yoqilgan — faqat Chat Agent faol" : "Agent holati tasdiqlanmadi — barcha agentlar bloklangan";
  paragraph.textContent = locked
    ? "Backend, frontend, tadqiqot, sinov va boshqa mutaxassis agentlar server tomonidan bloklangan. Ular o‘zicha ishga tushmaydi, navbatga vazifa qo‘sha olmaydi va tashqi amal bajara olmaydi."
    : "Server aniq xavfsiz holatni tasdiqlamadi. Ehtiyot chorasi sifatida mutaxassis agentlarni ishga tushirish bloklangan.";
}
async function loadOverview() {
  const data = await request("/api/admin/overview");
  enforceAgentIsolation(data);
  $("cards").replaceChildren(
    metric("Server ishlash vaqti", Math.floor(data.uptimeSeconds / 60) + " daqiqa"),
    metric("Node.js", data.nodeVersion),
    metric("AI modeli", data.aiConfigured ? data.model : "Ulanmagan"),
    metric("Navbatdagi vazifalar", data.queuedTasks ?? 0),
    metric("Ishlayotgan vazifalar", data.runningTasks ?? 0),
    metric("Xotira (RSS)", Math.round(data.memory.rssBytes / 1024 / 1024) + " MB")
  );
  $("details").textContent = JSON.stringify(data, null, 2);
}
async function loadSafety() {
  const [policyData, runtimeData, eventData] = await Promise.all([
    request("/api/security/policy"),
    request("/api/admin/safety/status"),
    request("/api/admin/safety/events?limit=50")
  ]);
  const runtime = runtimeData.shield || {};
  $("safety-runtime").replaceChildren(
    metric("Qayd etilgan hodisalar (xotirada)", runtime.eventCount ?? 0),
    metric("Karantindagi sessiyalar", runtime.quarantinedSessions ?? 0),
    metric("Shubhali so‘rov chegarasi", runtime.suspiciousRequestThreshold ?? 3),
    metric("Kuzatuv oynasi", (runtime.windowMinutes ?? 10) + " daqiqa")
  );
  const quarantineList = $("safety-quarantines");
  quarantineList.replaceChildren();
  const quarantines = runtimeData.quarantines || [];
  if (!quarantines.length) quarantineList.textContent = "Faol karantin yo‘q.";
  for (const item of quarantines) {
    const card = document.createElement("article"); card.className = "task-card";
    addText(card, "strong", "Sessiya: " + item.sessionHash);
    addText(card, "p", "Vaqt: " + item.at + " · Sabab: " + (item.reason || "aniqlanmagan"));
    const release = document.createElement("button"); release.className = "secondary"; release.textContent = "Karantinni bekor qilish";
    release.addEventListener("click", async () => {
      const reason = window.prompt("Tekshiruv sababi (majburiy emas):", "admin_review") || "admin_review";
      release.disabled = true;
      try { await request("/api/admin/safety/quarantines/" + encodeURIComponent(item.sessionHash) + "/release", { method: "POST", body: JSON.stringify({ reason }) }); await loadSafety(); }
      catch (error) { $("safety-summary").textContent = error.message; release.disabled = false; }
    });
    card.append(release); quarantineList.append(card);
  }
  const eventList = $("safety-events");
  eventList.replaceChildren();
  const events = eventData.events || [];
  if (!events.length) eventList.textContent = "Hozircha xavfsizlik hodisasi qayd etilmagan.";
  for (const event of events) {
    const card = document.createElement("article"); card.className = "task-card";
    addText(card, "strong", (event.severity || "info").toUpperCase() + " · " + (event.type || "event"));
    addText(card, "p", event.at + " · " + (event.reason || "unspecified"));
    addText(card, "small", "Sessiya: " + (event.sessionHash || "—") + " · IP izi: " + (event.ipHash || "—") + " · Matn uzunligi: " + (event.messageLength ?? 0));
    eventList.append(card);
  }
  const data = policyData;
  const policy = data.policy || {};
  const summary = $("safety-summary");
  summary.replaceChildren();
  addText(summary, "strong", "Siyosat v" + (policy.version || "noma’lum"));
  addText(summary, "p", "Bajarish holati: " + (policy.executionEnabled ? "yoqilgan" : "tashqi bajarish o‘chiq"));
  addText(summary, "p", policy.note || "Izoh mavjud emas.");
  const list = $("safety-rules");
  list.replaceChildren();
  for (const rule of (Array.isArray(policy.rules) ? policy.rules : [])) {
    const card = document.createElement("article"); card.className = "task-card";
    addText(card, "strong", (rule.severity || "info").toUpperCase() + " · " + (rule.id || "qoida"));
    addText(card, "p", rule.rule || "");
    list.append(card);
  }
  if (!list.childElementCount) list.textContent = "Qoidalar ro‘yxati mavjud emas.";
}
function addText(parent, tag, value, cls) {
  const node = document.createElement(tag); node.textContent = value || "";
  if (cls) node.className = cls;
  parent.append(node); return node;
}
function renderTask(task) {
  const card = document.createElement("article"); card.className = "task-card";
  const top = document.createElement("div"); top.className = "task-top";
  addText(top, "strong", task.roleLabel + " · " + task.status);
  addText(top, "small", new Date(task.createdAt).toLocaleString());
  card.append(top);
  addText(card, "p", task.prompt, "task-prompt-text");
  if (task.error) addText(card, "p", "Xato: " + task.error, "error");
  if (task.output) addText(card, "pre", task.output, "task-output");
  addText(card, "p", "Ko‘rib chiqish: " + task.approvalStatus + (task.tests ? " · Sinov: " + task.tests.status : ""), "task-meta");
  if (task.status === "queued") {
    const cancel = document.createElement("button"); cancel.className = "secondary"; cancel.textContent = "Navbatdan bekor qilish";
    cancel.addEventListener("click", async () => { try { await request("/api/admin/tasks/" + encodeURIComponent(task.id) + "/cancel", { method: "POST", body: "{}" }); await loadTasks(); } catch (e) { $("task-message").textContent = e.message; } });
    card.append(cancel);
  }
  if (task.approvalStatus === "pending_review") {
    const actions = document.createElement("div"); actions.className = "task-actions";
    for (const [decision, label] of [["approved", "Taklifni ko‘rib chiqdim"], ["rejected", "Taklifni rad etish"]]) {
      const button = document.createElement("button"); button.className = "secondary"; button.textContent = label;
      button.addEventListener("click", async () => {
        try { await request("/api/admin/tasks/" + encodeURIComponent(task.id) + "/review", { method: "POST", body: JSON.stringify({ decision }) }); await loadTasks(); }
        catch (e) { $("task-message").textContent = e.message; }
      });
      actions.append(button);
    }
    card.append(actions);
  }
  if (task.logs?.length) {
    const details = document.createElement("details"); const summary = document.createElement("summary"); summary.textContent = "Jarayon jurnali (" + task.logs.length + ")";
    const log = document.createElement("pre"); log.textContent = task.logs.map(item => item.at + " — " + item.message).join("\n");
    details.append(summary, log); card.append(details);
  }
  return card;
}
async function loadTasks() {
  const data = await request("/api/admin/tasks");
  const list = $("task-list");
  list.replaceChildren();
  if (!data.tasks.length) { list.textContent = "Hozircha topshiriq yo‘q."; return; }
  for (const task of data.tasks) list.append(renderTask(task));
}
async function checkSession() {
  try {
    const status = await request("/api/admin/status");
    if (status.authenticated) { showDashboard(true); await Promise.all([loadOverview(), loadTasks(), loadSafety()]); }
    else showDashboard(false);
  } catch (_) { showDashboard(false); $("status").textContent = "Backend server talab qilinadi"; }
}
$("logout").addEventListener("click", async () => { try { await request("/api/admin/logout", { method: "POST", body: "{}" }); } finally { showDashboard(false); } });
$("refresh").addEventListener("click", async () => { try { await loadOverview(); $("status").textContent = "Yangilandi"; } catch (error) { $("details").textContent = error.message; } });
$("refresh-tasks").addEventListener("click", async () => { try { await loadTasks(); $("task-message").textContent = ""; } catch (error) { $("task-message").textContent = error.message; } });
$("task-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = $("submit-task"); button.disabled = true; $("task-message").textContent = "Vazifa qo‘shilmoqda…";
  try {
    const data = await request("/api/admin/tasks", { method: "POST", body: JSON.stringify({ role: $("task-role").value, prompt: $("task-prompt").value }) });
    $("task-prompt").value = "";
    $("task-message").textContent = "Vazifa navbatga qo‘shildi: " + data.task.id;
    await Promise.all([loadTasks(), loadOverview()]);
  } catch (error) { $("task-message").textContent = error.message; }
  finally { button.disabled = false; }
});
$("refresh-safety").addEventListener("click", async () => { try { await loadSafety(); } catch (error) { $("safety-summary").textContent = error.message; } });
checkSession();
setInterval(() => { if (!$("dashboard").hidden) { loadTasks().catch(() => {}); loadOverview().catch(() => {}); } }, 10000);
