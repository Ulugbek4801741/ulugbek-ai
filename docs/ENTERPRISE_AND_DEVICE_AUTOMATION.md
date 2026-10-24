# ULUGBEK AI — Enterprise, Device Automation, and Global Safety Architecture

Status: architecture and implementation requirements. Items in this document are not claims that the features already exist.

## Product goal

Build one platform that helps individuals, small businesses, large enterprises, and public institutions with routine digital work across the web, desktop computers, and supported phones. Measure outcomes by task category; do not promise that 90–95% of every job can be automated.

## Product modules

1. **Workspace and identity**
   - Organization/workspace, teams, departments, projects, verified accounts, SSO/OIDC/SAML adapters, MFA, role-based and attribute-based access, join/leave lifecycle.
   - Roles: owner, organization admin, security admin, manager, employee, auditor, external collaborator.
   - Tenant isolation must be enforced on the server and in database queries, not only in the UI.

2. **Enterprise documents**
   - Upload, scan, preview, OCR, searchable indexing, version history, comments, approval workflows, templates, e-signature provider integration, retention labels, legal hold, export and deletion.
   - Supported formats are allowlisted. Check extension, MIME, file signature, size, archive expansion, and malware scan status.
   - Search and AI retrieval must enforce the same document permissions as the original source.
   - AI-generated summaries/drafts are suggestions until a permitted user approves them. Keep source citations and document/version provenance.

3. **Communications**
   - Internal messaging, email/calendar provider connectors, meeting notes and task extraction.
   - Phone calls/SMS require a permitted telecom provider or device API, user consent, regional legal checks, spend caps and audit trails. No covert calls, recording, contact harvesting, or bypassing phone permissions.
   - External messages, purchases, deletions, HR actions, financial transactions, and public posts require a human confirmation step by default.

4. **Desktop and mobile assistant**
   - Start with user-approved integrations and operating-system accessibility/automation APIs.
   - Android capabilities are limited by Android permissions, background-execution rules, app sandboxing and Play policies. Desktop control needs a separately installed, signed, explicitly authorized local agent.
   - Use a per-device pairing flow, device inventory, short-lived credentials, device revocation, action preview, scoped permissions and tamper-evident logs.
   - Never silently take over a device, bypass operating-system security, or grant an AI unrestricted shell/admin access.

5. **AI and agent platform**
   - Model gateway supports swappable providers; keep provider keys only in server-side secrets.
   - Typed tool registry with schemas, allowlisted destinations, least-privilege service identities, task timeouts, cost limits, idempotency, retries, approval checkpoints and trace IDs.
   - Separate planner, executor, verifier and policy/permission checker. The verifier cannot approve its own high-risk action.
   - Treat user uploads, email, documents, web pages, code and model outputs as untrusted input. Defend against prompt injection and data exfiltration.
   - Memory is user/org controlled: inspect, correct, export, delete, set expiry and disable. Separate personal, workspace and public knowledge.

6. **Security and endpoint protection**
   - Security center: device posture, suspicious login alerts, audit events, policy status, dependency findings and incident workflow.
   - Use a reputable endpoint protection/EDR provider integration for antivirus scanning and device telemetry. ULUGBEK AI itself must not claim to replace an operating-system antivirus or EDR agent.
   - Scan uploads in quarantine before release. Use file-signature checks, malware scanning, content-disarm/reconstruction where appropriate, archive-bomb limits and safe preview isolation.
   - Secrets manager, TLS, encryption at rest, key rotation, MFA, session revocation, rate limits, CSRF protections where cookie auth is used, secure headers, dependency/SBOM scans, backups, restore drills, alerting and incident response.
   - No system can guarantee that nobody will ever break in. Design for prevention, detection, containment, recovery and transparent incident communication.

7. **Administration and governance**
   - Organization policy editor, data retention, region/data residency options where supported, audit export, legal hold, access reviews, incident tickets, usage/cost reports and admin approval queue.
   - For public-sector use, include procurement, accessibility, records-management, privacy-impact and human-rights reviews before deployment.
   - Do not build covert mass surveillance, secret worker monitoring, or automated decisions that deny rights/services without meaningful human review and appeal.

8. **Global service foundations**
   - PostgreSQL migrations, private object storage, background job queue, cache/rate-limit store, observability, backups, disaster recovery, staging, rollback, feature flags, localization, accessibility and regional compliance.
   - Billing, provider quotas, usage ledger, support workflows and service-level objectives.
   - A website, backend, Android app and desktop agent are separate deliverables and must each be built, signed/configured, tested and released.

## Safe automation policy

- **Low risk:** summarize, classify, draft, translate, OCR, suggest tasks — can run automatically within the user's authorized data.
- **Medium risk:** create a draft document, calendar proposal, ticket or internal task — show a preview and allow undo.
- **High risk:** send an external message, place a call, delete/overwrite files, change permissions, execute code, deploy software, spend money, modify HR/payroll/legal/medical records — require explicit approval from an authorized human.
- **Prohibited:** bypassing security controls, credential theft, covert surveillance, unauthorized access, destructive actions without approval.

Every tool call records actor, organization, purpose, target, permission decision, approval, result, timestamp and correlation ID, while avoiding unnecessary sensitive payloads in logs.

## Enterprise acceptance tests

- Cross-tenant data access attempts fail.
- Revoked users/devices lose access promptly.
- AI search returns only documents the user can access.
- Malicious, oversized, spoofed, and archive-bomb uploads are rejected or quarantined.
- Prompt-injection test documents cannot override tool policy or exfiltrate secrets.
- High-risk tool actions cannot run without the required approval.
- Audit records show the complete decision path without leaking secrets.
- Rate limits, backup restoration, incident alerts, dependency scanning and load tests pass.
- Accessibility and keyboard/screen-reader checks pass.
- Android and desktop permissions are visible, revocable, and tested on supported OS versions.

## Delivery sequence

### Phase 1 — Secure core MVP
- Stabilize existing web UI and Express API.
- Add automated tests and CI checks; document current working versus demo-only features.
- Add production database migrations and a repository layer, then verified account/session lifecycle.
- Add audit events, centralized error handling, request IDs and server-side authorization.

### Phase 2 — Documents and memory
- Private object storage, quarantine + malware scan adapter, per-user/org quota enforcement.
- OCR/indexing pipeline with permission-aware retrieval.
- Conversation persistence and user-controlled memory.
- Test upload, download, delete, retention, cross-user isolation and restore.

### Phase 3 — Enterprise workspace
- Organizations, teams, roles, invitations, MFA/SSO integration, admin audit and approval workflows.
- Document review and collaboration; integrations use least-privilege scopes.

### Phase 4 — Approved device and communication tools
- Desktop companion and Android integrations with pairing, visible consent, limited permissions, approval prompts and revocation.
- Integrate a reputable EDR/antivirus provider rather than inventing antivirus from scratch.
- Add phone/email/calendar providers only after consent, legal review and spend controls.

### Phase 5 — Reliability and global launch
- Load and penetration tests by qualified testers, threat modeling, disaster recovery, observability, security incident process, localization and legal review.
- Limited pilot with real users, measure task completion/time saved/error rate/user satisfaction, then expand by evidence.
- Do not announce production readiness until release gates pass.

## Current repository reality

The existing project is an early Node.js/Express MVP. Some UI controls are placeholders; agent execution is limited; JSON task persistence is not production-grade; the public GitHub Pages site needs a configured backend URL to use the API. This document is a target architecture, not proof those modules have shipped.
