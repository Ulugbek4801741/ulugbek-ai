"use strict";
const byId = (id) => document.getElementById(id);
const toast = byId("lab-toast");
let toastTimer;
function notify(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 3000);
}
function node(tag, text, className) {
  const element = document.createElement(tag);
  if (text !== undefined) element.textContent = text;
  if (className) element.className = className;
  return element;
}
async function api(path, options = {}) {
  const response = await fetch("/api/lab" + path, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "So‘rov bajarilmadi.");
  return data;
}
function button(label, className, handler) {
  const b = node("button", label, className || "secondary-button");
  b.type = "button";
  b.addEventListener("click", handler);
  return b;
}
async function loadStatus() {
  try {
    const status = await api("/status");
    byId("lab-state").textContent = "Laboratoriya serverga ulandi";
    byId("knowledge-count").textContent = status.knowledgeCount;
    byId("memory-count").textContent = status.agentMemoryCount;
  } catch (_) {
    byId("lab-state").textContent = "Backend ulanmagan — serverni ishga tushiring";
  }
}
async function loadKnowledge() {
  const list = byId("knowledge-list");
  list.replaceChildren(node("p", "Yuklanmoqda…", "lab-empty"));
  try {
    const data = await api("/knowledge");
    byId("knowledge-count").textContent = data.entries.length;
    list.replaceChildren();
    if (!data.entries.length) {
      list.append(node("p", "Hozircha saqlangan bilim yo‘q.", "lab-empty"));
      return;
    }
    data.entries.slice(0, 30).forEach((entry) => {
      const card = node("article", undefined, "lab-knowledge-item");
      card.append(node("div", entry.agent + " · " + new Date(entry.createdAt).toLocaleString(), "lab-meta"));
      card.append(node("h3", entry.title));
      card.append(node("p", entry.content));
      if (entry.source) {
        const a = node("a", "Manbani ochish ↗");
        a.href = entry.source;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        card.append(a);
      }
      list.append(card);
    });
  } catch (error) {
    list.replaceChildren(node("p", error.message, "lab-empty"));
  }
}
async function loadMemory() {
  const agent = byId("memory-agent").value;
  const list = byId("memory-list");
  list.replaceChildren(node("p", "Yuklanmoqda…", "lab-empty"));
  try {
    const data = await api("/memory/" + encodeURIComponent(agent));
    byId("memory-count").textContent = "—";
    list.replaceChildren();
    if (!data.memory.length) {
      list.append(node("p", "Bu agentda hali xotira yo‘q.", "lab-empty"));
      return;
    }
    data.memory.slice().reverse().forEach((item) => {
      const card = node("article", undefined, "lab-memory-item");
      card.append(node("div", new Date(item.createdAt).toLocaleString(), "lab-meta"));
      card.append(node("p", item.content));
      list.append(card);
    });
  } catch (error) {
    list.replaceChildren(node("p", error.message, "lab-empty"));
  }
}
byId("search-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const query = byId("search-query").value.trim();
  if (!query) return;
  const submit = byId("search-button");
  const resultsBox = byId("search-results");
  submit.disabled = true;
  submit.textContent = "Qidirilmoqda…";
  resultsBox.replaceChildren(node("p", "Ommaviy internet qidiruvi bajarilmoqda…", "lab-empty"));
  try {
    const data = await api("/search", { method: "POST", body: JSON.stringify({ query }) });
    resultsBox.replaceChildren();
    if (!data.results.length) resultsBox.append(node("p", data.note, "lab-empty"));
    data.results.forEach((result) => {
      const card = node("article", undefined, "lab-result");
      card.append(node("h3", result.title));
      card.append(node("p", result.snippet));
      const link = node("a", result.url);
      link.href = result.url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      card.append(link);
      const actions = node("div", undefined, "lab-result-actions");
      actions.append(button("Bilim sifatida saqlash", "secondary-button", () => {
        byId("knowledge-title").value = result.title;
        byId("knowledge-content").value = result.snippet;
        byId("knowledge-source").value = result.url;
        byId("knowledge-agent").value = "Research Agent";
        byId("knowledge-title").focus();
        notify("Natija shaklga ko‘chirildi. Tekshirib, saqlash tugmasini bosing.");
      }));
      actions.append(button("Manbani ochish ↗", "secondary-button", () => window.open(result.url, "_blank", "noopener,noreferrer")));
      card.append(actions);
      resultsBox.append(card);
    });
    if (data.results.length) resultsBox.prepend(node("p", data.note, "lab-empty"));
  } catch (error) {
    resultsBox.replaceChildren(node("p", error.message, "lab-empty"));
  } finally {
    submit.disabled = false;
    submit.textContent = "Qidirish";
  }
});
byId("knowledge-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const buttonEl = byId("save-knowledge");
  buttonEl.disabled = true;
  try {
    await api("/knowledge", { method: "POST", body: JSON.stringify({
      title: byId("knowledge-title").value,
      content: byId("knowledge-content").value,
      source: byId("knowledge-source").value,
      agent: byId("knowledge-agent").value
    }) });
    byId("knowledge-form").reset();
    notify("Bilimlar bazaga saqlandi.");
    await Promise.all([loadKnowledge(), loadStatus()]);
  } catch (error) { notify(error.message); }
  finally { buttonEl.disabled = false; }
});
byId("memory-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const buttonEl = byId("save-memory");
  buttonEl.disabled = true;
  try {
    await api("/memory/" + encodeURIComponent(byId("memory-agent").value), {
      method: "POST", body: JSON.stringify({ content: byId("memory-content").value })
    });
    byId("memory-content").value = "";
    notify("Agent xotirasi saqlandi.");
    await Promise.all([loadMemory(), loadStatus()]);
  } catch (error) { notify(error.message); }
  finally { buttonEl.disabled = false; }
});
byId("memory-agent").addEventListener("change", loadMemory);
byId("refresh-knowledge").addEventListener("click", () => Promise.all([loadKnowledge(), loadStatus()]));
loadStatus();
loadKnowledge();
loadMemory();