"use strict";

const crypto = require("node:crypto");
const registry = require("../agents/registry");

const ROLE_ALIASES = Object.freeze({
  default: "generalist",
  explorer: "researcher",
  worker: "engineer"
});
const BASE_ROLES = new Set([
  "generalist", "researcher", "analyst", "engineer", "verifier",
  "legal", "translator", "business", "documenter", "educator",
  "creative", "dataAnalyst"
]);
const MAX_BOARD_MESSAGES = 100;
const MAX_MESSAGE_LENGTH = 2000;

function normalizeRole(value) {
  const requestedRole = String(value || "").trim();
  const role = ROLE_ALIASES[requestedRole] || requestedRole;
  const known = BASE_ROLES.has(role) || Boolean(registry.getAgent(role));
  if (!known) return null;
  return { requestedRole, role };
}

function normalizeRoles(requested, fallbackRoles = ["generalist"], maxRoles = 6) {
  const source = Array.isArray(requested) && requested.length
    ? requested
    : fallbackRoles;
  const roles = [];
  const mappings = [];
  for (const value of source) {
    const normalized = normalizeRole(value);
    if (!normalized || roles.includes(normalized.role)) continue;
    roles.push(normalized.role);
    mappings.push(normalized);
    if (roles.length >= Math.max(1, Math.min(6, Number(maxRoles) || 6))) break;
  }
  if (!roles.length) {
    roles.push("generalist");
    mappings.push({ requestedRole: "generalist", role: "generalist" });
  }
  return { roles, mappings };
}

function createThread(options = {}) {
  const taskId = String(options.taskId || "").trim();
  const normalized = normalizeRole(options.requestedRole || options.role);
  if (!taskId) throw new TypeError("Thread uchun taskId kerak.");
  if (!normalized) throw new TypeError("Noma'lum agent roli.");
  const depth = Math.max(1, Number(options.depth) || 1);
  const maxDepth = Math.max(1, Math.min(3, Number(options.maxDepth) || 1));
  if (depth > maxDepth) {
    throw Object.assign(new Error("Agent ichma-ich chaqirish chuqurligi limitdan oshdi."), { statusCode: 429 });
  }
  const role = normalized.role;
  const permission = normalized.requestedRole === "explorer"
    ? "read-only-analysis"
    : normalized.requestedRole === "worker"
      ? "code-proposal-only"
      : "task-scoped-analysis";
  return Object.freeze({
    threadId: "thread_" + crypto.randomUUID().replace(/-/g, "").slice(0, 16),
    taskId,
    requestedRole: normalized.requestedRole,
    role,
    parentThreadId: options.parentThreadId || null,
    depth,
    maxDepth,
    permission,
    canExecuteCommands: false,
    canWriteRepository: false,
    status: "created"
  });
}

function createMessageBoard(taskId, options = {}) {
  const id = String(taskId || "").trim();
  if (!id) throw new TypeError("Message board uchun taskId kerak.");
  const limit = Math.max(1, Math.min(MAX_BOARD_MESSAGES, Number(options.maxMessages) || MAX_BOARD_MESSAGES));
  const messages = [];

  function publish(message = {}) {
    const content = String(message.content || "").trim().slice(0, MAX_MESSAGE_LENGTH);
    if (!content) throw new TypeError("Xabar matni bo'sh.");
    const entry = Object.freeze({
      messageId: "msg_" + crypto.randomUUID().replace(/-/g, "").slice(0, 12),
      taskId: id,
      from: String(message.from || "system").slice(0, 80),
      to: String(message.to || "coordinator").slice(0, 80),
      type: String(message.type || "update").slice(0, 40),
      content,
      createdAt: new Date().toISOString()
    });
    messages.push(entry);
    while (messages.length > limit) messages.shift();
    return entry;
  }

  function readFor(recipient) {
    const target = String(recipient || "").slice(0, 80);
    return messages.filter(item => item.to === target || item.to === "all");
  }

  function snapshot() {
    return messages.map(item => ({ ...item }));
  }

  return Object.freeze({ publish, readFor, snapshot, get size() { return messages.length; }, limit });
}

module.exports = {
  ROLE_ALIASES,
  normalizeRole,
  normalizeRoles,
  createThread,
  createMessageBoard,
  MAX_BOARD_MESSAGES,
  MAX_MESSAGE_LENGTH
};
