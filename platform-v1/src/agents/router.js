"use strict";

const express = require("express");

const TASK_TYPES = new Set([
  "organize_files",
  "app_help",
  "cloud_pc_control",
  "backup_request",
  "general"
]);

// Authentication is deliberately injected by the real account/session layer.
// No header or request body is trusted as an identity. Default behavior denies access.
function createAgentRouter({ db, authenticate } = {}) {
  if (!db || typeof db.query !== "function") throw new TypeError("A database client is required");
  const router = express.Router();

  router.use((req, res, next) => {
    if (typeof authenticate !== "function") {
      return res.status(503).json({ error: "authentication_not_configured" });
    }
    return authenticate(req, res, () => {
      if (!req.user || !req.user.id) {
        return res.status(401).json({ error: "authentication_required" });
      }
      next();
    });
  });

  async function getOrCreateAgent(userId) {
    const result = await db.query(
      `INSERT INTO user_agents (user_id)
       VALUES ($1)
       ON CONFLICT (user_id) DO UPDATE SET updated_at = now()
       RETURNING id, user_id, display_name, status, permissions, created_at, updated_at`,
      [userId]
    );
    return result.rows[0];
  }

  async function audit(userId, agentId, eventType, targetId = null, metadata = {}) {
    await db.query(
      `INSERT INTO agent_audit_events (actor_user_id, agent_id, event_type, target_id, metadata)
       VALUES ($1, $2, $3, $4, $5::jsonb)`,
      [userId, agentId, eventType, targetId, JSON.stringify(metadata)]
    );
  }

  router.get("/me", async (req, res, next) => {
    try {
      const agent = await getOrCreateAgent(req.user.id);
      res.set("Cache-Control", "no-store");
      return res.json({ agent });
    } catch (error) { return next(error); }
  });

  router.patch("/me/status", async (req, res, next) => {
    try {
      const status = req.body && req.body.status;
      if (!["active", "paused", "revoked"].includes(status)) {
        return res.status(400).json({ error: "invalid_status" });
      }
      const agent = await getOrCreateAgent(req.user.id);
      const result = await db.query(
        `UPDATE user_agents SET status = $1, updated_at = now()
         WHERE id = $2 AND user_id = $3
         RETURNING id, user_id, display_name, status, permissions, updated_at`,
        [status, agent.id, req.user.id]
      );
      await audit(req.user.id, agent.id, "agent_status_changed", null, { status });
      return res.json({ agent: result.rows[0] });
    } catch (error) { return next(error); }
  });

  router.post("/me/tasks", async (req, res, next) => {
    try {
      const { type, description } = req.body || {};
      if (!TASK_TYPES.has(type) || typeof description !== "string" ||
          description.trim().length < 1 || description.trim().length > 2000) {
        return res.status(400).json({ error: "invalid_task" });
      }
      const agent = await getOrCreateAgent(req.user.id);
      if (agent.status !== "active") return res.status(409).json({ error: "agent_not_active" });

      // This API only records a proposal; it never runs OS commands or changes production.
      // Sensitive task categories always require explicit user approval.
      const requiresApproval = ["cloud_pc_control", "backup_request", "organize_files"].includes(type);
      const status = requiresApproval ? "awaiting_approval" : "pending";
      const result = await db.query(
        `INSERT INTO agent_tasks (agent_id, user_id, task_type, description, status, requires_approval)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, agent_id, task_type, description, status, requires_approval, created_at`,
        [agent.id, req.user.id, type, description.trim(), status, requiresApproval]
      );
      await audit(req.user.id, agent.id, "task_proposed", result.rows[0].id, { type, requiresApproval });
      return res.status(201).json({ task: result.rows[0], execution: "not_started" });
    } catch (error) { return next(error); }
  });

  router.get("/me/tasks", async (req, res, next) => {
    try {
      const result = await db.query(
        `SELECT id, task_type, description, status, requires_approval, created_at, updated_at
         FROM agent_tasks WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100`,
        [req.user.id]
      );
      res.set("Cache-Control", "no-store");
      return res.json({ tasks: result.rows });
    } catch (error) { return next(error); }
  });

  router.post("/me/tasks/:taskId/decision", async (req, res, next) => {
    try {
      const decision = req.body && req.body.decision;
      if (!["approve", "reject", "cancel"].includes(decision)) {
        return res.status(400).json({ error: "invalid_decision" });
      }
      const result = await db.query(
        `UPDATE agent_tasks
         SET status = $1, approved_at = CASE WHEN $1 = 'approved' THEN now() ELSE approved_at END,
             updated_at = now()
         WHERE id = $2 AND user_id = $3
           AND status IN ('awaiting_approval','pending')
         RETURNING id, status, requires_approval`,
        [decision === "approve" ? "approved" : decision === "reject" ? "rejected" : "cancelled",
          req.params.taskId, req.user.id]
      );
      if (!result.rows[0]) return res.status(404).json({ error: "task_not_found_or_not_actionable" });
      await audit(req.user.id, null, "task_decision", req.params.taskId, { decision });
      return res.json({ task: result.rows[0], execution: "not_started" });
    } catch (error) { return next(error); }
  });

  // Central-agent status is visible only to a separately authenticated platform admin.
  router.get("/platform/status", async (req, res, next) => {
    try {
      if (req.user.role !== "platform_admin") return res.status(403).json({ error: "forbidden" });
      const result = await db.query(
        "SELECT name, status, updated_at FROM platform_agent_state WHERE singleton = true"
      );
      return res.json({ centralAgent: result.rows[0] || null });
    } catch (error) { return next(error); }
  });

  return router;
}

module.exports = { createAgentRouter };
