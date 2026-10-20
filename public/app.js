const form = document.querySelector("#chat-form");
const input = document.querySelector("#message");
const send = document.querySelector("#send");
const messages = document.querySelector("#messages");
const status = document.querySelector("#status");
const installButton = document.querySelector("#install");
const isNative = Boolean(window.Capacitor && typeof window.Capacitor.isNativePlatform === "function" && window.Capacitor.isNativePlatform());
let installPrompt = null;

function addMessage(text, who) {
  const el = document.createElement("div");
  el.className = "bubble " + who;
  el.textContent = text;
  messages.appendChild(el);
  messages.scrollTop = messages.scrollHeight;
}

async function checkHealth() {
  if (isNative) {
    status.textContent = "Android ilovasi tayyor · mahalliy sinov rejimi";
    return;
  }
  try {
    const response = await fetch("/api/health", { cache: "no-store" });
    if (!response.ok) throw new Error("health failed");
    status.textContent = "Server bilan bog‘langan · MVP 0.2.0";
  } catch {
    status.textContent = "Oflayn rejim · chat demo javoblar bilan ishlaydi";
  }
}

function offlineReply(message) {
  const lower = message.toLocaleLowerCase("uz");
  if (lower.includes("salom") || lower.includes("assalomu")) return "Va alaykum assalom! Men ULUGBEK AI sinov rejimiman. Hozir haqiqiy AI modeli ulanmagan.";
  if (lower.includes("isming") || lower.includes("kimsan")) return "Men ULUGBEK AI loyihasining sinov interfeysiman. Haqiqiy AI modelini keyingi bosqichda ulaymiz.";
  if (lower.includes("yordam")) return "Hozir chat oynasi va server aloqasini sinayapmiz. Bu demo rejimida haqiqiy AI javoblari yo‘q.";
  return "Xabaringiz qurilmada qabul qilindi. Hozir oflayn/demo rejimidasiz — haqiqiy AI javobi olish uchun keyinchalik model va server ulanishi kerak.";
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const message = input.value.trim();
  if (!message || send.disabled) return;
  addMessage(message, "user");
  input.value = "";
  send.disabled = true;
  try {
    if (isNative) {
      addMessage(offlineReply(message), "assistant");
    } else {
      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "So‘rov bajarilmadi.");
        addMessage(data.reply, "assistant");
      } catch {
        addMessage(offlineReply(message), "assistant");
      }
    }
  } finally {
    send.disabled = false;
    input.focus();
  }
});

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  installPrompt = event;
  installButton.style.display = "inline-block";
});
installButton.addEventListener("click", async () => {
  if (!installPrompt) return;
  installPrompt.prompt();
  await installPrompt.userChoice;
  installPrompt = null;
  installButton.style.display = "none";
});

if ("serviceWorker" in navigator && !isNative) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}
checkHealth();
