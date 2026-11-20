"use strict";

(() => {
  const form = document.getElementById("knowledge-zip-form");
  const input = document.getElementById("knowledge-zip-file");
  const upload = document.getElementById("knowledge-zip-upload");
  const exportButton = document.getElementById("knowledge-zip-export");
  const message = document.getElementById("knowledge-zip-message");
  if (!form || !input || !upload || !exportButton || !message) return;

  form.addEventListener("submit", async event => {
    event.preventDefault();
    const file = input.files && input.files[0];
    if (!file) {
      message.textContent = "Avval ZIP faylni tanlang.";
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      message.textContent = "ZIP fayl 20 MiB limitdan oshmasligi kerak.";
      return;
    }
    upload.disabled = true;
    message.textContent = "ZIP tekshirilmoqda va bilim bazasiga qo‘shilmoqda…";
    try {
      const response = await fetch("/api/admin/knowledge/import.zip", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/zip", "X-Requested-With": "XMLHttpRequest" },
        body: file
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "ZIP import bajarilmadi.");
      const skipped = Array.isArray(result.skipped) ? result.skipped.length : 0;
      message.textContent = result.importedFiles + " ta fayl import qilindi. " +
        skipped + " ta fayl xavfsizlik yoki format sababli o‘tkazib yuborildi.";
      form.reset();
    } catch (error) {
      message.textContent = error.message || "ZIP importda xatolik yuz berdi.";
    } finally {
      upload.disabled = false;
    }
  });

  exportButton.addEventListener("click", () => {
    message.textContent = "Bilimlar ZIP arxivi tayyorlanmoqda…";
    window.location.assign("/api/admin/knowledge/export.zip");
  });
})();
