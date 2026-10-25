"use strict";

// Lightweight first-line abuse filter. This is not a substitute for a full security review.
const BLOCK_PATTERNS = [
  { id: "credential-theft", pattern: /(?:steal|dump|harvest|exfiltrat|phish|o.g.irla|o.g.irlash|o.g.irlab).{0,70}(?:password|parol|credential|login|akkaunt|session.?cookie|token|cookie)|(?:password|parol|credential|login|akkaunt|session.?cookie|token|cookie).{0,70}(?:steal|dump|harvest|exfiltrat|phish|o.g.irla|o.g.irlash|o.g.irlab)/i },
  { id: "malware-deployment", pattern: /(?:ransomware|keylogger|trojan|spyware|malware|zararli dastur|virus).{0,70}(?:create|build|deploy|hide|evade|spread|yarat|yoz|tarqat|yashir|chetlab|bypass)|(?:create|build|deploy|write|make|yarat|yoz|tarqat).{0,60}(?:ransomware|keylogger|trojan|spyware|malware|zararli dastur|virus)/i },
  { id: "unauthorized-intrusion", pattern: /(?:hack|break into|bypass login|exploit|buzib kir|ruxsatsiz kir|himoyani chetlab).{0,80}(?:someone else|without permission|unauthorized|boshqa odam|ruxsatsiz|begona|akkaunt|tizim|server)|(?:ruxsatsiz|begona akkaunt|boshqa odamning|boshqa birovning).{0,80}(?:kir|buz|hujum|parol|akkaunt|tizim)/i },
  { id: "service-disruption", pattern: /(?:ddos|denial.of.service|botnet|server flood).{0,70}(?:attack|target|hujum|serverni ishdan|flood|down)|(?:attack|hujum|ishdan chiqar).{0,60}(?:ddos|botnet|server)/i },
  { id: "destructive-actions", pattern: /(?:delete|wipe|encrypt|destroy|o.chir|yo.q qil|shifrlab).{0,60}(?:logs?|backup|files?|ma.lumot|database|fayl|zaxira|server)|(?:logs?|backup|files?|database|fayl|zaxira).{0,60}(?:delete|wipe|destroy|o.chir|yo.q qil)/i }
];
function inspectUserMessage(message) {
  if (typeof message !== "string") return { allowed: false, reason: "invalid_input", message: "Xabar matn bo‘lishi kerak." };
  const match = BLOCK_PATTERNS.find((item) => item.pattern.test(message));
  if (!match) return { allowed: true, reason: "allowed" };
  return { allowed: false, reason: match.id, message: "Bu so‘rov ruxsatsiz kirish yoki zarar yetkazishga yordam berishi mumkin. ULUGBEK AI bunday amallarni bajarmaydi. O‘zingizga tegishli tizimni himoyalash, xavfsiz audit yoki zararli faylni zararsiz tahlil qilish bo‘yicha yordam bera olaman." };
}
module.exports = { inspectUserMessage };