"use strict";

(() => {
  const form = document.getElementById("knowledge-zip-form");
  const input = document.getElementById("knowledge-zip-file");
  const upload = document.getElementById("knowledge-zip-upload");
  const exportButton = document.getElementById("knowledge-zip-export");
  const message = document.getElementById("knowledge-zip-message");
  if (!form || !input || !upload || !exportButton || !message) return;

  const MAX_BYTES = 1024 * 1024 * 1024;
  const PART_BYTES = 16 * 1024 * 1024;

  form.addEventListener("submit", async event => {
    event.preventDefault();
    const file = input.files && input.files[0];
    if (!file) {
      message.textContent = "Avval ZIP faylni tanlang.";
      return;
    }
    if (file.size > MAX_BYTES) {
      message.textContent = "ZIP fayl 1 GiB (1 073 741 824 bayt) limitdan oshmasligi kerak.";
      return;
    }
    if (file.size < 22 || !/\.zip$/i.test(file.name)) {
      message.textContent = "Hajmi kamida 22 bayt bo‘lgan ZIP fayl tanlang.";
      return;
    }

    upload.disabled = true;
    input.disabled = true;
    let session = null;
    try {
      message.textContent = "Ikkinchi serverda xavfsiz yuklash sessiyasi ochilmoqda…";
      const startResponse = await fetch("/api/admin/knowledge/vault-upload/start", {
        method: "POST", credentials: "same-origin",
        headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
        body: JSON.stringify({ size: file.size, name: file.name })
      });
      const start = await startResponse.json();
      if (!startResponse.ok || !start.session) throw new Error(start.error || "Yuklash sessiyasi ochilmadi.");
      session = start.session;
      const partSize = Number(start.partBytes) || PART_BYTES;
      const count = Math.ceil(file.size / partSize);

      for (let index = 0; index < count; index++) {
        const from = index * partSize;
        const chunk = file.slice(from, Math.min(file.size, from + partSize));
        let response;
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            response = await fetch("/api/admin/knowledge/vault-upload/" +
              encodeURIComponent(session) + "/" + (index + 1), {
              method: "PUT", credentials: "same-origin",
              headers: { "Content-Type": "application/octet-stream", "X-Requested-With": "XMLHttpRequest" },
              body: chunk
            });
            if (response.ok) break;
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error || "ZIP bo‘lagi yuborilmadi.");
          } catch (error) {
            if (attempt === 3) throw error;
          }
        }
        const percent = Math.min(99, Math.round(((index + 1) / count) * 100));
        message.textContent = "Ikkinchi serverga yuborilmoqda: " + percent + "% (" +
          (index + 1) + "/" + count + " bo‘lak).";
      }

      message.textContent = "Neon omborida ZIP yaxlitligi yakunlanmoqda…";
      const completeResponse = await fetch("/api/admin/knowledge/vault-upload/" +
        encodeURIComponent(session) + "/complete", {
        method: "POST", credentials: "same-origin",
        headers: { "X-Requested-With": "XMLHttpRequest" }
      });
      const result = await completeResponse.json();
      if (!completeResponse.ok) throw new Error(result.error || "ZIP saqlanmadi.");
      message.textContent = "Muvaffaqiyatli saqlandi: " +
        (result.bytes / (1024 * 1024)).toFixed(1) + " MiB. Ikkinchi server / Neon S3. " +
        "Eslatma: ZIP ichidagi kodlar hali tahlil qilinmadi.";
      form.reset();
      session = null;
    } catch (error) {
      message.textContent = error.message || "ZIP yuklashda xatolik yuz berdi.";
    } finally {
      if (session) {
        fetch("/api/admin/knowledge/vault-upload/" + encodeURIComponent(session), {
          method: "DELETE", credentials: "same-origin"
        }).catch(() => {});
      }
      upload.disabled = false;
      input.disabled = false;
    }
  });

  exportButton.addEventListener("click", () => {
    message.textContent = "Bilimlar ZIP arxivi tayyorlanmoqda…";
    window.location.assign("/api/admin/knowledge/export.zip");
  });
})();
