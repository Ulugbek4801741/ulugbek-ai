"use strict";
(() => {
  const menu = document.getElementById("business-menu");
  const modal = document.getElementById("builder-modal");
  const title = document.getElementById("builder-title");
  const task = document.getElementById("builder-task");
  if (!menu || !modal || !title || !task) return;

  const entries = [
    { id: "business-create", icon: "🚀", label: "Yangi biznes yaratish", detail: "G‘oyadan biznes loyihasi rejasigacha" },
    { id: "business-automation", icon: "⚙️", label: "Biznesni avtomatlashtirish", detail: "Takroriy ishlar va jarayonlarni rejalash" }
  ];
  const divider = menu.querySelector(".business-menu-divider");
  for (const entry of entries) {
    if (menu.querySelector('[data-open="' + entry.id + '"]')) continue;
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.open = entry.id;
    const icon = document.createElement("span");
    icon.textContent = entry.icon;
    const text = document.createElement("span");
    const name = document.createElement("b");
    name.textContent = entry.label;
    const detail = document.createElement("small");
    detail.textContent = entry.detail;
    text.append(name, detail);
    button.append(icon, text);
    menu.insertBefore(button, divider || null);
  }

  menu.addEventListener("click", event => {
    const button = event.target.closest('[data-open="business-create"], [data-open="business-automation"]');
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    menu.hidden = true;
    const automation = button.dataset.open === "business-automation";
    title.textContent = automation ? "Biznesni avtomatlashtirish" : "Yangi biznes yaratish";
    const subtitle = modal.querySelector(".settings-header p");
    if (subtitle) subtitle.textContent = automation
      ? "Jarayonni tasvirlang — ULUGBEK AI avtomatlashtirish rejasini tuzadi."
      : "Biznes g‘oyangizni yozing — ULUGBEK AI ishga tushirish rejasini tuzadi.";
    const label = modal.querySelector('label[for="builder-task"]');
    if (label) label.textContent = automation ? "Qaysi ish yoki jarayonni avtomatlashtirmoqchisiz?" : "Qanday biznes yaratmoqchisiz?";
    task.placeholder = automation
      ? "Masalan: buyurtmalarni qabul qilish, mijozlarga javob berish va hisobotlarni avtomatlashtirish..."
      : "Masalan: Buxoroda onlayn oziq-ovqat do‘koni, yetkazib berish va reklama...";
    task.value = "";
    const result = document.getElementById("builder-result");
    if (result) { result.textContent = ""; result.classList.remove("busy"); }
    modal.hidden = false;
    task.focus({ preventScroll: true });
  }, true);
})();
