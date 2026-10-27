"use strict";
(() => {
  const grid = document.getElementById("store-grid");
  const voiceButton = document.getElementById("voice-button");
  const voiceResult = document.getElementById("voice-result");
  const allowed = {
    "google-play": { name: "Google Play", phrases: ["google play", "play market", "pley market", "google pleyni"] },
    "microsoft-store": { name: "Microsoft Store", phrases: ["microsoft store", "microsoft do‘koni", "windows do‘koni", "windows store"] },
    "apple-app-store": { name: "Apple App Store", phrases: ["app store", "apple store", "ayfon do‘koni", "iphone store"] }
  };
  function normalize(value) { return value.toLocaleLowerCase("uz").replace(/[’'‘]/g, "'").replace(/[^a-z0-9\s'-]/g, " ").replace(/\s+/g, " ").trim(); }
  function render(items) {
    grid.replaceChildren();
    for (const item of items) {
      const card = document.createElement("article"); card.className = "vc-store";
      const title = document.createElement("h3"); title.textContent = item.name;
      const platform = document.createElement("p"); platform.textContent = item.note;
      const link = document.createElement("a"); link.href = item.url; link.target = "_blank"; link.rel = "noopener noreferrer"; link.textContent = "Rasmiy do‘konni ochish";
      link.addEventListener("click", (event) => { if (!window.confirm(item.name + " rasmiy sahifasini ochasizmi?")) event.preventDefault(); });
      card.append(title, platform, link); grid.appendChild(card);
    }
  }
  fetch("/api/integrations/app-stores", { headers: { Accept: "application/json" }, cache: "no-store" })
    .then(response => { if (!response.ok) throw new Error("HTTP " + response.status); return response.json(); })
    .then(data => { if (!data.ok || !Array.isArray(data.items)) throw new Error("Katalog formati noto‘g‘ri"); render(data.items); })
    .catch(() => { grid.textContent = "Do‘konlar katalogini serverdan olib bo‘lmadi. Server manzilini tekshiring."; });
  voiceButton.addEventListener("click", () => {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) { voiceResult.textContent = "Bu brauzer ovozli tanishni qo‘llamaydi. Android Chrome orqali urinib ko‘ring."; return; }
    const recognition = new Recognition(); recognition.lang = "uz-UZ"; recognition.interimResults = false; recognition.maxAlternatives = 1;
    recognition.onresult = event => {
      const spoken = normalize(event.results[0][0].transcript);
      voiceResult.textContent = "Eshitildi: “" + spoken + "”.";
      if (!/(och|ochib ber|ishga tushir|open)/i.test(spoken)) { voiceResult.textContent += " Faqat “...ni och” buyrug‘i qabul qilinadi."; return; }
      const id = Object.keys(allowed).find(key => allowed[key].phrases.some(phrase => spoken.includes(normalize(phrase))));
      if (!id) { voiceResult.textContent += " Bu buyruq ruxsat etilgan ro‘yxatda yo‘q."; return; }
      fetch("/api/integrations/app-stores", { cache: "no-store" }).then(r => r.json()).then(data => {
        const item = data.items.find(x => x.id === id);
        if (!item) throw new Error("Do‘kon topilmadi");
        if (window.confirm(item.name + " rasmiy sahifasini ochishga ruxsat berasizmi?")) window.open(item.url, "_blank", "noopener,noreferrer");
        else voiceResult.textContent += " Amal bekor qilindi.";
      }).catch(() => { voiceResult.textContent += " Server katalogi mavjud emas."; });
    };
    recognition.onerror = () => { voiceResult.textContent = "Mikrofon xatosi. Brauzer ruxsatini tekshiring."; };
    recognition.onnomatch = () => { voiceResult.textContent = "Buyruq tushunilmadi."; };
    try { recognition.start(); voiceResult.textContent = "Gapiring. Faqat ruxsat etilgan do‘konni ochish buyruqlari bajariladi."; } catch (_) { voiceResult.textContent = "Ovozli boshqaruvni ishga tushirib bo‘lmadi."; }
  });
})();
/* Touch desktop interactions: visual cursor only; no remote OS commands. */
(() => {
  "use strict";
  const desktop = document.getElementById("touch-desktop");
  if (!desktop) return;
  const cursor = document.getElementById("td-cursor");
  const win = document.getElementById("td-window");
  const title = document.getElementById("td-window-title");
  const body = document.getElementById("td-window-body");
  const power = document.getElementById("td-power");
  let cursorOn = true;
  let powered = true;
  function point(e) {
    const r = desktop.getBoundingClientRect();
    cursor.style.left = Math.max(0, Math.min(r.width, e.clientX-r.left)) + "px";
    cursor.style.top = Math.max(0, Math.min(r.height, e.clientY-r.top)) + "px";
    if (cursorOn && powered) cursor.classList.add("visible");
  }
  desktop.addEventListener("pointermove", e => { if (powered) point(e); });
  desktop.addEventListener("pointerdown", e => {
    if (!powered) return;
    point(e); cursor.classList.remove("tap"); void cursor.offsetWidth; cursor.classList.add("tap");
  });
  desktop.addEventListener("pointerup", () => cursor.classList.remove("tap"));
  function show(app) {
    if (!powered) return;
    win.hidden = false;
    body.replaceChildren();
    const p = document.createElement("p");
    if (app === "computer") {
      title.textContent = "🖥️ Kompyuter haqida";
      p.textContent = "ULUGBEK AI sensorli virtual ish stoli. Bu brauzer prototipi; haqiqiy Windows tizimi yoki bulutli kompyuter hozircha ulanmagan.";
      body.appendChild(p);
      const info = document.createElement("p"); info.textContent = "Sensor kursor: " + (cursorOn ? "yoqilgan" : "yashirilgan") + " · Saqlash: ushbu brauzer"; body.appendChild(info);
    } else if (app === "help") {
      title.textContent = "❔ Sensorli boshqaruv";
      p.textContent = "1. Ish stoli ichida barmog‘ingizni suring. 2. Yorqin doira kursorni ko‘rsatadi. 3. Belgilarni bosing. 4. Eslatmalar avtomatik saqlanadi. Bu oynalar namuna ilovalardir, haqiqiy Windows dasturlari emas.";
      body.appendChild(p);
    } else if (app === "notes") {
      title.textContent = "📝 Eslatmalar";
      p.textContent = "Yozgan matningiz ushbu brauzer qurilmasida saqlanadi.";
      const area = document.createElement("textarea"); area.placeholder = "Bu yerga yozing…";
      try { area.value = localStorage.getItem("ulugbek-vc-notes") || ""; } catch (_) {}
      const save = document.createElement("button"); save.textContent = "Saqlash";
      const msg = document.createElement("span"); msg.style.marginLeft = "8px";
      save.addEventListener("click", () => { try { localStorage.setItem("ulugbek-vc-notes", area.value); msg.textContent = " Saqlandi ✓"; } catch (_) { msg.textContent = " Saqlab bo‘lmadi"; } });
      body.append(p, area, save, msg);
    } else if (app === "files") {
      title.textContent = "📁 Fayllar";
      p.textContent = "Qurilmangizdan fayl tanlang. Tanlangan fayllar serverga yuklanmaydi.";
      const input = document.createElement("input"); input.type = "file"; input.multiple = true;
      const list = document.createElement("div");
      input.addEventListener("change", () => {
        list.replaceChildren();
        Array.from(input.files || []).forEach(file => { const item = document.createElement("div"); item.className = "file-item"; item.textContent = "📄 " + file.name + " · " + Math.ceil(file.size/1024) + " KB"; list.appendChild(item); });
      });
      body.append(p, input, list);
    }
  }
  desktop.querySelectorAll("[data-td-app]").forEach(button => button.addEventListener("click", () => show(button.dataset.tdApp)));
  document.getElementById("td-close").addEventListener("click", () => { win.hidden = true; });
  document.getElementById("td-cursor-toggle").addEventListener("click", event => {
    cursorOn = !cursorOn; cursor.classList.toggle("visible", cursorOn && powered);
    event.currentTarget.textContent = cursorOn ? "☝️ Sensor kursorini yashirish" : "☝️ Sensor kursorini ko‘rsatish";
  });
  document.getElementById("td-fullscreen").addEventListener("click", async () => {
    try { if (!document.fullscreenElement) await desktop.requestFullscreen(); else await document.exitFullscreen(); }
    catch (_) { show("help"); }
  });
  document.getElementById("td-power-toggle").addEventListener("click", () => {
    powered = false; win.hidden = true; power.hidden = false; cursor.classList.remove("visible");
  });
  document.getElementById("td-boot").addEventListener("click", () => {
    powered = true; power.hidden = true; cursorOn = true; cursor.classList.add("visible");
    document.getElementById("td-cursor-toggle").textContent = "☝️ Sensor kursorini yashirish";
  });
  function clock() { const el = document.getElementById("td-clock"); if (el) el.textContent = new Date().toLocaleTimeString("uz-UZ", {hour:"2-digit", minute:"2-digit"}); }
  clock(); setInterval(clock, 15000);
})();
