"use strict";
(() => {
  const form = document.getElementById("chat-form");
  const message = document.getElementById("message");
  const modal = document.getElementById("admin-access-modal");
  const input = document.getElementById("admin-access-code");
  const status = document.getElementById("admin-access-message");
  const close = () => { modal.hidden = true; input.value = ""; status.textContent = "5 ta noto‘g‘ri urinishdan keyin kirish 1 soatga bloklanadi."; };
  const open = () => { modal.hidden = false; input.value = ""; status.textContent = "Parol faqat himoyalangan kirish API’siga yuboriladi; chat tarixiga qo‘shilmaydi."; setTimeout(() => input.focus(), 0); };
  document.getElementById("admin-access-close").addEventListener("click", close);
  modal.addEventListener("click", event => { if (event.target === modal) close(); });
  document.addEventListener("keydown", event => { if (event.key === "Escape" && !modal.hidden) close(); });
  form.addEventListener("submit", event => {
    if (!["/admin", "/admin-panel"].includes(message.value.trim().toLowerCase())) return;
    event.preventDefault(); event.stopImmediatePropagation();
    message.value = "";
    open();
  }, true);
  document.getElementById("admin-access-form").addEventListener("submit", async event => {
    event.preventDefault();
    const button = document.getElementById("admin-access-submit");
    button.disabled = true; status.textContent = "Maxfiy kod tekshirilmoqda…";
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST", credentials: "same-origin", cache: "no-store",
        headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: input.value })
      });
      const body = await response.json().catch(() => ({}));
      input.value = "";
      if (!response.ok) throw new Error(body.error || "Kirish rad etildi.");
      status.textContent = "Ruxsat tasdiqlandi. Admin panel ochilmoqda…";
      window.location.assign("./admin.html");
    } catch (error) {
      status.textContent = error.message;
      input.focus();
    } finally { button.disabled = false; }
  });
})();