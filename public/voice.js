"use strict";
const $ = (id) => document.getElementById(id);
const messages = $("messages");
const status = $("status");
const orb = $("orb");
let recognizer = null;
let lastReply = "";
let objectUrl = "";
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
function addMessage(text, role) {
  const p = document.createElement("p");
  p.className = "bubble" + (role === "user" ? " user" : "");
  p.textContent = text;
  messages.append(p);
  p.scrollIntoView({block:"nearest",behavior:"smooth"});
}
function avatarName() { return $("name").value.trim() || "ULUGBEK AI"; }
function speak(text) {
  if (!("speechSynthesis" in window) || $("lang").value === "none") {
    status.textContent = "Bu brauzer ovoz chiqarishni qo‘llamaydi.";
    return;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = $("lang").value;
  utterance.rate = 1;
  utterance.onstart = () => orb.classList.add("speaking");
  utterance.onend = () => orb.classList.remove("speaking");
  utterance.onerror = () => { orb.classList.remove("speaking"); status.textContent = "Ovoz chiqarilmadi; matnni o‘qishingiz mumkin."; };
  window.speechSynthesis.speak(utterance);
}
function localReply(text) {
  const q = text.toLocaleLowerCase("uz");
  if (/salom|assalomu|hello|hi\b/.test(q)) return "Salom! Sizga qanday yordam bera olaman? Men hozir brauzer ichidagi ovozli yordamchi rejimidaman.";
  if (/isming|kimsan|who are you/.test(q)) return "Mening nomim " + avatarName() + ". Ismimni Avatarni sozlash bo‘limida o‘zgartirishingiz mumkin.";
  if (/vaqt|soat|time/.test(q)) return "Qurilmangizdagi hozirgi vaqt: " + new Date().toLocaleTimeString() + ".";
  if (/sana|bugun|date/.test(q)) return "Qurilmangizdagi sana: " + new Date().toLocaleDateString() + ".";
  if (/rahmat|thanks/.test(q)) return "Marhamat! Yana savolingiz bo‘lsa, yozing.";
  return "Xabaringizni oldim: “" + text.slice(0,240) + "”. Hozir katta til modeli bu sahifaga ulanmagan, shuning uchun murakkab savolga ishonchli AI javobi bera olmayman. Haqiqiy AI javoblari uchun serverdagi model yoki rasmiy API ulanishi kerak.";
}
async function send(text) {
  const clean = text.trim();
  if (!clean) return;
  addMessage(clean, "user");
  $("message").value = "";
  status.textContent = "Javob tayyorlanmoqda…";
  let reply;
  try {
    const response = await fetch("/api/chat", {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({message:clean})
    });
    if (!response.ok) throw new Error("API unavailable");
    const data = await response.json();
    reply = typeof data.reply === "string" && data.reply.trim() ? data.reply.trim() : localReply(clean);
  } catch (_) {
    reply = localReply(clean);
  }
  lastReply = reply;
  addMessage(reply, "assistant");
  status.textContent = "Javob tayyor. Istasangiz, yana gapiring.";
  if (document.visibilityState !== "hidden") speak(reply);
}
$("form").addEventListener("submit", (event) => { event.preventDefault(); send($("message").value); });
$("name").addEventListener("input", () => { $("greeting").textContent = "Salom! Men " + avatarName(); });
$("image").addEventListener("change", () => {
  const file = $("image").files && $("image").files[0];
  if (!file) return;
  if (!["image/png","image/jpeg","image/webp"].includes(file.type) || file.size > 5*1024*1024) {
    status.textContent = "PNG, JPG yoki WebP rasm tanlang (5 MB gacha).";
    $("image").value = "";
    return;
  }
  if (objectUrl) URL.revokeObjectURL(objectUrl);
  objectUrl = URL.createObjectURL(file);
  $("avatar-preview").src = objectUrl;
  $("avatar-preview").hidden = false;
  orb.querySelector(".face").hidden = true;
});
$("listen").addEventListener("click", () => {
  if (!SpeechRecognition) {
    status.textContent = "Bu brauzer ovozni matnga aylantirishni qo‘llamaydi. Chrome brauzerida HTTPS orqali sinab ko‘ring yoki matn yozing.";
    return;
  }
  if (recognizer) { try { recognizer.stop(); } catch (_) {} }
  recognizer = new SpeechRecognition();
  recognizer.lang = $("lang").value;
  recognizer.continuous = false;
  recognizer.interimResults = false;
  recognizer.maxAlternatives = 1;
  recognizer.onstart = () => { status.textContent = "Tinglayapman… Gapiring."; $("listen").disabled = true; };
  recognizer.onresult = (event) => {
    const transcript = event.results?.[0]?.[0]?.transcript;
    if (transcript) send(transcript);
  };
  recognizer.onerror = (event) => { status.textContent = event.error === "not-allowed" ? "Mikrofonga ruxsat berilmagan. Brauzer sozlamalaridan ruxsat bering." : "Ovoz tanish xatosi: " + event.error + ". Matn yozib ko‘rishingiz mumkin."; };
  recognizer.onend = () => { $("listen").disabled = false; };
  try { recognizer.start(); } catch (_) { status.textContent = "Mikrofon ishga tushmadi. Bir oz kutib qayta urinib ko‘ring."; $("listen").disabled = false; }
});
$("stop").addEventListener("click", () => {
  if (recognizer) { try { recognizer.stop(); } catch (_) {} }
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  orb.classList.remove("speaking");
  status.textContent = "Ovozli xizmat to‘xtatildi.";
});
$("speak").addEventListener("click", () => { if (lastReply) speak(lastReply); else status.textContent = "Hali eshittiriladigan javob yo‘q."; });
$("clear").addEventListener("click", () => { messages.replaceChildren(); lastReply = ""; status.textContent = "Suhbat tozalandi."; });
window.addEventListener("beforeunload", () => { if ("speechSynthesis" in window) window.speechSynthesis.cancel(); if (recognizer) try { recognizer.stop(); } catch (_) {} if (objectUrl) URL.revokeObjectURL(objectUrl); });
$("greeting").textContent = "Salom! Men " + avatarName();