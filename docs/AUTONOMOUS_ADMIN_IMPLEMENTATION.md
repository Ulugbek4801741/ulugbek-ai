# ULUGBEK AI — autonomous admin implementation plan

## Current verified state

- The admin web page is an authenticated monitoring console.
- The Developer Agent performs a bounded, read-only repository audit on a process timer.
- The current agent task runtime creates rule-based plans/reports; it does not write source code or run tests.
- The current JavaScript reasoning engine is symbolic/rule-based, not a trained neural language model.
- The new `training/train_tiny_gpt.py` is a from-scratch neural-model training experiment. It is not trained and is not connected to chat or admin.

## Target: admin works while the owner is away

The admin coordinator should run as a separate server worker with durable state and these components:

1. **Project planner** — reads an approved product backlog, selects the highest-priority safe task, and records acceptance criteria.
2. **Task dispatcher** — assigns bounded work to specialist agents and uses durable leases so a server restart cannot duplicate a task.
3. **Builder sandbox** — after a real code-capable local model is trained and integrated, generates a patch only in an isolated workspace. No production filesystem access.
4. **Verifier** — runs allowlisted tests in a network-disabled sandbox, checks output limits, and records exact results.
5. **Security supervisor** — independently checks the patch, permissions, dependency changes, secrets exposure, and policy bypass attempts. A failed check quarantines the worker and preserves logs.
6. **Recovery manager** — retries only bounded, reversible failures; restores the last known-good sandbox snapshot; repeated failures stop the worker and alert the admin.
7. **Admin dashboard** — shows queue, active worker, heartbeat, task attempts, test results, quarantines, model/training status, and a global stop control.
8. **Audit and alerts** — append-only event records and notifications through an explicitly configured channel.

## Autonomy policy

The system may autonomously plan, research public information, create code patches in a sandbox, run allowlisted tests, retry bounded failures, and open pull requests.

The system must never autonomously:
- change or recover administrator credentials;
- modify or disable the security supervisor, audit log, or stop control;
- access secrets or private user data for training;
- merge to the production branch or deploy;
- run downloaded code or arbitrary shell commands;
- delete user data, change billing, or send external messages.

## Requirements before unattended code generation

- A real locally hosted code-capable model trained from approved data.
- Durable database/queue (not ephemeral local JSON).
- An always-on worker process with health monitoring and restart policy.
- An isolated sandbox with CPU, memory, disk, time, and network limits.
- Separate read-only GitHub access for analysis and narrowly scoped branch/PR write access for patch publication.
- Tests proving quarantine, retry limits, rollback, restart recovery, and stop control.

## Current blocker

The model training script is only a small proof-of-concept. A useful code model needs much more clean licensed data, GPU compute, training time, and evaluation. Until the model is trained and connected, the admin can monitor and plan but cannot truthfully be called an autonomous software developer.
