"use strict";
(() => {
  const $ = id => document.getElementById(id);
  const panel = $("media-library-panel");
  if (!panel) return;

  const message = $("media-message");
  const results = $("media-search-results");
  const saved = $("media-library-items");
  const status = $("media-library-status");
  const searchForm = $("media-search-form");
  const searchButton = $("media-search-submit");

  async function request(url, options = {}) {
    const response = await fetch(url, {
      credentials: "same-origin",
      ...options,
      headers: { "Content-Type": "application/json", ...(options.headers || {}) }
    });
    let data = {};
    try { data = await response.json(); } catch (_) {}
    if (!response.ok) throw new Error(data.error || "Server so‘rovni bajarmadi.");
    return data;
  }

  function card(title, details, sourceUrl, action) {
    const article = document.createElement("article");
    article.className = "task-card";
    const heading = document.createElement("h4");
    heading.textContent = title || "Nomsiz media";
    article.appendChild(heading);
    const paragraph = document.createElement("p");
    paragraph.className = "muted";
    paragraph.textContent = details;
    article.appendChild(paragraph);
    if (sourceUrl) {
      const link = document.createElement("a");
      link.href = sourceUrl;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = "Asl manbani ochish";
      article.appendChild(link);
    }
    if (action) article.appendChild(action);
    return article;
  }

  async function loadLibrary() {
    try {
      const [library, summary] = await Promise.all([
        request("/api/admin/media/library?limit=50"),
        request("/api/admin/media/status")
      ]);
      const counts = summary.mediaLibrary || {};
      status.textContent = "Jami: " + (counts.count || 0) + " · Rasmlar: " + (counts.images || 0) +
        " · Videolar: " + (counts.videos || 0) + " · O‘qitishga tasdiqlangan: " + (counts.trainingApproved || 0) +
        ". Barcha yangi fayllar avval tekshiruvdan o‘tishi kerak.";
      saved.replaceChildren();
      if (!library.items?.length) {
        saved.textContent = "Hozircha saqlangan fayl yo‘q.";
        return;
      }
      for (const item of library.items) {
        const details = [
          item.kind === "video" ? "Video" : "Rasm",
          "Litsenziya: " + (item.license || "noma’lum"),
          "Muallif: " + (item.creator || "ko‘rsatilmagan"),
          "Hajm: " + Math.ceil((item.sizeBytes || 0) / 1024) + " KB",
          "Holat: " + (item.trainingStatus || "not-approved")
        ].join(" · ");
        saved.appendChild(card(item.title, details, item.sourceUrl, null));
      }
    } catch (error) {
      status.textContent = error.message;
      saved.textContent = "Omborni yuklab bo‘lmadi.";
    }
  }

  async function searchMedia(query, kind) {
    message.textContent = "Ochiq kataloglardan qidirilmoqda…";
    results.textContent = "";
    searchButton.disabled = true;
    try {
      const params = new URLSearchParams({ q: query, kind, limit: "12" });
      const data = await request("/api/media/search?" + params.toString());
      if (!data.results?.length) {
        results.textContent = "Mos va litsenziyasi tekshirilgan natija topilmadi. " + (data.errors || []).join(" ");
      } else {
        for (const item of data.results) {
          const details = [
            item.provider === "openverse" ? "Openverse" : "Wikimedia Commons",
            item.kind === "video" ? "Video" : "Rasm",
            "Litsenziya: " + item.license + (item.licenseVersion ? " " + item.licenseVersion : ""),
            "Muallif: " + (item.creator || "ko‘rsatilmagan")
          ].join(" · ");
          const button = document.createElement("button");
          button.type = "button";
          button.textContent = "Shaxsiy omborga saqlash";
          button.addEventListener("click", async () => {
            button.disabled = true;
            button.textContent = "Saqlanmoqda…";
            try {
              const imported = await request("/api/admin/media/import", {
                method: "POST",
                body: JSON.stringify({ id: item.id })
              });
              button.textContent = imported.duplicate ? "Oldin saqlangan" : "Saqlandi";
              message.textContent = imported.duplicate ? "Bu media oldin saqlangan." : "Media shaxsiy server omboriga saqlandi.";
              await loadLibrary();
            } catch (error) {
              button.disabled = false;
              button.textContent = "Qayta urinish";
              message.textContent = error.message;
            }
          });
          results.appendChild(card(item.title, details, item.sourceUrl, button));
        }
      }
      if (data.errors?.length) message.textContent = "Ayrim kataloglar javob bermadi: " + data.errors.join(" · ");
      else message.textContent = "Natijalar litsenziya bo‘yicha saralandi. Har bir manbani importdan oldin ko‘rib chiqing.";
    } catch (error) {
      message.textContent = error.message;
      results.textContent = "Qidiruv amalga oshmadi.";
    } finally {
      searchButton.disabled = false;
    }
  }

  searchForm.addEventListener("submit", event => {
    event.preventDefault();
    const query = $("media-search-query").value.trim();
    if (query.length < 2) {
      message.textContent = "Kamida 2 ta belgi yozing.";
      return;
    }
    searchMedia(query, $("media-search-kind").value);
  });
  $("media-refresh").addEventListener("click", loadLibrary);

  async function checkSession() {
    try {
      const data = await request("/api/admin/status");
      if (data.authenticated) loadLibrary();
    } catch (_) {}
  }
  checkSession();
  const dashboard = $("dashboard");
  if (dashboard && typeof MutationObserver !== "undefined") {
    new MutationObserver(() => {
      if (!dashboard.hidden) loadLibrary();
    }).observe(dashboard, { attributes: true, attributeFilter: ["hidden"] });
  }
})();
