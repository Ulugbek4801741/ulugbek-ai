"use strict";
const net = require("node:net");

// Application-layer guard for outbound AI-provider requests.
// The host/container firewall must independently enforce the same egress allowlist.
function allowedHosts() {
  const raw = process.env.AI_ALLOWED_HOSTS || "api.openai.com";
  return new Set(raw.split(",").map((x) => x.trim().toLowerCase()).filter(Boolean));
}
function validateModelEndpoint(value) {
  if (typeof value !== "string" || !value.trim()) {
    return { allowed: false, reason: "missing_endpoint" };
  }
  let url;
  try { url = new URL(value); } catch (_) {
    return { allowed: false, reason: "invalid_url" };
  }
  if (url.protocol !== "https:") return { allowed: false, reason: "https_required" };
  if (url.username || url.password || url.search || url.hash) {
    return { allowed: false, reason: "url_credentials_or_extras_forbidden" };
  }
  if (url.port && url.port !== "443") return { allowed: false, reason: "nonstandard_port_forbidden" };
  const host = url.hostname.toLowerCase().replace(/\.$/, "").replace(/^\[|\]$/g, "");
  if (!host || net.isIP(host)) return { allowed: false, reason: "ip_literal_forbidden" };
  if (!allowedHosts().has(host)) return { allowed: false, reason: "host_not_allowlisted" };
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) {
    return { allowed: false, reason: "private_or_metadata_address_forbidden" };
  }
  return { allowed: true, url: url.toString().replace(/\/$/, ""), host };
}
module.exports = { validateModelEndpoint };
