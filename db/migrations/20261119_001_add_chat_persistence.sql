-- ULUGBEK AI additive chat persistence migration.
-- PREPARED ONLY: this migration is NOT applied automatically or to Render.
-- Safety contract:
--   * Creates only new ulugbek_chat_* tables and indexes.
--   * Does not ALTER, UPDATE, DELETE, TRUNCATE, or read existing application tables.
--   * No extensions, roles, grants, or database-wide settings are changed.
--   * Apply only after reviewing ownership/authentication and backup requirements.
--
-- IMPORTANT: owner_key must be a server-issued, high-entropy opaque identifier
-- (or a keyed hash of a signed session). Never trust a raw browser-supplied
-- sessionId as authorization. Every SELECT/INSERT/UPDATE must include owner_key.

BEGIN;

CREATE TABLE IF NOT EXISTS ulugbek_chat_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_key TEXT NOT NULL CHECK (length(owner_key) BETWEEN 32 AND 128),
  title TEXT NOT NULL DEFAULT 'Yangi suhbat' CHECK (length(title) <= 300),
  locale TEXT NOT NULL DEFAULT 'uz' CHECK (length(locale) <= 24),
  model_provider TEXT,
  model_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS ulugbek_chat_conversations_owner_updated_idx
  ON ulugbek_chat_conversations(owner_key, updated_at DESC);

CREATE TABLE IF NOT EXISTS ulugbek_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL
    REFERENCES ulugbek_chat_conversations(id) ON DELETE CASCADE,
  owner_key TEXT NOT NULL CHECK (length(owner_key) BETWEEN 32 AND 128),
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'tool')),
  content TEXT NOT NULL CHECK (length(content) <= 100000),
  provider TEXT,
  model TEXT,
  token_count INTEGER CHECK (token_count IS NULL OR token_count >= 0),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ulugbek_chat_messages_conversation_created_idx
  ON ulugbek_chat_messages(conversation_id, created_at ASC);
CREATE INDEX IF NOT EXISTS ulugbek_chat_messages_owner_created_idx
  ON ulugbek_chat_messages(owner_key, created_at DESC);

CREATE TABLE IF NOT EXISTS ulugbek_chat_file_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_key TEXT NOT NULL CHECK (length(owner_key) BETWEEN 32 AND 128),
  conversation_id UUID REFERENCES ulugbek_chat_conversations(id) ON DELETE SET NULL,
  storage_backend TEXT NOT NULL CHECK (storage_backend IN ('render_disk', 's3_compatible')),
  object_key TEXT NOT NULL UNIQUE,
  original_name TEXT NOT NULL CHECK (length(original_name) <= 500),
  content_type TEXT NOT NULL CHECK (length(content_type) <= 200),
  size_bytes BIGINT NOT NULL CHECK (size_bytes >= 0),
  sha256 CHAR(64),
  extraction_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (extraction_status IN ('pending', 'processing', 'ready', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS ulugbek_chat_file_assets_owner_created_idx
  ON ulugbek_chat_file_assets(owner_key, created_at DESC);

CREATE TABLE IF NOT EXISTS ulugbek_chat_memory_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_key TEXT NOT NULL CHECK (length(owner_key) BETWEEN 32 AND 128),
  memory_key TEXT NOT NULL CHECK (length(memory_key) BETWEEN 1 AND 200),
  memory_text TEXT NOT NULL CHECK (length(memory_text) <= 12000),
  source_conversation_id UUID
    REFERENCES ulugbek_chat_conversations(id) ON DELETE SET NULL,
  importance SMALLINT NOT NULL DEFAULT 3 CHECK (importance BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  UNIQUE(owner_key, memory_key)
);

CREATE INDEX IF NOT EXISTS ulugbek_chat_memory_owner_idx
  ON ulugbek_chat_memory_entries(owner_key, updated_at DESC);

COMMIT;
