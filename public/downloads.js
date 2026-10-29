"use strict";
(() => {
  const owner = "Ulugbek4801741";
  const repo = "ulugbek-ai";
  const releaseUrl = "https://github.com/" + owner + "/" + repo + "/releases";
  const status = document.getElementById("release-status");
  const platforms = {
    android: { status: document.getElementById("android-status"), actions: document.getElementById("android-actions"), matches: /\.apk$/i, label: "Android APK" },
    windows: { status: document.getElementById("windows-status"), actions: document.getElementById("windows-actions"), matches: /\.(exe|msi)$/i, label: "Windows o‘rnatgich" },
    ios: { status: document.getElementById("ios-status"), actions: document.getElementById("ios-actions"), matches: /\.ipa$/i, label: "iPhone IPA" }
  };
  function makeLink(url, text, primary) {
    const link = document.createElement("a");
    link.href = url;
    link.textContent = text;
    link.className = primary ? "download-primary" : "download-secondary";
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    return link;
  }
  function bytes(size) {
    if (!Number.isFinite(size) || size <= 0) return "";
    const units = ["B", "KB", "MB", "GB"];
    let value = size, index = 0;
    while (value >= 1024 && index < units.length - 1) { value /= 1024; index++; }
    return " · " + value.toFixed(index ? 1 : 0) + " " + units[index];
  }
  fetch("https://api.github.com/repos/" + owner + "/" + repo + "/releases?per_page=10", {
    headers: { Accept: "application/vnd.github+json" },
    cache: "no-store"
  }).then(response => {
    if (!response.ok) throw new Error("HTTP " + response.status);
    return response.json();
  }).then(releases => {
    const published = Array.isArray(releases) ? releases.filter(release => !release.draft && !release.prerelease) : [];
    let total = 0;
    for (const release of published) {
      for (const asset of (release.assets || [])) {
        for (const key of Object.keys(platforms)) {
          const platform = platforms[key];
          if (!platform.matches.test(asset.name)) continue;
          if (!platform.seen) {
            platform.seen = true;
            platform.status.textContent = "Mavjud: " + release.tag_name + " · " + asset.name + bytes(asset.size);
            platform.status.classList.remove("status-unavailable");
            platform.status.classList.add("status-ready");
            platform.actions.replaceChildren(makeLink(asset.browser_download_url, "Yuklab olish" + bytes(asset.size), true), makeLink(release.html_url, "Reliz tafsilotlari", false));
          }
          total++;
        }
      }
    }
    for (const key of Object.keys(platforms)) {
      const platform = platforms[key];
      if (!platform.seen && key !== "ios") {
        platform.status.textContent = "Hali rasmiy yuklab olish fayli chiqarilmagan. Build sahifasidan jarayonni tekshiring.";
      }
    }
    status.textContent = published.length
      ? (total ? "Rasmiy relizlar tekshirildi. Yuklab olish tugmalari mavjud fayllarga bog‘langan." : "Rasmiy relizlar topildi, lekin Android APK yoki Windows/iPhone o‘rnatish fayllari hali joylanmagan.")
      : "Hozircha rasmiy reliz yo‘q. Android va Windows buildlari alohida tayyorlanishi, so‘ng relizga joylanishi kerak.";
  }).catch(() => {
    status.textContent = "GitHub relizlarini hozir tekshirib bo‘lmadi. Quyidagi build va reliz havolalari orqali holatni ko‘ring.";
  });
  document.querySelectorAll('a[href="' + releaseUrl + '"]').forEach(link => {
    link.addEventListener("click", () => { link.href = releaseUrl; });
  });
})();