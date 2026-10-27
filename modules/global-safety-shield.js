"use strict";

const crypto = require("node:crypto");
const MAX_EVENTS = 500;
const WINDOW_MS = 10 * 60 * 1000;
const BLOCK_THRESHOLD = 3;
const events = [];
const counters = new Map();
const quarantined = new Map();

function digest(value) {
  return crypto.createHash("sha256").update(String(value || "")).digest("hex").slice(0, 16);
}
function addEvent({ type, severity = "info", reason = "unspecified", sessionId = "", ip = "", messageLength = 0 }) {
  const event = {
    id: crypto.randomUUID(),
    at: new Date().toISOString(),
    type,
    severity,
    reason: String(reason).slice(0, 80),
    sessionHash: sessionId ? digest(sessionId) : null,
    ipHash: ip ? digest(ip) : null,
    messageLength: Number.isFinite(messageLength) ? Math.max(0, Math.min(messageLength, 4000)) : 0
  };
  events.push(event);
  if (events.length > MAX_EVENTS) events.splice(0, events.length - MAX_EVENTS);
  return event;
}
function inspectChat({ message, sessionId, ip, inputSafety }) {
  const now = Date.now();
  const key = digest(sessionId || ip || "unknown");
  for (const [k, value] of counters) if (now - value.firstAt > WINDOW_MS) counters.delete(k);
  if (quarantined.has(key)) {
    addEvent({ type: "blocked", severity: "high", reason: "session_quarantined", sessionId, ip, messageLength: message.length });
    return { allowed: false, reason: "session_quarantined", quarantined: true, message: "Xavfsizlik tekshiruvi sababli ushbu sessiya vaqtincha to‘xtatilgan. Administrator ko‘rib chiqishi kerak." };
  }
  if (inputSafety && inputSafety.allowed === false) {
    const previous = counters.get(key) || { count: 0, firstAt: now };
    previous.count += 1;
    counters.set(key, previous);
    const quarantine = previous.count >= BLOCK_THRESHOLD;
    if (quarantine) quarantined.set(key, { at: new Date().toISOString(), reason: inputSafety.reason || "repeated_suspicious_requests" });
    addEvent({ type: "blocked", severity: quarantine ? "critical" : "high", reason: inputSafety.reason || "input_safety", sessionId, ip, messageLength: message.length });
    return {
      allowed: false,
      reason: inputSafety.reason || "input_safety",
      quarantined: quarantine,
      message: quarantine
        ? "Takroriy xavfli so‘rovlar sababli sessiya vaqtincha karantinga olindi. Administrator tekshiruvigacha davom etib bo‘lmaydi."
        : inputSafety.message
    };
  }
  addEvent({ type: "allowed", severity: "info", reason: "passed_first_line_check", sessionId, ip, messageLength: message.length });
  return { allowed: true, reason: "passed_first_line_check", quarantined: false };
}
function getStatus() {
  return {
    enabled: true,
    mode: "server-side-first-line-controls",
    guarantees: "not_absolute",
    eventCount: events.length,
    quarantinedSessions: quarantined.size,
    maxEvents: MAX_EVENTS,
    windowMinutes: WINDOW_MS / 60000,
    suspiciousRequestThreshold: BLOCK_THRESHOLD,
    note: "Xotiradagi jurnal server qayta ishga tushganda yo‘qoladi. Bu tarmoq darajasidagi firewall, to‘liq SIEM yoki mutlaq himoya emas."
  };
}
function listEvents(limit = 100) {
  const safeLimit = Number.isInteger(limit) ? Math.max(1, Math.min(limit, 200)) : 100;
  return events.slice(-safeLimit).reverse();
}
function listQuarantines() {
  return [...quarantined.entries()].map(([sessionHash, value]) => ({ sessionHash, ...value }));
}
function releaseQuarantine(sessionHash, adminNote = "") {
  if (typeof sessionHash !== "string" || !/^[a-f0-9]{16}$/.test(sessionHash)) {
    const error = new Error("Sessiya identifikatori noto‘g‘ri.");
    error.status = 400;
    throw error;
  }
  const existed = quarantined.delete(sessionHash);
  addEvent({ type: existed ? "quarantine_released" : "quarantine_release_noop", severity: "medium", reason: String(adminNote || "admin_review").slice(0, 80) });
  return { released: existed, sessionHash };
}
function auditAdminAction(action, reason = "") {
  addEvent({ type: "admin_action", severity: "medium", reason: String(action + (reason ? ":" + reason : "")).slice(0, 80) });
}
module.exports = { inspectChat, getStatus, listEvents, listQuarantines, releaseQuarantine, auditAdminAction };
