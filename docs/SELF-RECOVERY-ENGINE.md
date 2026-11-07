# ULUGBEK AI Self-Recovery Engine

## Purpose

The Self-Recovery Engine adds a bounded diagnostic and repair-planning layer. It checks registered subsystem health probes, records failures, and gives an administrator a durable report of what needs attention.

It does **not** promise that all application features can be made 100% operational automatically. A successful process start or CI run is not proof that every external integration is configured or works in production.

## Safety boundaries

- Diagnostics only; no repository source writes.
- No shell commands or arbitrary code execution.
- No automatic commit, push, PR merge, or production deployment.
- No changes to Render settings, environment variables, secrets, or production data.
- Sensitive keys in probe details are filtered before persistence or display.
- Repairs must be implemented in a separate branch, tested in CI, reviewed, and explicitly approved before deployment.

## Health states

- `healthy`: every registered probe passed.
- `degraded`: at least one non-critical probe failed.
- `critical`: at least one critical probe failed.
- `running`: a diagnostic cycle is in progress.
- `not_started`: no diagnostic cycle has run yet.

A missing external model, GPU, persistent disk, provider credential, or device permission is reported as a configuration/dependency issue. The engine cannot create those external resources by writing application code.

## Extension

Register a probe with a stable `name`, optional `critical: true`, and an async `run()` function. Return `{ ok: true, details: {...} }` on success or `{ ok: false, message: "..." }` on failure. Do not return secrets, user message content, tokens, credentials, or raw environment variables.

The engine stores a small state file at `ULUGBEK_DATA_DIR/self-recovery.json` (or the configured `SELF_RECOVERY_STORE`). Production requires persistent storage if this history must survive host restarts.
