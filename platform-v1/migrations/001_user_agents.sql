-- ULUGBEK AI agent identities, tenant-isolated tasks, and audit trail.
-- Apply with a migration runner after the PostgreSQL database is provisioned.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS user_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  display_name TEXT NOT NULL DEFAULT 'Shaxsiy ULUGBEK AI agenti',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'revoked')),
  permissions JSONB NOT NULL DEFAULT '{"read_own_files":false,"manage_own_apps":false,"control_own_cloud_pc":false}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS agent_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES user_agents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  task_type TEXT NOT NULL CHECK (task_type IN ('organize_files','app_help','cloud_pc_control','backup_request','general')),
  description TEXT NOT NULL CHECK (char_length(description) BETWEEN 1 AND 2000),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','awaiting_approval','approved','rejected','cancelled','completed','failed')),
  requires_approval BOOLEAN NOT NULL DEFAULT false,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS agent_tasks_user_created_idx ON agent_tasks(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS agent_tasks_agent_status_idx ON agent_tasks(agent_id, status);

CREATE TABLE IF NOT EXISTS platform_agent_state (
  singleton BOOLEAN PRIMARY KEY DEFAULT true CHECK (singleton = true),
  name TEXT NOT NULL DEFAULT 'ULUGBEK AI Central Agent',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO platform_agent_state(singleton) VALUES (true) ON CONFLICT (singleton) DO NOTHING;

CREATE TABLE IF NOT EXISTS agent_audit_events (
  id BIGSERIAL PRIMARY KEY,
  actor_user_id UUID,
  agent_id UUID REFERENCES user_agents(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  target_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS agent_audit_created_idx ON agent_audit_events(created_at DESC);
