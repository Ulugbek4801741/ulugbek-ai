"use strict";

const crypto = require("node:crypto");

/**
 * Attach traceable provenance to a retrieved knowledge candidate.
 * This deliberately never approves factual content: human/source review is required.
 */
function buildProvenance({ url, content, fetchedAt = new Date().toISOString(), sourceType = "public-web" } = {}) {
  let parsed;
  try { parsed = new URL(String(url || "")); }
  catch (_) { throw new TypeError("Knowledge source URL is invalid."); }
  if (parsed.protocol !== "https:" || parsed.username || parsed.password ||
      !parsed.hostname || parsed.hostname === "localhost" ||
      parsed.hostname.endsWith(".localhost") || parsed.hostname.endsWith(".local")) {
    throw new TypeError("Knowledge source must be a public HTTPS URL.");
  }
  const text = String(content || "");
  if (!text.trim()) throw new TypeError("Knowledge candidate content is empty.");
  const timestamp = new Date(fetchedAt);
  if (!Number.isFinite(timestamp.getTime())) throw new TypeError("Knowledge fetch timestamp is invalid.");
  return {
    sourceUrl: parsed.href,
    sourceHost: parsed.hostname.toLowerCase(),
    sourceType: String(sourceType || "public-web").slice(0, 60),
    fetchedAt: timestamp.toISOString(),
    contentSha256: crypto.createHash("sha256").update(text, "utf8").digest("hex"),
    verificationStatus: "unverified",
    approvalRequired: true
  };
}

function canEnterChat(candidate) {
  return Boolean(candidate && candidate.status === "approved" &&
    candidate.verificationStatus === "verified" && candidate.approvalRequired === false);
}

module.exports = { buildProvenance, canEnterChat };
