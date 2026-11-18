"use strict";
(() => {
  const API = "/api/learning";
  const TOKEN_KEY = "ulugbek-account-token";
  const LEGACY_KEY = "ulugbek-vizor-token";
  const $ = (tag, attrs = {}, text = "") => {
    const node = document.createElement(tag);
    Object.entries(attrs).forEach(([key, value]) => {
      if (key === "className") node.className = value;
      else if (key === "hidden") node.hidden = Boolean(value);
      else node.setAttribute(key, value);
    });
    if (text) node.textContent = text;
    return node;
  };
  const token = () => localStorage.getItem(TOKEN_KEY) || localStorage.getItem(LEGACY_KEY) || "";
  const saveToken = value => {
    localStorage.setItem(TOKEN_KEY, value);
    localStorage.setItem(LEGACY_KEY, value);
  };
  function continueToRequestedPage() {
    const next = new URLSearchParams(window.location.search).get("next") || "";
    if (!next.startsWith("/")) return false;
    const target = new URL(next, window.location.origin);
    if (target.origin !== window.location.origin) return false;
    window.location.replace(target.pathname + target.search + target.hash);
    return true;
  }
  const overlay = $("div", { className: "ulugbek-auth-screen", id: "ulugbek-auth-screen" });
  overlay.innerHTML = `
    <div class="ua-top"><a href="/" class="ua-brand">← ULUGBEK AI</a><span>ULUGBEK HAMJAMIYATI</span></div>
    <main class="ua-card">
      <div class="ua-mark">U</div>
      <p class="ua-kicker">YAGONA AKKAUNT</p>
      <h1>Hamjamiyatga qo‘shiling</h1>
      <p class="ua-subtitle">Akkaunt oching yoki profilingizga kiring. Bitta akkaunt barcha ULUGBEK AI imkoniyatlari uchun ishlaydi.</p>
      <div class="ua-tabs"><button type="button" data-mode="register" class="active">Ro‘yxatdan o‘tish</button><button type="button" data-mode="login">Kirish</button></div>
      <form class="ua-form" id="ua-form" novalidate>
        <label id="ua-username-wrap">Login<input name="username" minlength="3" maxlength="32" autocomplete="username" placeholder="Masalan: ulugbek_01" required></label>
        <label id="ua-name-wrap">Ismingiz<input name="displayName" maxlength="80" autocomplete="name" placeholder="Ism va familiya" required></label>
        <label id="ua-email-wrap">Email<input name="email" type="email" maxlength="254" autocomplete="email" placeholder="name@example.com" required></label>
        <label id="ua-phone-wrap">Telefon<input name="phone" type="tel" maxlength="20" autocomplete="tel" placeholder="+998901234567" required></label>
        <label>Parol<input name="password" type="password" minlength="8" maxlength="16" autocomplete="new-password" placeholder="8–16 belgi" required><small class="ua-password-help" id="ua-password-help">8–16 belgi. Katta va kichik harf, raqam hamda _ belgisi bo‘lsin. Masalan: A1_ulugbek</small></label>
        <button class="ua-submit" type="submit">Davom etish</button>
        <p class="ua-error" id="ua-error" role="alert"></p>
      </form>
      <p class="ua-foot">Parol himoyalangan shaklda saqlanadi. Email va telefon hozircha kiritilgan ma’lumot sifatida saqlanadi; SMS/email tasdiqlash xizmati ulanmagan.</p>
    </main>`;
  document.body.append(overlay);

  let mode = "register";
  const form = overlay.querySelector("#ua-form");
  const error = overlay.querySelector("#ua-error");
  function setMode(next) {
    mode = next;
    overlay.querySelectorAll("[data-mode]").forEach(button => button.classList.toggle("active", button.dataset.mode === mode));
    ["ua-username-wrap","ua-name-wrap","ua-email-wrap","ua-phone-wrap"].forEach(id => {
      const field = overlay.querySelector("#" + id);
      field.hidden = mode === "login" && id !== "ua-username-wrap";
      const input = field.querySelector("input");
      input.required = !field.hidden;
    });
    const password = form.elements.password;
    const passwordHelp = overlay.querySelector("#ua-password-help");
    password.autocomplete = mode === "login" ? "current-password" : "new-password";
    password.minLength = mode === "login" ? 1 : 8;
    password.maxLength = mode === "login" ? 200 : 16;
    password.placeholder = mode === "login" ? "Parolingizni kiriting" : "8–16 belgi";
    passwordHelp.textContent = mode === "login"
      ? "Akkauntingizda avval o‘rnatgan parolni kiriting."
      : "8–16 belgi. Katta va kichik harf, raqam hamda _ belgisi bo‘lsin. Masalan: A1_ulugbek";
    error.textContent = "";
  }
  overlay.querySelectorAll("[data-mode]").forEach(button => button.addEventListener("click", () => setMode(button.dataset.mode)));
  form.addEventListener("submit", async event => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    if (mode === "register" && !/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*_)[A-Za-z\d_]{8,16}$/.test(String(data.password || ""))) {
      error.textContent = "Parol 8–16 belgidan iborat bo‘lsin va katta harf, kichik harf, raqam hamda _ belgisini o‘z ichiga olsin. Masalan: A1_ulugbek";
      return;
    }
    const submit = form.querySelector(".ua-submit");
    submit.disabled = true;
    submit.textContent = "Tekshirilmoqda…";
    error.textContent = "";
    try {
      const payload = mode === "login"
        ? { identifier: data.username, password: data.password }
        : { ...data, role: "student" };
      const response = await fetch(API + (mode === "login" ? "/login" : "/register"), {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload)
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Akkaunt bilan ishlashda xatolik yuz berdi.");
      if (!result.token || !result.user?.id) throw new Error("Server akkaunt sessiyasini qaytarmadi.");
      saveToken(result.token);
      localStorage.setItem("ulugbek-session", String(result.user.id).replace(/-/g, ""));
      window.ULUGBEK_ACCOUNT = result.user;
      overlay.remove();
      if (continueToRequestedPage()) return;
      document.dispatchEvent(new CustomEvent("ulugbek:authenticated", { detail: result.user }));
    } catch (failure) {
      error.textContent = failure.message || "Ulanish xatosi. Qayta urinib ko‘ring.";
    } finally {
      submit.disabled = false;
      submit.textContent = "Davom etish";
    }
  });

  async function boot() {
    const existing = token();
    if (existing) {
      try {
        const response = await fetch(API + "/me", { headers: { Authorization: "Bearer " + existing }, cache: "no-store" });
        const result = await response.json();
        if (!response.ok || !result.user?.id) throw new Error("Sessiya yaroqsiz");
        saveToken(existing);
        localStorage.setItem("ulugbek-session", String(result.user.id).replace(/-/g, ""));
        window.ULUGBEK_ACCOUNT = result.user;
        overlay.remove();
        if (continueToRequestedPage()) return;
        return;
      } catch (_) {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(LEGACY_KEY);
      }
    }
    setMode("register");
  }
  boot();
})();