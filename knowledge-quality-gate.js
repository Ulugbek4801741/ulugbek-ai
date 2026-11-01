"use strict";

const ALLOWED = new Set(["uz.wikipedia.org", "en.wikipedia.org", "ru.wikipedia.org"]);
const MIN_CONTENT_LENGTH = 120;
const MAX_CONTENT_LENGTH = 4000;

function verifyKnowledgeCandidate(candidate, existing = []) {
  const reject = reason => ({ ok: false, reason, score: 0 });
  if (!candidate || typeof candidate !== "object") return reject("invalid_candidate");
  const title = typeof candidate.title === "string" ? candidate.title.trim() : "";
  const content = typeof candidate.content === "string" ? candidate.content.trim() : "";
  if (title.length < 3 || title.length > 180) return reject("invalid_title");
  if (content.length < MIN_CONTENT_LENGTH || content.length > MAX_CONTENT_LENGTH) return reject("content_length_out_of_range");
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(content)) return reject("control_characters");
  let source;
  try { source = new URL(candidate.source); } catch (_) { return reject("invalid_source_url"); }
  if (source.protocol !== "https:" || !ALLOWED.has(source.hostname) ||
      !source.pathname.startsWith("/wiki/") || source.search || source.hash) {
    return reject("source_not_allowlisted");
  }
  const language = source.hostname.split(".")[0];
  if (candidate.language !== language) return reject("source_language_mismatch");
  if (existing.some(item => item && (item.source === candidate.source ||
      (String(item.title || "").toLocaleLowerCase() === title.toLocaleLowerCase() &&
       String(item.language || "") === language)))) return reject("duplicate_source_or_title");
  // These phrases are not automatically proof of malicious content, but require human review.
  const suspicious = /(ignore (all )?(previous|prior) instructions|reveal (the )?(system|developer) prompt|send .*password|api key is)/i.test(content);
  return {
    ok: true,
    score: suspicious ? 50 : 80,
    status: "pending-review",
    quality: suspicious ? "flagged-for-human-review" : "source-and-format-checked",
    checks: ["https", "allowlisted-wikipedia-domain", "language-match", "content-length", "duplicate-check"],
    requiresHumanReview: true,
    note: "Bu tekshiruv manba va formatni tekshiradi; faktlarning rostligini isbotlamaydi. Chat faqat administrator tasdiqlagan bilimdan foydalanishi kerak."
  };
}

module.exports = { verifyKnowledgeCandidate, ALLOWED_KNOWLEDGE_HOSTS: [...ALLOWED] };
