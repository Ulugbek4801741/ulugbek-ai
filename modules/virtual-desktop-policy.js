"use strict";

// Policy-only foundation for cloud virtual desktops.
// This module does not provision VMs or authenticate users.
// The caller MUST supply a trusted user ID from a verified server-side session.
const MAX_ACTIVE_SESSIONS_PER_USER = 1;
const SESSION_STATES = new Set(["stopped", "starting", "running", "stopping", "error"]);

function requireTrustedUserId(userId) {
  if (typeof userId !== "string" || !/^[A-Za-z0-9_-]{8,128}$/.test(userId)) {
    throw new TypeError("A verified user ID is required.");
  }
  return userId;
}

function createSessionRequest(userId) {
  const ownerId = requireTrustedUserId(userId);
  return Object.freeze({
    ownerId,
    state: "stopped",
    persistentStorage: true,
    publicIp: false,
    privileged: false,
    createdAt: new Date().toISOString()
  });
}

function canAccessSession(session, authenticatedUserId) {
  if (!session || typeof session !== "object") return false;
  try {
    const userId = requireTrustedUserId(authenticatedUserId);
    return typeof session.ownerId === "string" && session.ownerId === userId;
  } catch {
    return false;
  }
}

function validateSessionState(state) {
  return SESSION_STATES.has(state);
}

module.exports = {
  MAX_ACTIVE_SESSIONS_PER_USER,
  SESSION_STATES,
  requireTrustedUserId,
  createSessionRequest,
  canAccessSession,
  validateSessionState
};
