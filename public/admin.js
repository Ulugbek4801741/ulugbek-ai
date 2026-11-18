"use strict";
const $ = id => document.getElementById(id);
async function request(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    credentials: "same-origin",
    cache: "no-store",
    headers: { "Content-Type": "application/json", ...(options.headers || {}) }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "So‘rov bajarilmadi.");
  return data;
}
function showDashboard(authenticated) {
  $("login-card").hidden = authenticated;
  $("dashboard").hidden = !authenticated;
  $("status").textContent = authenticated ? "Himoyalangan sessiya" : "Kirish talab qilinadi";
}
function addMessage(role, text, data) {
  const item = document.createElement("article");
  item.className = "message " + (role === "user" ? "user" : "assistant");
  const label = document.createElement("span");
  label.className = "message-label";
  label.textContent = role === "user" ? "SIZ" : "ULUGBEK AI ADMIN";
  const paragraph = document.createElement("p");
  paragraph.textContent = text;
  item.append(label, paragraph);
  if (data && typeof data === "object") {
    const details = document.createElement("details");
    details.className = "result-details";
    const summary = document.createElement("summary");
    summary.textContent = "Texnik natijalarni ko‘rish";
    const pre = document.createElement("pre");
    pre.textContent = JSON.stringify(data, null, 2);
    details.append(summary, pre);
    item.append(details);
  }
  $("chat-log").append(item);
  $("chat-log").scrollTop = $("chat-log").scrollHeight;
}
async function sendCommand(message, showUser = true) {
  const text = String(message || "").trim();
  if (!text) return;
  if (showUser) addMessage("user", text);
  $("chat-status").textContent = "Buyruq bajarilmoqda…";
  $("send-button").disabled = true;
  try {
    const result = await request("/api/admin/chat", {
      method: "POST",
      body: JSON.stringify({ message: text })
    });
    addMessage("assistant", result.reply || "Server javob qaytardi.", result.data);
    $("chat-status").textContent = "Bajarildi · " + (result.action || "chat");
  } catch (error) {
    addMessage("assistant", error.message);
    $("chat-status").textContent = "Buyruq bajarilmadi.";
    if (/qayta kiring|sessiya/i.test(error.message)) showDashboard(false);
  } finally {
    $("send-button").disabled = false;
  }
}
async function checkSession() {
  try {
    const status = await request("/api/admin/status");
    if (!status.configured) {
      showDashboard(false);
      $("login-error").textContent = "Serverda ADMIN_ACCESS_CODE va ADMIN_SESSION_SECRET sozlamalari to‘liq emas.";
      return;
    }
    if (status.authenticated) {
      showDashboard(true);
      if (!$("chat-log").dataset.started) {
        $("chat-log").dataset.started = "yes";
        await sendCommand("To‘liq diagnostika qil", false);
      }
    } else showDashboard(false);
  } catch (_) {
    showDashboard(false);
    $("status").textContent = "Server bilan aloqa yo‘q";
  }
}
$("login-form").addEventListener("submit", async event => {
  event.preventDefault();
  const button = $("login-submit");
  button.disabled = true;
  $("login-error").textContent = "Kod tekshirilmoqda…";
  try {
    await request("/api/admin/login", { method: "POST", body: JSON.stringify({ code: $("admin-code").value }) });
    $("admin-code").value = "";
    $("login-error").textContent = "";
    await checkSession();
  } catch (error) {
    $("admin-code").value = "";
    $("login-error").textContent = error.message;
  } finally { button.disabled = false; }
});
$("chat-form").addEventListener("submit", event => {
  event.preventDefault();
  const input = $("chat-input");
  const text = input.value;
  input.value = "";
  sendCommand(text);
});
$("chat-input").addEventListener("keydown", event => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    $("chat-form").requestSubmit();
  }
});
document.querySelectorAll("[data-command]").forEach(button => {
  button.addEventListener("click", () => sendCommand(button.dataset.command));
});
$("logout").addEventListener("click", async () => {
  try { await request("/api/admin/logout", { method: "POST", body: "{}" }); }
  finally { showDashboard(false); $("chat-log").replaceChildren(); $("chat-log").dataset.started = ""; }
});
$("change-code-form").addEventListener("submit", async event => {
  event.preventDefault();
  const currentCode = $("current-admin-code").value;
  const newCode = $("new-admin-code").value;
  const confirmCode = $("confirm-admin-code").value;
  if (newCode !== confirmCode) {
    $("change-code-message").textContent = "Yangi kodlar bir xil emas.";
    return;
  }
  try {
    const result = await request("/api/admin/change-code", {
      method: "POST",
      body: JSON.stringify({ currentCode, newCode })
    });
    $("change-code-message").textContent = result.note || "Administrator kodi almashtirildi.";
  } catch (error) { $("change-code-message").textContent = error.message; }
  finally {
    $("current-admin-code").value = "";
    $("new-admin-code").value = "";
    $("confirm-admin-code").value = "";
  }
});
checkSession();
setInterval(() => {
  if (!$("dashboard").hidden) {
    request("/api/admin/status").then(data => {
      if (!data.authenticated) {
        showDashboard(false);
        $("login-error").textContent = "Administrator sessiyasi tugadi. Qayta kiring.";
      }
    }).catch(() => showDashboard(false));
  }
}, 15000);
