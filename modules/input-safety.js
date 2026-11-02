"use strict";

// First-line text filter only; it is not a full security classifier or firewall.
const BLOCK_PATTERNS = [
  { id: "credential-theft", pattern: /(?:steal|dump|harvest|exfiltrat|phish|o.g.irla|o.g.irlash).{0,80}(?:password|parol|credential|login|akkaunt|session.?cookie|token|cookie)|(?:password|parol|credential|login|akkaunt|session.?cookie|token|cookie).{0,80}(?:steal|dump|harvest|exfiltrat|phish|o.g.irla|o.g.irlash)/i },
  { id: "malware-deployment", pattern: /(?:ransomware|keylogger|trojan|spyware|malware|zararli dastur|virus).{0,70}(?:create|build|deploy|hide|evade|spread|yarat|yoz|tarqat|yashir|bypass)|(?:create|build|deploy|write|make|yarat|yoz|tarqat).{0,60}(?:ransomware|keylogger|trojan|spyware|malware|zararli dastur|virus)/i },
  { id: "unauthorized-intrusion", pattern: /(?:hack|break into|bypass login|exploit|buzib kir|ruxsatsiz kir|himoyani chetlab).{0,80}(?:someone else|without permission|unauthorized|boshqa odam|ruxsatsiz|begona|akkaunt|tizim|server)|(?:ruxsatsiz|begona akkaunt|boshqa odamning|boshqa birovning).{0,80}(?:kir|buz|hujum|parol|akkaunt|tizim)/i },
  { id: "service-disruption", pattern: /(?:ddos|denial.of.service|botnet|server flood).{0,70}(?:attack|target|hujum|serverni ishdan|flood|down)|(?:attack|hujum|ishdan chiqar).{0,60}(?:ddos|botnet|server)/i },
  { id: "unauthorized-surveillance", pattern: /(?:spy on|track|monitor|record|kuzat|josuslik|tingla).{0,80}(?:without consent|without permission|secretly|ruxsatsiz|yashirincha|birovning telefoni|begona qurilma|kamera|mikrofon)|(?:secretly|yashirincha|ruxsatsiz).{0,80}(?:camera|microphone|kamera|mikrofon|location|joylashuv)/i },
  { id: "data-exfiltration", pattern: /(?:exfiltrat|steal|download|export|dump|o.g.irla|ko.chirib ol|yuklab ol).{0,80}(?:private data|customer data|personal data|database|ma.lumotlar bazasi|foydalanuvchi ma.lumotlari|shaxsiy ma.lumotlar|secret keys|api keys|maxfiy kalitlar)|(?:private data|customer data|personal data|shaxsiy ma.lumotlar|foydalanuvchi ma.lumotlari|api keys|maxfiy kalitlar).{0,80}(?:exfiltrat|steal|download|dump|o.g.irla|ko.chirib ol)/i },
  { id: "destructive-actions", pattern: /(?:delete|wipe|encrypt|destroy|o.chir|yo.q qil|shifrlab).{0,60}(?:logs?|backup|files?|ma.lumot|database|fayl|zaxira|server)|(?:logs?|backup|files?|database|fayl|zaxira).{0,60}(?:delete|wipe|destroy|o.chir|yo.q qil)/i }
];
function inspectUserMessage(message) {
  if (typeof message !== "string") return { allowed: false, reason: "invalid_input", message: "Xabar matn bo‘lishi kerak." };
  const match = BLOCK_PATTERNS.find((item) => item.pattern.test(message));
  if (!match) return { allowed: true, reason: "allowed" };
  return {
    allowed: false,
    reason: match.id,
    message: "Bu so‘rov zararli yoki ruxsatsiz amalga yordam berishi mumkin. ULUGBEK AI bunday amallarni bajarmaydi. O‘zingizga tegishli tizimni himoyalash, xavfsiz audit yoki hodisani tekshirishda yordam bera olaman."
  };
}
module.exports = { inspectUserMessage };
