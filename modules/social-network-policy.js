"use strict";

const VISIBILITY = Object.freeze(["public", "followers", "private", "invite_only"]);
const POST_VISIBILITY = Object.freeze(["public", "followers", "private"]);
const MAX_POST_LENGTH = 5000;

function normalizeVisibility(value, fallback = "private") {
  const safeFallback = VISIBILITY.includes(fallback) ? fallback : "private";
  return VISIBILITY.includes(value) ? value : safeFallback;
}

function canViewProfile({
  viewerId,
  ownerId,
  visibility,
  followsOwner = false,
  invited = false,
  blocked = false
}) {
  if (!ownerId || !visibility || blocked) return false;
  if (viewerId && viewerId === ownerId) return true;
  if (visibility === "public") return true;
  if (visibility === "followers") return Boolean(viewerId && followsOwner);
  if (visibility === "invite_only") return Boolean(viewerId && invited);
  return false;
}

function canViewPost({ viewerId, authorId, visibility, followsAuthor = false, blocked = false }) {
  if (!authorId || !POST_VISIBILITY.includes(visibility) || blocked) return false;
  if (viewerId && viewerId === authorId) return true;
  if (visibility === "public") return true;
  if (visibility === "followers") return Boolean(viewerId && followsAuthor);
  return false;
}

function validatePost(input = {}) {
  const text = typeof input.text === "string" ? input.text.trim() : "";
  const visibility = POST_VISIBILITY.includes(input.visibility) ? input.visibility : "private";
  const mediaId = typeof input.mediaId === "string" ? input.mediaId.trim() : null;
  if (!text && !mediaId) {
    return { ok: false, error: "Post matni yoki media fayli bo‘lishi kerak." };
  }
  if (text.length > MAX_POST_LENGTH) {
    return { ok: false, error: "Post matni 5000 belgidan oshmasligi kerak." };
  }
  if (input.mediaId !== undefined && input.mediaId !== null &&
      (typeof input.mediaId !== "string" || !/^[a-zA-Z0-9_-]{1,128}$/.test(mediaId || ""))) {
    return { ok: false, error: "Media identifikatori noto‘g‘ri." };
  }
  return { ok: true, post: { text, visibility, mediaId: mediaId || null } };
}

function getStatus(env = process.env) {
  const databaseConfigured = Boolean(env.DATABASE_URL);
  const authenticationConfigured = Boolean(env.SOCIAL_AUTH_ISSUER && env.SOCIAL_AUTH_AUDIENCE);
  const migrationsConfigured = env.SOCIAL_MIGRATIONS_READY === "true";
  const rowSecurityConfigured = env.SOCIAL_RLS_READY === "true";
  const deploymentReady = databaseConfigured && authenticationConfigured &&
    migrationsConfigured && rowSecurityConfigured;
  return {
    module: "ulugbek-ai-social-network",
    version: "0.2.0",
    modes: ["private", "public"],
    profileVisibility: [...VISIBILITY],
    postVisibility: [...POST_VISIBILITY],
    capabilities: ["profiles", "posts", "follows", "comments", "reactions", "blocks", "reports", "direct-messages"],
    databaseConfigured,
    authenticationConfigured,
    migrationsConfigured,
    rowSecurityConfigured,
    readEnabled: false,
    writeEnabled: false,
    deploymentReady,
    safety: {
      humanApprovalForExternalSharing: true,
      privateByDefaultForNewAccounts: true,
      blockedUsersCannotInteract: true,
      reportsRequireModeratorReview: true,
      thirdPartySocialScraping: false
    },
    note: "Ijtimoiy tarmoq API'lari autentifikatsiya, migratsiya va PostgreSQL RLS tekshiruvlari yakunlanmaguncha yopiq."
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
