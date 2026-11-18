"use strict";
(() => {
  const form = document.getElementById("admin-chat-form");
  const input = document.getElementById("admin-chat-input");
  const log = document.getElementById("admin-chat-log");
  const send = document.getElementById("admin-chat-send");
  if (!form || !input || !log || !send) return;

  function line(role, text) {
    const item = document.createElement("article");
    item.className = "task-card";
    const heading = document.createElement("strong");
    heading.textContent = role === "admin" ? "ADMIN" : "ULUGBEK AI · ADMIN";
    const body = document.createElement("p");
    body.style.whiteSpace = "pre-wrap";
    body.textContent = text;
    item.append(heading, body);
    log.append(item);
    item.scrollIntoView({ block: "nearest" });
    return body;
  }

  async function api(path, options = {}) {
    const response = await fetch(path, {
      ...options,
      credentials: "same-origin",
      cache: "no-store",
      headers: { "Content-Type": "application/json", ...(options.headers || {}) }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Server so‘rovni bajarmadi.");
    return data;
  }

  async function run(text) {
    const normalized = text.trim().toLowerCase();
    if (/^(holat|server holati|status)$/.test(normalized)) {
      const data = await api("/api/admin/overview");
      return [
        "Server: ishlayapti",
        "Node.js: " + data.nodeVersion,
        "Ishlash vaqti: " + Math.floor((data.uptimeSeconds || 0) / 60) + " daqiqa",
        "AI modeli: " + (data.aiConfigured ? (data.model || "sozlangan") : "ulanmagan"),
        "Navbatdagi vazifalar: " + (data.queuedTasks ?? 0),
        "Bajarilayotgan vazifalar: " + (data.runningTasks ?? 0),
        "Xotira: " + Math.round((data.memory?.rssBytes || 0) / 1024 / 1024) + " MB"
      ].join("\n");
    }
    if (/^(diagnostika|tizim diagnostikasi|tekshir)$/.test(normalized)) {
      const [overview, tasks, permissions] = await Promise.all([
        api("/api/admin/overview"),
        api("/api/admin/tasks"),
        api("/api/admin/agent-permissions")
      ]);
      const pending = (tasks.tasks || []).filter(task => task.status === "queued" || task.status === "running").length;
      const enabled = Object.values(permissions.policy?.capabilities || {}).filter(item => item.enabled).length;
      return [
        "Diagnostika yakunlandi.",
        "Server: javob berdi",
        "Faol/navbatdagi topshiriqlar: " + pending,
        "Yoqilgan agent vakolatlari: " + enabled,
        "AI modeli: " + (overview.aiConfigured ? "sozlangan" : "ulanmagan"),
        "Production kodini o‘zgartirish yoki deploy bu chat orqali avtomatik bajarilmaydi."
      ].join("\n");
    }
    if (/^(vazifalar|topshiriqlar)$/.test(normalized)) {
      const data = await api("/api/admin/tasks");
      const tasks = data.tasks || [];
      if (!tasks.length) return "Hozircha topshiriqlar yo‘q.";
      return tasks.slice(0, 10).map(task =>
        (task.roleLabel || task.role || "Agent") + " · " + task.status + " · " + task.id +
        (task.output ? "\n" + task.output.slice(0, 700) : "")
      ).join("\n\n");
    }

    const data = await api("/api/admin/tasks", {
      method: "POST",
      body: JSON.stringify({ role: "orchestrator", prompt: text })
    });
    const task = data.task || {};
    const result = line("ai", "Topshiriq qabul qilindi. ID: " + (task.id || "noma’lum") + "\nHolat: " + (task.status || "navbatda"));
    if (!task.id) return "Topshiriq navbatga yuborildi, lekin ID qaytmadi.";
    for (let attempt = 0; attempt < 12; attempt += 1) {
      await new Promise(resolve => setTimeout(resolve, 1500));
      try {
        const latest = await api("/api/admin/tasks/" + encodeURIComponent(task.id));
        const current = latest.task || {};
        result.textContent = "Topshiriq ID: " + task.id + "\nHolat: " + (current.status || "noma’lum") +
          (current.output ? "\n\nNatija:\n" + current.output : "") +
          (current.error ? "\nXato: " + current.error : "");
        if (["completed", "failed", "cancelled"].includes(current.status)) break;
      } catch (error) {
        result.textContent += "\nHolatni yangilashda xato: " + error.message;
        break;
      }
    }
    return null;
  }

  form.addEventListener("submit", async event => {
    event.preventDefault();
    const text = input.value.trim();
    if (!text || send.disabled) return;
    input.value = "";
    line("admin", text);
    send.disabled = true;
    try {
      const answer = await run(text);
      if (answer) line("ai", answer);
    } catch (error) {
      line("ai", "Bajarilmadi: " + error.message);
    } finally {
      send.disabled = false;
      input.focus();
    }
  });
})();