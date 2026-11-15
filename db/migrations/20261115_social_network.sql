-- ULUGBEK AI Social Network: PostgreSQL foundation.
-- Apply only after a trusted authentication provider is configured.
-- The API must set app.user_id inside each transaction after validating the session.
-- Do not expose these tables through an unauthenticated database role.

CREATE TABLE IF NOT EXISTS social_profiles (
  user_id UUID PRIMARY KEY REFERENCES app_users(id) ON DELETE CASCADE,
  handle TEXT NOT NULL UNIQUE CHECK (handle ~ '^[a-z0-9_]{3,30}$'),
  display_name TEXT NOT NULL CHECK (length(display_name) BETWEEN 1 AND 80),
  bio TEXT NOT NULL DEFAULT '' CHECK (length(bio) <= 500),
  visibility TEXT NOT NULL DEFAULT 'private'
    CHECK (visibility IN ('public', 'followers', 'private', 'invite_only')),
  avatar_object_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS social_follows (
  follower_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  followed_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, followed_id),
  CHECK (follower_id <> followed_id)
);
CREATE INDEX IF NOT EXISTS social_follows_followed_idx ON social_follows(followed_id, status);

CREATE TABLE IF NOT EXISTS social_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  body TEXT NOT NULL DEFAULT '' CHECK (length(body) <= 5000),
  media_object_key TEXT,
  visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('public', 'followers', 'private')),
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'hidden', 'removed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (length(body) > 0 OR media_object_key IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS social_posts_feed_idx ON social_posts(created_at DESC) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS social_posts_author_idx ON social_posts(author_id, created_at DESC);

CREATE TABLE IF NOT EXISTS social_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES social_posts(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (length(body) BETWEEN 1 AND 2000),
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'hidden', 'removed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS social_comments_post_idx ON social_comments(post_id, created_at);

CREATE TABLE IF NOT EXISTS social_reactions (
  post_id UUID NOT NULL REFERENCES social_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  reaction TEXT NOT NULL DEFAULT 'like' CHECK (reaction IN ('like', 'love', 'useful')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);

CREATE TABLE IF NOT EXISTS social_blocks (
  blocker_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);

CREATE TABLE IF NOT EXISTS social_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  invitee_email_hash TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_by UUID REFERENCES app_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS social_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('profile', 'post', 'comment', 'message')),
  target_id UUID NOT NULL,
  reason TEXT NOT NULL CHECK (length(reason) BETWEEN 5 AND 1000),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'resolved', 'dismissed')),
  moderator_id UUID REFERENCES app_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS social_reports_queue_idx ON social_reports(status, created_at);

CREATE TABLE IF NOT EXISTS social_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (length(body) BETWEEN 1 AND 5000),
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'deleted_by_sender', 'deleted_by_recipient')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (sender_id <> recipient_id)
);
CREATE INDEX IF NOT EXISTS social_messages_inbox_idx ON social_messages(recipient_id, created_at DESC);

-- SECURITY GATE: RLS policies are not yet installed. Do not apply this migration
-- to production or expose these tables until the authenticated API role,
-- transaction-scoped app.user_id identity, and per-table policies are implemented
-- and integration-tested. Never connect the public web process as a table owner
-- or superuser. Keep social read/write endpoints disabled until that gate passes.

-- Direct-message bodies are currently stored as text in this foundation schema.
-- Do not enable direct messages until encryption-at-rest, access controls,
-- retention/deletion, and a documented key-management design are implemented.
