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
  function api(path) { const base = typeof window.ULUGBEK_API_BASE_URL === "string" ? window.ULUGBEK_API_BASE_URL.trim().replace(/\\/$/, "") : ""; return (base ? base + "/" : "/") + path.replace(/^\\//, ""); }
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
  fetch(api("api/integrations/app-stores"), { headers: { Accept: "application/json" }, cache: "no-store" })
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
      fetch(api("api/integrations/app-stores"), { cache: "no-store" }).then(r => r.json()).then(data => {
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