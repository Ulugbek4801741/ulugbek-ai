# ULUGBEK AI — global product readiness plan

This document separates existing MVP capabilities from work that must be completed before public launch. A checklist is not proof that a feature is implemented.

## Current verified architecture snapshot

- Static frontend is served from `public/` and can be hosted on GitHub Pages.
- Node.js/Express backend has chat, plan, health, diagnostics, admin task, and lab routes.
- Chat and planning can call an OpenAI-compatible `/chat/completions` endpoint when server-side environment variables are configured.
- Multi-agent orchestration currently creates model-generated proposals; it does not autonomously edit files, run shell commands, deploy software, or safely operate external accounts.
- Agent task persistence currently uses a local JSON file. Ephemeral hosting storage is not a durable production database.
- `public/config.js` currently has an empty API base URL; the public website therefore is not connected to a separately deployed backend until configured.
- No claim is made here that production user accounts, 10 GiB cloud storage, billing, or cross-device conversation sync are already live.

## Planned service boundaries

1. **Identity and access** — account lifecycle, verified email/social login, sessions, account recovery, MFA option, roles, abuse controls.
2. **Conversation service** — conversations, messages, pagination, search, export, archive, delete, retention settings.
3. **Memory service** — user-approved memory extraction, editable/deletable memories, provenance, expiry, retrieval controls. Never silently treat every chat as permanent memory.
4. **Object storage** — private object bucket, short-lived signed upload/download URLs, MIME and file-signature checks, malware scanning, quotas and deletion.
5. **Quota service** — define 10 GiB as 10,737,418,240 bytes per account; calculate usage from server-side object metadata, not client reports; reserve quota before upload and reconcile after upload/delete.
6. **Model gateway** — server-side provider adapters, timeouts, retries with limits, usage/cost tracking, provider health, model selection, rate limits. Keys stay in hosting secrets.
7. **Agent orchestrator** — typed tool registry, scoped permissions, task queue, timeouts, trace/audit logs, budget limits, human approval for external or destructive actions.
8. **Learning/research pipeline** — retrieve and cite sources, keep untrusted web content isolated, evaluate changes, version datasets and prompts, require review before changing production behavior.
9. **No-code and code builder** — isolated sandbox builds, dependency scanning, unit/integration tests, artifact signing, explicit user approval before publish/deploy.
10. **Media/video pipeline** — separate provider adapters, upload limits, job queue, status polling, storage cleanup and cost controls.
11. **Billing and plans** — subscription/usage ledger, invoices, refunds, taxes, regional pricing, spending alerts and provider terms review.
12. **Operations** — PostgreSQL migrations, Redis/queue if needed, backups and restore drills, monitoring, alerting, incident response, staged deploys and rollback.
13. **Globalization** — translation workflow, locale/timezone/currency support, accessibility, mobile responsiveness, privacy and consumer-law review per launch region.

## API key setup later

- Create provider keys only when ready to test.
- Put secrets in the backend host's Environment/Secrets page, not GitHub files or browser JavaScript.
- Configure `OPENAI_API_KEY`, `OPENAI_BASE_URL`, and `OPENAI_MODEL` on the server. A custom endpoint must be trusted and compatible with the expected API.
- Set `PUBLIC_BASE_URL` to the backend HTTPS URL and `FRONTEND_ORIGIN` to the exact deployed frontend origin.
- Set `window.ULUGBEK_API_BASE_URL` in `public/config.js` to the backend HTTPS origin after it is deployed.
- Restart/redeploy and test `/api/health`, `/api/diagnostics`, one chat request, one agent task, rate limits, and error handling.
- Never expose provider keys to the browser, app package, logs, or public repository. Rotate a key immediately if exposed.
- A provider API key enables inference; it does not train a proprietary foundation model by itself. Training requires lawful data rights, dataset curation, evaluation, compute, model-training infrastructure, and safety review.

## Release gates — all required before global public launch

- [ ] Authenticated user account system and account recovery.
- [ ] PostgreSQL configured, migrations run, backup and restore tested.
- [ ] Private object storage configured; upload/download/delete tested.
- [ ] Per-user 10 GiB quota enforced server-side and concurrent uploads tested.
- [ ] Conversation history, search, export, archive, delete and sync tested.
- [ ] User-controlled AI memory create/read/edit/delete and retention controls tested.
- [ ] Every API route has authorization, validation, rate limiting and abuse controls.
- [ ] Secrets scan and dependency/security scans pass.
- [ ] Unit, integration, end-to-end, load and accessibility tests pass.
- [ ] Provider spend limits, quotas, telemetry and cost dashboards set.
- [ ] Privacy policy, terms, data export/deletion, consent, retention and incident process reviewed by qualified counsel.
- [ ] Agent tool permissions, sandboxing and human approvals independently security-tested.
- [ ] Android APK built separately, signed securely, tested on supported devices, and privacy permissions reviewed.
- [ ] Staging deployment, monitoring, rollback and disaster-recovery exercise completed.
- [ ] Each target region's legal, language, payment and data-transfer requirements reviewed.

## Acceptance criteria for memory/storage

- Users cannot read, modify, or delete another user's records or files.
- Uploads above the remaining quota are rejected with a clear message.
- Quota calculations remain correct for simultaneous uploads and deletes.
- Deleted files are inaccessible immediately and purged according to a documented retention policy.
- Memory can be inspected, corrected and deleted by its owner.
- Database and object storage restore successfully from backups.
- The same authenticated account sees the same conversations on website and mobile.
