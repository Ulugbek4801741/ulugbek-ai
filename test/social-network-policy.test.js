"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const social = require("../modules/social-network-policy");

test("profile visibility supports public, followers, private and invite-only", () => {
  assert.equal(social.canViewProfile({ viewerId: "a", ownerId: "b", visibility: "public" }), true);
  assert.equal(social.canViewProfile({ viewerId: "a", ownerId: "b", visibility: "followers", followsOwner: true }), true);
  assert.equal(social.canViewProfile({ viewerId: "a", ownerId: "b", visibility: "followers" }), false);
  assert.equal(social.canViewProfile({ viewerId: "a", ownerId: "b", visibility: "private" }), false);
  assert.equal(social.canViewProfile({ viewerId: "a", ownerId: "b", visibility: "invite_only", invited: true }), true);
  assert.equal(social.canViewProfile({ viewerId: "b", ownerId: "b", visibility: "private" }), true);
});

test("profile blocks override public, follower and invite visibility", () => {
  for (const visibility of ["public", "followers", "private", "invite_only"]) {
    assert.equal(social.canViewProfile({
      viewerId: "a", ownerId: "b", visibility, followsOwner: true, invited: true, blocked: true
    }), false);
  }
});

test("post visibility respects follower status and blocks", () => {
  assert.equal(social.canViewPost({ viewerId: "a", authorId: "b", visibility: "public" }), true);
  assert.equal(social.canViewPost({ viewerId: "a", authorId: "b", visibility: "followers", followsAuthor: true }), true);
  assert.equal(social.canViewPost({ viewerId: "a", authorId: "b", visibility: "followers" }), false);
  assert.equal(social.canViewPost({ viewerId: "a", authorId: "b", visibility: "public", blocked: true }), false);
  assert.equal(social.canViewPost({ viewerId: "b", authorId: "b", visibility: "private" }), true);
  assert.equal(social.canViewPost({ viewerId: "a", authorId: "b", visibility: "unknown" }), false);
});

test("new profiles and posts fail closed to private visibility", () => {
  assert.equal(social.normalizeVisibility(undefined), "private");
  assert.equal(social.normalizeVisibility("invalid"), "private");
  assert.equal(social.validatePost({ text: "Salom" }).post.visibility, "private");
  assert.equal(social.validatePost({ text: "Salom", visibility: "public" }).post.visibility, "public");
});

test("post validation rejects empty, oversized and malformed media content", () => {
  assert.equal(social.validatePost({ text: " " }).ok, false);
  assert.equal(social.validatePost({ text: "x".repeat(5001) }).ok, false);
  assert.deepEqual(social.validatePost({ text: " Salom ", visibility: "followers" }), {
    ok: true, post: { text: "Salom", visibility: "followers", mediaId: null }
  });
  assert.equal(social.validatePost({ mediaId: 42 }).ok, false);
  assert.equal(social.validatePost({ text: "ok", mediaId: "../private/file" }).ok, false);
});

test("social status stays fail-closed until database, auth, migrations and RLS are ready", () => {
  const status = social.getStatus({});
  assert.equal(status.modes.includes("private"), true);
  assert.equal(status.modes.includes("public"), true);
  assert.equal(status.readEnabled, false);
  assert.equal(status.writeEnabled, false);
  assert.equal(status.deploymentReady, false);
  const partiallyConfigured = social.getStatus({
    DATABASE_URL: "postgres://configured",
    SOCIAL_AUTH_ISSUER: "https://identity.example",
    SOCIAL_AUTH_AUDIENCE: "ulugbek-social",
    SOCIAL_MIGRATIONS_READY: "true"
  });
  assert.equal(partiallyConfigured.deploymentReady, false);
});
