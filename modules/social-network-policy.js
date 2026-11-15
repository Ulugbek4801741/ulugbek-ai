"use strict";

const VISIBILITY = Object.freeze(["public", "followers", "private", "invite_only"]);
const POST_VISIBILITY = Object.freeze(["public", "followers", "private"]);
const MAX_POST_LENGTH = 5000;

function normalizeVisibility(value, fallback = "public") {
  return VISIBILITY.includes(value) ? value : fallback;
}

function canViewProfile({ viewerId, ownerId, visibility, followsOwner = false, invited = false }) {
  if (!ownerId || !visibility) return false;
  if (viewerId && viewerId === ownerId) return true;
  if (visibility === "public") return true;
  if (visibility === "followers") return Boolean(viewerId && followsOwner);
  if (visibility === "invite_only") return Boolean(viewerId && invited);
  return false;
}

function canViewPost({ viewerId, authorId, visibility, followsAuthor = false, blocked = false }) {
  if (!authorId || blocked) return false;
  if (viewerId && viewerId === authorId) return true;
  if (visibility === "public") return true;
  if (visibility === "followers") return Boolean(viewerId && followsAuthor);
  return false;
}

function validatePost(input = {}) {
  const text = typeof input.text === "string" ? input.text.trim() : "";
  const visibility = POST_VISIBILITY.includes(input.visibility) ? input.visibility : "public";
  if (!text && !input.mediaId) {
    return { ok: false, error: "Post matni yoki media fayli bo‘lishi kerak." };
  }
  if (text.length > MAX_POST_LENGTH) {
    return { ok: false, error: "Post matni 5000 belgidan oshmasligi kerak." };
  }
  if (input.mediaId !== undefined && (typeof input.mediaId !== "string" || input.mediaId.length > 128)) {
    return { ok: false, error: "Media identifikatori noto‘g‘ri." };
  }
  return { ok: true, post: { text, visibility, mediaId: input.mediaId || null } };
}

function getStatus(env = process.env) {
  const databaseConfigured = Boolean(env.DATABASE_URL);
  const authConfigured = Boolean(env.SOCIAL_AUTH_ISSUER && env.SOCIAL_AUTH_AUDIENCE);
  return {
    module: "ulugbek-ai-social-network",
    version: "0.1.0",
    modes: ["private", "public"],
    profileVisibility: [...VISIBILITY],
    postVisibility: [...POST_VISIBILITY],
    capabilities: ["profiles", "posts", "follows", "comments", "reactions", "blocks", "reports", "direct-messages"],
    databaseConfigured,
    authenticationConfigured: authConfigured,
    readEnabled: false,
    writeEnabled: false,
    deploymentReady: databaseConfigured && authConfigured,
    safety: {
      humanApprovalForExternalSharing: true,
      privateByDefaultForNewAccounts: true,
      blockedUsersCannotInteract: true,
      reportsRequireModeratorReview: true,
      thirdPartySocialScraping: false
    },
    note: "Bu bosqich arxitektura va maxfiylik qoidalarini tayyorlaydi. PostgreSQL migratsiyasi, haqiqiy autentifikatsiya va moderatsiya yoqilmaguncha ijtimoiy tarmoq yozish/o‘qish endpointlari ochilmaydi."
  };
}

module.exports = {
  VISIBILITY,
  POST_VISIBILITY,
  MAX_POST_LENGTH,
  normalizeVisibility,
  canViewProfile,
  canViewPost,
  validatePost,
  getStatus
};
