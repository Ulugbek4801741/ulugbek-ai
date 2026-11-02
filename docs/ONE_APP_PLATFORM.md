# ULUGBEK AI — One App, Many Capabilities

## Product definition

ULUGBEK AI is a user-controlled AI workspace and agent platform. It is not primarily an enterprise administration system. Its purpose is to bring many digital tasks and services into one interface, while letting each person choose which capabilities to enable.

A person may use ULUGBEK AI alone. A company may optionally connect approved tools and invite employees. Neither mode should depend on the other.

## Experience

The user gives a goal in natural language, such as:
- "Find the figures in these PDF reports and prepare an Excel summary."
- "Translate this document, keep the original, and create a review draft."
- "Organize these files by project and find duplicates."
- "Help me create and test a small website."
- "Summarize today's meetings and draft follow-up emails."

ULUGBEK AI plans the task, selects only the required tools, asks for missing information, shows what it intends to do, executes within granted permissions, verifies the output, and returns the result with a traceable history. Actions that send, publish, spend money, delete, change permissions, or affect other people require explicit confirmation by default.

## Three operating modes

1. **Personal mode** — private workspace, optional local-device companion, user-controlled files and memory.
2. **Connected mode** — user chooses specific integrations (email, calendar, cloud drive, office suite, code hosting, etc.) and grants the minimum permissions. Disconnecting an integration revokes access.
3. **Organization mode (optional)** — organizations can enable workspace policies, team collaboration, role-based access and audit features. Personal users are not forced into this mode.

## One interface, modular capabilities

- **Core shell:** chat, task list, files, history, search, settings, notifications and agent activity.
- **Document tools:** OCR, PDF, Word, spreadsheet, translation, extraction, summarization, reports and approvals.
- **Device tools:** explicit user-authorized file and app actions through a signed local companion; phone features remain subject to Android permissions and OS restrictions.
- **Communication tools:** optional email/calendar/messaging/voice providers. Calling is not built by bypassing device or telecom controls.
- **Builder tools:** create projects in an isolated workspace, edit files, run tests in a sandbox, inspect dependencies and prepare deploy artifacts. Deployment needs explicit approval.
- **Security tools:** permission checks, audit trail, suspicious-activity alerts, safe file scanning, and integrations with established endpoint-protection vendors.
- **Service connectors:** adapters to external apps and services. ULUGBEK AI coordinates them; it does not need to recreate every external service from scratch.

## Connector contract

Every connector must declare:
- stable identifier and version;
- capabilities and supported actions;
- required permissions/scopes;
- data sent to the provider and data returned;
- whether actions are read-only or change external state;
- confirmation policy and reversible/irreversible effects;
- rate limits, timeouts, cost limits and error behavior;
- health status, audit events and disconnect/revocation behavior;
- automated tests and provider terms/privacy review.

A connector is unavailable until configured and authenticated. UI buttons must not imply a connector works when it is only a placeholder. Never store provider secrets in browser code or the public repository.

## Local and cloud responsibilities

- Cloud: orchestration, model gateway, user-authorized sync, durable storage, task queue and account services.
- Local companion: only explicitly approved device operations; pairing, visible status, narrowly scoped permissions, revocation and local audit.
- Browser: UI and safe, sandboxed web capabilities. Browser-only hosting cannot silently control the whole phone or desktop.
- Android: native capabilities require an Android app, permission prompts, supported APIs and Play-policy review.
- Desktop: requires a separately installed and signed companion for operating-system-level tasks.

The product should degrade gracefully when offline. Offline mode can handle local features that are actually installed; cloud models, integrations and sync need connectivity.

## Architecture boundaries

- Frontend shell calls a versioned backend API.
- Agent orchestrator chooses from a typed connector registry; it must not execute arbitrary model-generated shell commands.
- Connector execution runs with least privilege and bounded time/resources.
- Document retrieval checks access at every request and preserves source references.
- User memory is inspectable, editable, exportable and deletable.
- Security policy engine can deny a tool call; the planner cannot override it.
- High-impact actions require separate human approval.
- Every task has status, cancellation, trace ID, cost/usage accounting and an outcome check.

## Practical build order

1. Create a capability catalog and connector interface; clearly label each module as planned, prototype, configured or verified.
2. Make a secure task lifecycle with validation, cancellation, audit events and automated tests.
3. Add document upload/processing behind a private storage interface and malware-scan adapter.
4. Add one useful read-only connector and prove authentication, permission enforcement and disconnect.
5. Add a sandboxed project builder with tests; prohibit arbitrary production deployment by default.
6. Add local companion pairing and one narrowly scoped, reversible device action.
7. Add more connectors only after the same security and test requirements pass.
8. Pilot with real users, measure completed tasks/time saved/errors/cost, fix failures, then expand.

## Acceptance principles

- Users can use core chat/tasks without connecting external apps.
- Every integration is optional, clearly described and independently disconnectable.
- No connector can read data outside its granted scope.
- No AI-generated text can silently grant itself additional permissions.
- A user can see what an agent did, cancel running work where supported, and revoke access.
- UI status accurately distinguishes a demo, an unconfigured integration, and a tested live integration.
- Security, privacy, accessibility, reliability and regional legal review are release requirements, not future marketing claims.

## Current state

The existing repository is an early Node.js/Express MVP. This document defines the product target. It does not mean every connector, phone/desktop control, OCR pipeline, antivirus feature, or enterprise function has already been implemented.
