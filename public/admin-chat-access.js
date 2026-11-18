"use strict";
(() => {
  const form = document.getElementById("chat-form");
  const message = document.getElementById("message");
  if (!form || !message) return;

  // This state exists only in memory. No password or attempt is written to
  // chat history, localStorage, sessionStorage, analytics, or the AI endpoint.
  let armed = false;
  let candidate = null;
  let repetitions = 0;
  let verifying = false;

  function eraseComposer() {
    message.value = "";
    message.style.height = "auto";
  }

  async function verifyAfterFive() {
    if (verifying || !candidate) return;
    verifying = true;
    const code = candidate;
    candidate = null;
    repetitions = 0;
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code })
      });
      const body = await response.json().catch(() => ({}));
      if (response.ok && body.ok === true) {
        window.location.replace("./admin.html");
        return;
      }
      // Stay silent in the public chat. The server still enforces its
      // per-IP attempt limit and one-hour lockout.
    } catch (_) {
      // Stay silent; do not leak the attempted code or network details.
    } finally {
      verifying = false;
    }
  }

  form.addEventListener("submit", event => {
    const value = message.value.trim();
    if (!armed && /^\/(?:admin|admin-panel)$/i.test(value)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      eraseComposer();
      armed = true;
      candidate = null;
      repetitions = 0;
      return;
    }

    if (!armed) return;

    // While armed, every submission is consumed here before app.js can
    // render it or send it to /api/chat. The composer remains visually empty.
    event.preventDefault();
    event.stopImmediatePropagation();
    eraseComposer();
    if (!value || verifying) return;

    if (candidate === null || value !== candidate) {
      candidate = value;
      repetitions = 1;
    } else {
      repetitions += 1;
    }

    if (repetitions >= 5) void verifyAfterFive();
  }, true);

  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && armed && !verifying) {
      armed = false;
      candidate = null;
      repetitions = 0;
      eraseComposer();
    }
  }, true);
})();