"use strict";
(() => {
  const $ = selector => document.querySelector(selector);
  const api = (window.ULUGBEK_API_BASE_URL || window.location.origin).replace(/\/$/, "") + "/api/social";
  const TOKEN_KEY = "ulugbek-account-token";
  const LEGACY_TOKEN_KEY = "ulugbek-vizor-token";
  let token = localStorage.getItem(TOKEN_KEY) || localStorage.getItem(LEGACY_TOKEN_KEY) || "";
  let currentUser = null;
  const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  })[char]);
  const toast = message => {
    const node = $("#toast");
    node.textContent = message;
    node.classList.add("show");
    setTimeout(() => node.classList.remove("show"), 2800);
  };
  const loginUrl = "/?account=login&next=%2Fsocial.html";
  async function req(path, options = {}) {
    const response = await fetch(api + path, {
      ...options,
      headers: {
        "Content-Type":"application/json",
        ...(token ? { Authorization:"Bearer " + token } : {}),
        ...(options.headers || {})
      }
    });
    const data = await response.json().catch(() => ({ error:"Server javobi o‘qilmadi." }));
    if (!response.ok) {
      const error = new Error(data.error || "So‘rov bajarilmadi.");
      error.status = response.status;
      throw error;
    }
    return data;
  }
  function show() {
    $("#auth").hidden = true;
    $("#community").hidden = false;
    posts();
    groups();
  }
  async function init() {
    try {
      const status = await req("/status");
      $("#status").textContent = status.features.accounts ? "Server ulangan" : "Sessiya xizmati sozlanmagan";
      $("#file-note").textContent = status.storage.warning;
      if (!token) return window.location.replace(loginUrl);
      try { const me = await req("/me"); currentUser = me.user; show(); }
      catch (error) {
        if (error.status === 401) {
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(LEGACY_TOKEN_KEY);
          return window.location.replace(loginUrl);
        }
        throw error;
      }
    } catch (error) {
      $("#status").textContent = "Server bilan aloqa yo‘q";
      $("#auth").hidden = false;
      $("#community").hidden = true;
      const authMessage = $("#auth p");
      if (authMessage) authMessage.textContent = "Hamjamiyat yuklanmadi: " + error.message + ". Qayta urinish yoki akkauntga kirish uchun quyidagi tugmadan foydalaning.";
      toast(error.message);
    }
  }
  $("#logout").textContent = "Bosh sahifa";
  $("#logout").onclick = () => { window.location.href = "/"; };
  async function posts() {
    try {
      const data = await req("/posts");
      $("#posts").innerHTML = data.posts.length ? data.posts.map(post =>
        '<article class="post" data-id="' + esc(post.id) + '">' +
          '<div class="post-head"><b>' + esc(post.author.displayName) + ' · @' + esc(post.author.username) + '</b>' +
          '<span>' + new Date(post.createdAt).toLocaleString("uz-UZ") + '</span></div>' +
          '<p>' + esc(post.text) + '</p>' +
          (post.mediaUrl ? (/\.(mp4|webm)$/i.test(post.mediaUrl)
            ? '<video controls src="' + esc(post.mediaUrl) + '"></video>'
            : /\.(ogg|mp3)$/i.test(post.mediaUrl) ? '<audio controls src="' + esc(post.mediaUrl) + '"></audio>'
            : '<img loading="lazy" src="' + esc(post.mediaUrl) + '" alt="Post rasmi">') : "") +
          '<div class="actions"><button data-like="' + esc(post.id) + '">♡ ' + post.likes + '</button>' +
          '<a class="call-link" target="_blank" rel="noopener noreferrer" href="https://meet.jit.si/ULUGBEK-post-' + esc(post.id) + '">📹 Video chat</a>' +
          '<a class="call-link" target="_blank" rel="noopener noreferrer" href="https://meet.jit.si/ULUGBEK-post-' + esc(post.id) + '#config.disableVideo=true">🎙️ Ovozli chat</a>' +
          '<span class="hint">' + post.comments.length + ' izoh</span></div>' +
          '<div>' + post.comments.map(comment => '<div class="comment"><b>@' +
            esc(comment.username) + '</b> ' + esc(comment.text) + '</div>').join("") + '</div>' +
          '<form class="comment-form" data-comment="' + esc(post.id) + '">' +
          '<input name="text" placeholder="Izoh yozing…" required><button class="secondary">Yuborish</button></form></article>'
      ).join("") : '<div class="panel hint">Hozircha post yo‘q. Birinchi postni siz joylang.</div>';
      $("#posts").querySelectorAll("[data-like]").forEach(button => button.onclick = async () => {
        try { await req("/posts/" + button.dataset.like + "/like", { method:"POST", body:"{}" }); posts(); }
        catch (error) { toast(error.message); }
      });
      $("#posts").querySelectorAll("[data-comment]").forEach(form => form.onsubmit = async event => {
        event.preventDefault();
        try {
          await req("/posts/" + form.dataset.comment + "/comments", {
            method:"POST", body:JSON.stringify({ text:new FormData(form).get("text") })
          });
          posts();
        } catch (error) { toast(error.message); }
      });
    } catch (error) { toast(error.message); }
  }
  $("#post-form").onsubmit = async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const file = $("#media").files[0] || $("#voice-file").files[0];
    const text = new FormData(form).get("text");
    try {
      let mediaUrl = "";
      if (file) {
        if (file.size > 8 * 1024 * 1024) throw new Error("Fayl 8 MB dan katta.");
        const dataUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        mediaUrl = (await req("/media", { method:"POST", body:JSON.stringify({ dataUrl }) })).mediaUrl;
      }
      await req("/posts", { method:"POST", body:JSON.stringify({ text, mediaUrl }) });
      form.reset(); posts(); toast("Post serverga joylandi.");
    } catch (error) { toast(error.message); }
  };
  $("#message-form").onsubmit = async event => {
    event.preventDefault();
    try {
      await req("/messages", { method:"POST", body:JSON.stringify(Object.fromEntries(new FormData(event.currentTarget))) });
      event.currentTarget.reset(); toast("Xabar yuborildi.");
    } catch (error) { toast(error.message); }
  };
  $("#group-form").onsubmit = async event => {
    event.preventDefault();
    try {
      await req("/groups", { method:"POST", body:JSON.stringify(Object.fromEntries(new FormData(event.currentTarget))) });
      event.currentTarget.reset(); groups(); toast("Guruh yaratildi.");
    } catch (error) { toast(error.message); }
  };
  async function groups() {
    try {
      const data = await req("/groups");
      $("#groups").innerHTML = data.groups.length ? data.groups.map(group =>
        '<div class="group"><b>' + esc(group.name) + '</b><br><span class="hint">' +
        esc(group.description) + ' · ' + group.members + ' a’zo</span><button class="secondary" data-join="' + esc(group.id) + '">Guruhga qo‘shilish</button></div>'
      ).join("") : '<span class="hint">Hozircha guruh yo‘q.</span>';
      $("#groups").querySelectorAll("[data-join]").forEach(button => button.onclick = async () => {
        try { await req("/groups/" + button.dataset.join + "/join", { method:"POST", body:"{}" }); groups(); toast("Guruhga qo‘shildingiz."); }
        catch (error) { toast(error.message); }
      };
    } catch (error) { $("#groups").textContent = error.message; }
  }
  $("#refresh").onclick = posts;
  $("#voice-file").onchange = () => { if ($("#voice-file").files[0]) $("#media").value = ""; };
  $("#messages-load").onclick = async () => {
    const username = $("#messages-user").value.trim().replace(/^@/, "");
    if (!username) return toast("Login kiriting.");
    try {
      const data = await req("/messages/" + encodeURIComponent(username));
      $("#messages-list").innerHTML = data.messages.length ? data.messages.map(m => '<div class="comment"><b>@' + esc(m.fromUsername) + '</b> ' + esc(m.text) + '<small> · ' + new Date(m.createdAt).toLocaleString("uz-UZ") + '</small></div>').join("") : '<span class="hint">Bu suhbatda hali xabar yo‘q.</span>';
    } catch (error) { $("#messages-list").textContent = error.message; }
  };
  init();
})();