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
    metric("Navbatdagi vazifalar", data.queuedTasks ?? 0),
    metric("Ishlayotgan vazifalar", data.runningTasks ?? 0),
    metric("Xotira (RSS)", Math.round(data.memory.rssBytes / 1024 / 1024) + " MB")
  );
  $("details").textContent = JSON.stringify(data, null, 2);
}
async function loadAutopilot() {
  const data = await request("/api/admin/autopilot/status");
  const status = data.autopilot || {};
  const monitored = status.monitored || {};
  $("autopilot-status").replaceChildren(
    metric("Watchdog", status.enabled ? (status.quarantined ? "Karantin" : "Faol") : "To‘xtagan"),
    metric("Oxirgi tekshiruv", status.lastCheckAt ? new Date(status.lastCheckAt).toLocaleString() : "—"),
    metric("Oxirgi sog‘lom holat", status.lastHealthyAt ? new Date(status.lastHealthyAt).toLocaleString() : "—"),
    metric("Xato ketma-ketligi", status.consecutiveErrors ?? 0),
    metric("Qayta tiklash urinishlari", (status.restartAttempts ?? 0) + " / " + (status.maxRestarts ?? 2)),
    metric("Developer Agent", monitored.developerAgent?.enabled ? "Faol" : "To‘xtagan"),
    metric("Learning Worker", monitored.learningWorker?.enabled ? "Faol" : "To‘xtagan"),
    metric("Navbatdagi vazifalar", monitored.queuedTasks ?? 0)
  );
  const events = $("autopilot-events");
  events.replaceChildren();
  const entries = status.recentEvents || [];
  if (!entries.length) events.textContent = "Hozircha hodisa yo‘q.";
  for (const item of entries) {
    const card = document.createElement("article"); card.className = "task-card";
    addText(card, "strong", item.type || "event");
    addText(card, "p", item.at + " · " + (item.detail || ""));
    events.append(card);
  }
  $("autopilot-message").textContent = status.quarantined
    ? "Agentlar karantinda: " + (status.quarantineReason || "xavfsizlik tekshiruvi")
    : (status.lastError ? "Oxirgi xato: " + status.lastError : status.note || "");
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

async function loadAgentPermissions() {
  const data = await request("/api/admin/agent-permissions");
  const policy = data.policy || {};
  const controls = $("permission-controls");
  controls.replaceChildren();
  for (const [key, item] of Object.entries(policy.capabilities || {})) {
    const card = document.createElement("label"); card.className = "task-card";
    const line = document.createElement("span");
    const input = document.createElement("input");
    input.type = "checkbox"; input.dataset.permission = key; input.checked = item.enabled === true;
    input.style.marginRight = "12px";
    line.append(input, document.createTextNode(item.label + (item.enabled ? " — yoqilgan" : " — o‘chirilgan")));
    input.addEventListener("change", () => { line.lastChild.textContent = item.label + (input.checked ? " — yoqilgan" : " — o‘chirilgan"); });
    card.append(line); controls.append(card);
  }
  const locks = $("permission-locks"); locks.replaceChildren();
  for (const label of Object.values(policy.locked || {})) addText(locks, "p", "🔒 " + label);
  const audit = $("permission-audit"); audit.replaceChildren();
  for (const entry of (policy.audit || [])) {
    const card = document.createElement("article"); card.className = "task-card";
    addText(card, "strong", new Date(entry.at).toLocaleString() + " · " + entry.by);
    addText(card, "p", Object.entries(entry.changes || {}).map(([key, value]) => key + ": " + (value ? "yoqildi" : "o‘chirildi")).join(" | "));
    audit.append(card);
  }
  if (!audit.childElementCount) audit.textContent = "Hali o‘zgarishlar yo‘q.";
  $("permissions-message").textContent = "Siyosat v" + (policy.version || 1) + " yuklandi.";
}
async function saveAgentPermissions() {
  const capabilities = {};
  document.querySelectorAll("[data-permission]").forEach(input => { capabilities[input.dataset.permission] = input.checked; });
  const button = $("permissions-save"); button.disabled = true;
  try {
    await request("/api/admin/agent-permissions", { method: "PUT", body: JSON.stringify({ capabilities }) });
    await loadAgentPermissions();
    $("permissions-message").textContent = "Ruxsatlar saqlandi. Agentlarning barcha amallari hali tegishli bajaruvchi modulda alohida tekshirilishi kerak.";
  } catch (error) { $("permissions-message").textContent = error.message; }
  finally { button.disabled = false; }
}

async function loadDeveloperAgent() {
  const [statusData, proposalData] = await Promise.all([
    request("/api/admin/developer-agent/status"),
    request("/api/admin/developer-agent/proposals")
  ]);
  const agent = statusData.agent || {};
  $("developer-status").replaceChildren(
    metric("Holat", agent.running ? "Tekshiryapti" : (agent.enabled ? "Faol" : "To‘xtagan")),
    metric("Tekshiruvlar", agent.cycles ?? 0),
    metric("Tekshirilgan fayllar", agent.scannedFiles ?? 0),
    metric("Admin ko‘rigidagi takliflar", agent.pendingApprovals ?? 0),
    metric("Keyingi tekshiruv", agent.nextRunAt ? new Date(agent.nextRunAt).toLocaleString() : "—")
  );
  const list = $("developer-proposals");
  list.replaceChildren();
  const proposals = proposalData.proposals || [];
  if (!proposals.length) list.textContent = "Hozircha taklif yo‘q. Agent navbatdagi tekshiruvda repozitoriydagi fayllarni tahlil qiladi.";
  for (const proposal of proposals) {
    const card = document.createElement("article"); card.className = "task-card";
    addText(card, "strong", proposal.severity.toUpperCase() + " · " + proposal.title);
    addText(card, "p", proposal.detail);
    addText(card, "small", "Fayl: " + (proposal.file || "—") + " · Holat: " + proposal.status);
    if (proposal.status === "pending_admin_review") {
      const actions = document.createElement("div"); actions.className = "task-actions";
      for (const [decision, label] of [["approved_for_release", "Chiqarishga ruxsat"], ["rejected", "Rad etish"]]) {
        const button = document.createElement("button"); button.className = "secondary"; button.textContent = label;
        button.addEventListener("click", async () => {
          button.disabled = true;
          try {
            await request("/api/admin/developer-agent/proposals/" + encodeURIComponent(proposal.id) + "/review", {
              method: "POST", body: JSON.stringify({ decision })
            });
            await loadDeveloperAgent();
          } catch (error) { $("developer-message").textContent = error.message; button.disabled = false; }
        });
        actions.append(button);
      }
      card.append(actions);
    }
    list.append(card);
  }
  if (agent.lastError) $("developer-message").textContent = "Oxirgi xato: " + agent.lastError;
}

async function checkSession() {
  try {
    const status = await request("/api/admin/status");
    if (!status.configured) {
      showDashboard(false);
      $("login-error").textContent = "Serverda ADMIN_ACCESS_CODE va ADMIN_SESSION_SECRET maxfiy sozlamalari kiritilmagan.";
      return;
    }
    if (status.authenticated) {
      showDashboard(true);
      await Promise.all([loadOverview(), loadTasks(), loadSafety(), loadAgentPermissions(), loadDeveloperAgent(), loadAutopilot()]);
    } else {
      showDashboard(false);
    }
  } catch (_) {
    showDashboard(false);
    $("status").textContent = "Backend server talab qilinadi";
  }
}
$("login-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = $("login-submit");
  const input = $("admin-code");
  button.disabled = true;
  $("login-error").textContent = "Kod tekshirilmoqda…";
  try {
    await request("/api/admin/login", { method: "POST", body: JSON.stringify({ code: input.value }) });
    input.value = "";
    $("login-error").textContent = "";
    await checkSession();
  } catch (error) {
    input.value = "";
    $("login-error").textContent = error.message;
  } finally {
    button.disabled = false;
  }
});
$("change-code-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const currentCode = $("current-admin-code").value;
  const newCode = $("new-admin-code").value;
  const confirmCode = $("confirm-admin-code").value;
  const button = $("change-code-submit");
  if (newCode !== confirmCode) {
    $("change-code-message").textContent = "Yangi kodlar bir xil emas.";
    return;
  }
  button.disabled = true;
  $("change-code-message").textContent = "Kod xavfsiz saqlanmoqda…";
  try {
    const result = await request("/api/admin/change-code", {
      method: "POST",
      body: JSON.stringify({ currentCode, newCode })
    });
    $("change-code-message").textContent = result.note || "Administrator kodi almashtirildi.";
    $("current-admin-code").value = "";
    $("new-admin-code").value = "";
    $("confirm-admin-code").value = "";
  } catch (error) {
    $("change-code-message").textContent = error.message;
    $("current-admin-code").value = "";
    $("new-admin-code").value = "";
    $("confirm-admin-code").value = "";
  } finally {
    button.disabled = false;
  }
});
$("permissions-refresh").addEventListener("click", () => loadAgentPermissions().catch(error => { $("permissions-message").textContent = error.message; }));
$("permissions-save").addEventListener("click", saveAgentPermissions);
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
$("developer-run").addEventListener("click", async () => {
  const button = $("developer-run"); button.disabled = true; $("developer-message").textContent = "Agent tekshiruvni bajaryapti…";
  try {
    await request("/api/admin/developer-agent/run", { method: "POST", body: "{}" });
    await loadDeveloperAgent();
    $("developer-message").textContent = "Tekshiruv yakunlandi yoki hozir davom etmoqda.";
  } catch (error) { $("developer-message").textContent = error.message; }
  finally { button.disabled = false; }
});
$("autopilot-check").addEventListener("click", async () => {
  const button = $("autopilot-check"); button.disabled = true;
  try { await request("/api/admin/autopilot/check", { method: "POST", body: "{}" }); await loadAutopilot(); }
  catch (error) { $("autopilot-message").textContent = error.message; }
  finally { button.disabled = false; }
});
$("autopilot-recover").addEventListener("click", async () => {
  const button = $("autopilot-recover"); button.disabled = true;
  try { await request("/api/admin/autopilot/recover", { method: "POST", body: "{}" }); await loadAutopilot(); }
  catch (error) { $("autopilot-message").textContent = error.message; }
  finally { button.disabled = false; }
});
$("autopilot-stop").addEventListener("click", async () => {
  const button = $("autopilot-stop"); button.disabled = true;
  try { await request("/api/admin/autopilot/stop", { method: "POST", body: "{}" }); await loadAutopilot(); }
  catch (error) { $("autopilot-message").textContent = error.message; }
  finally { button.disabled = false; }
});
$("refresh-safety").addEventListener("click", async () => { try { await loadSafety(); } catch (error) { $("safety-summary").textContent = error.message; } });
checkSession();
setInterval(() => {
  if (!$("dashboard").hidden) {
    request("/api/admin/status").then(data => { if (!data.authenticated) { showDashboard(false); $("login-error").textContent = "Administrator sessiyasi tugadi. Qayta kiring."; } }).catch(() => showDashboard(false));
    loadTasks().catch(() => {}); loadOverview().catch(() => {}); loadDeveloperAgent().catch(() => {}); loadAutopilot().catch(() => {});
  }
}, 10000);
