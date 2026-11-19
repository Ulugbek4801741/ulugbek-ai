# ULUGBEK AI chat PostgreSQL migration (prepared, not applied)

Migration: `db/migrations/20261119_001_add_chat_persistence.sql`

## Scope

This is an additive schema proposal for the ULUGBEK AI repository only. It creates four new tables:

- `ulugbek_chat_conversations`
- `ulugbek_chat_messages`
- `ulugbek_chat_file_assets`
- `ulugbek_chat_memory_entries`

It creates indexes only for those new tables. It does not modify the existing `app_users`, `conversations`, `messages`, knowledge JSONL files, or any other existing data.

## Current database discovery

The Render workspace database identified for ULUGBEK AI is:

- Render resource: `ulugbek-ai-marketplace-db`
- Database name: `ulugbek_ai_marketplace_db`
- PostgreSQL: 18
- Region: Ohio
- Plan: Free
- Status at inspection: available
- Free database expiry shown by Render: 2026-12-16

A read-only schema inventory was attempted but Render rejected the connection because the database IP allowlist is empty. The hosted Render MCP query service does not currently expose a stable source IP that can be allowlisted. No allowlist change was made. Existing tables and actual migration compatibility therefore remain unverified.

## Required before applying

1. Review the existing live schema using a trusted connection from an approved network.
2. Take and verify a backup.
3. Confirm the production owner identity model. `owner_key` must be generated server-side from a high-entropy signed session or keyed hash. A raw browser-supplied `sessionId` is not authorization.
4. Ensure every read and write is scoped by `owner_key`; ensure conversation ownership is checked before message/file access.
5. Decide retention, account deletion, encryption, upload limits, and object-storage lifecycle.
6. Apply this migration manually in a controlled maintenance window only after a separate explicit approval.

## Not implemented by this schema alone

This file does not connect the Node server to PostgreSQL, create a connection pool, migrate chat history, store file bytes, extract PDF/DOCX content, provide embeddings, or enable live web search. Those require separate code, tests, and configuration.

No database DDL was executed by the preparation work. No secrets, environment variables, IP allowlists, services, deploys, or existing records were changed.
