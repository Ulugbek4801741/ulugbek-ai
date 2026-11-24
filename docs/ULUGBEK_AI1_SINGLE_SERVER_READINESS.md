# ULUGBEK AI 1 — Single-server core readiness

## Scope
This work targets only the Render service `ulugbek-ai1` at `https://ulugbek-ai1.onrender.com`.
Do not connect, change, deploy, or depend on `ulugbek-ai2`. ULUGBEK AI must remain separate from ASILBEK AI and SEVINCH AI.

## Design
Keep one Node.js/Express web service and one universal agent. Feature modules remain in-process; background work must be queued, bounded, and persisted to PostgreSQL or durable storage rather than relying on ephemeral local files.

## Activation order (staging first)
1. Verify `/api/health`, server commit/branch, and dependency readiness.
2. Verify chat with a real prompt and model/provider status; do not mark chat AI-ready if no model is configured.
3. Verify task creation, queue status, and restart behavior. Tasks left queued/running on restart must remain blocked pending explicit retry.
4. Verify memory/knowledge writes and reads against durable storage.
5. Verify research sources, timeouts, rate limits, and source attribution.
6. Verify admin-only endpoints reject anonymous requests and secrets are never exposed.
7. Run the repository test suite and inspect Render logs.
8. Deploy to production only after the owner reviews the staging report and approves.

## Single-server resource policy
- Do not spawn multiple server instances or agents just to simulate parallelism.
- Keep concurrency bounded and reject/queue excess tasks.
- Use request/task timeouts and retry only idempotent operations.
- Never automatically resume partially completed external side effects after a restart.
- Treat unreviewed web findings and learner output as pending, not trusted facts.
- Keep API keys and admin credentials only in Render secret environment variables.

## Staging report checklist
Record test command, commit SHA, route status, model configuration status (without exposing keys), task lifecycle results, durable storage results, error logs, and any blockers. A green deploy alone is not proof that all capabilities work.

## Current limitations
This document is a deployment plan/checklist only. It does not enable dormant modules, change environment variables, run live task execution, or deploy production.
