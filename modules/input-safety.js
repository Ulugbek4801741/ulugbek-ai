"use strict";

// Lightweight first-line abuse filter. This is not a substitute for a full security review.
const BLOCK_PATTERNS = [
  { id: "credential-theft", pattern: /(?:steal|dump|harvest|exfiltrat).{0,45}(?:password|credential|session.?cookie|token)|(?:parol|akkaunt|cookie).{0,45}(?:o.g.irla|o.g.irla|o.girlash|o.girlab|o.g.irlash|o.g.irlab|o.g.irlash|o.g.irlash)/i },
  { id: "malware-deployment", pattern: /(?:ransomware|keylogger|trojan|spyware).{0,60}(?:create|build|deploy|hide|evade|spread|yarat|yoz|tarqat|yashir|chetlab)|(?:create|build|deploy|write|make|yarat|yoz).{0,50}(?:ransomware|keylogger|trojan|spyware)/i },
  { id: "unauthorized-intrusion", pattern: /(?:hack|break into|bypass login|exploit).{0,60}(?:someone else|without permission|unauthorized|boshqa odam|ruxsatsiz|begona tizim)|(?:ruxsatsiz|begona akkaunt|boshqa odamning).{0,60}(?:kir|buz|hujum|parol)/i },
  { id: "service-disruption", pattern: /(?:ddos|denial.of.service).{0,50}(?:attack|target|hujum|serverni ishdan)|(?:botnet).{0,50}(?:attack|flood|hujum)/i }
];
function inspectUserMessage(message) {
  if (typeof message !== "string") return { allowed: false, reason: "invalid_input", message: "Xabar matn bo‘lishi kerak." };
  const match = BLOCK_PATTERNS.find((item) => item.pattern.test(message));
  if (!match) return { allowed: true, reason: "allowed" };
  return { allowed: false, reason: match.id, message: "Bu so‘rov ruxsatsiz kirish yoki zarar yetkazishga yordam berishi mumkin. ULUGBEK AI bunday amallarni bajarmaydi. O‘zingizga tegishli tizimni himoyalash, xavfsiz audit yoki zararli faylni zararsiz tahlil qilish bo‘yicha yordam bera olaman." };
}
module.exports = { inspectUserMessage };