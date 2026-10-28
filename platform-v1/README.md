# ULUGBEK AI Platform v1 — backend foundation

This directory is a clean, separately testable backend foundation. It does not replace the current application and is not production-ready merely because it builds.

## Included
- Node.js 22 + Express API shell with security headers, bounded JSON requests and rate limiting.
- PostgreSQL connection pool and Redis client.
- Separate liveness and dependency-aware readiness endpoints.
- Graceful shutdown and fail-closed startup when required dependencies are unavailable.
- Personal-agent API foundation with tenant-scoped database queries, task proposals, approval decisions, audit events, and central-agent status for platform admins.
- PostgreSQL migration for per-user agent profiles, tasks, central-agent state, and audit records.
- Automated HTTP tests and GitHub Actions CI.

## Local run
1. Copy `.env.example` to `.env`.
2. Set a long random `POSTGRES_PASSWORD` in `.env`.
3. Run `docker compose up --build` from this directory.
4. Check `http://127.0.0.1:8080/health/live` and `/health/ready`.

For a test run without Docker: run `npm install`, `npm run check`, and `npm test`.

## Endpoints
- `GET /health/live`: confirms the Node process is responding.
- `GET /health/ready`: returns 200 only when PostgreSQL and Redis respond; otherwise 503.
- `GET /api/agents/me`: get or create the authenticated user's personal agent profile.
- `PATCH /api/agents/me/status`: pause, resume, or revoke the caller's own agent.
- `POST /api/agents/me/tasks`: submit a task proposal; sensitive task categories wait for approval.
- `GET /api/agents/me/tasks`: list only the caller's tasks.
- `POST /api/agents/me/tasks/:taskId/decision`: approve, reject, or cancel the caller's own task proposal.
- `GET /api/agents/platform/status`: central-agent status, restricted to a platform-admin role.

### Critical authentication limitation
The routes intentionally fail closed until a real, trusted account/session authentication middleware is connected. The current repository foundation does **not** yet implement registration, login, sessions, or a production authentication provider. Do not accept user IDs or roles from request bodies or arbitrary headers. The router records proposals only: it does not execute Windows commands, access files, run shell commands, or change production systems. The migration `migrations/001_user_agents.sql` must be applied through a controlled migration process before these database-backed routes can run.

## No-Code deployment design

See [NO-CODE-DEPLOYMENT-SPEC.md](./NO-CODE-DEPLOYMENT-SPEC.md) for user-owned projects, shared vs dedicated hosting, regional price comparisons, chat/voice changes, approval controls, and the proposed 70/30 revenue model. This is a specification; these features are not implemented by the current backend foundation.

## Privacy requirements

See [PRIVACY-AND-OPERATIONS.md](./PRIVACY-AND-OPERATIONS.md) for the privacy-first data-flow rules, self-hosted AI defaults, email/SMS limitations, and release gates. These are requirements, not a claim that the controls are all implemented yet.

## Security and production gates
- Do not expose PostgreSQL or Redis directly to the public internet.
- Use TLS, managed secrets, firewall restrictions, encrypted backups and tested restore procedures in production.
- `TRUST_PROXY_HOPS` must match the actual trusted proxy chain; do not set it blindly.
- Configure database TLS according to the selected provider. The example's `PG_SSL=false` is for local Docker only.
- AI-generated task proposals are not execution permission. Implement a separate allowlisted executor/sandbox only after authentication, authorization, consent UX, and security review are in place.
- Do not advertise a user capacity until realistic load tests, security review, backup/restore tests and operational monitoring pass.
- Deployments and paid infrastructure must be configured and approved by the owner. No server has been purchased or deployed by this change.
