# ULUGBEK AI No-Code Platform — Product and Architecture Specification

## Purpose and implementation status

This specification describes the intended product. It is not evidence that these features are already implemented. Build in small, reviewable phases; each phase must have working code, automated tests, security review, and an operator-approved release.

## Product goals

A user can create their own website or application through a visual editor and chat/voice commands, preview it, modify their own project later, and deploy it to:
- ULUGBEK AI's shared hosting, subject to fair-use limits and availability; or
- a separately provisioned server/account they own or are authorized to control.

The platform itself is a protected product. End users may create and modify their own projects but must not be able to edit the ULUGBEK AI platform source, alter platform security/billing rules, or access or modify another user's projects without explicit authorized sharing.

## Separate-server deployment workflow

1. User selects "Deploy to my server" and chooses a provider/region.
2. Platform compares current published prices and plan specifications, including CPU, RAM, disk, bandwidth/egress, backup costs, tax, billing period, and regional availability.
3. Display a dated estimate and source link; do not claim a quote is guaranteed. Show estimated provider cost, ULUGBEK AI service fee, estimated total, and cancellation/renewal terms separately.
4. Ask the user to confirm the provider, region, plan, budget ceiling, and recurring billing before creating resources.
5. Provision using an approved provider API or a user-authorized deployment credential. Prefer short-lived, least-privilege credentials. Never ask users to paste cloud passwords into chat; use a secure OAuth/token flow or provider dashboard.
6. Install a minimal deployment agent/container stack, apply firewall/TLS settings, and register the deployment with health checks.
7. Show deploy logs with secrets redacted, status, cost estimate, rollback option, and stop/delete controls.
8. For an existing server, user supplies a verified endpoint through a secure connection flow. Verify ownership/control and compatibility before making changes. Never connect to an arbitrary host and run commands based only on a chat message.
9. Do not auto-upgrade or delete resources without explicit consent, a budget cap, and a rollback/backup plan.

### Provider pricing

Initial providers may include Hetzner, DigitalOcean, AWS Lightsail, Vultr, Tencent Cloud, and providers with eligible India-region plans. Provider and region availability must be checked live. Mainland China has distinct regulatory, network, and domain filing requirements; show these to users and do not imply that a server in any country automatically makes an application compliant there.

Pricing comparison must distinguish:
- compute, storage, public IP, bandwidth/egress, backups, snapshots, databases, and support;
- taxes/currency conversion and promotional vs renewal prices;
- server provider charges vs ULUGBEK AI platform fees;
- estimate timestamp and source.

Do not promise that a $100 provider plan can always be supplied for $30. A 30% margin only works when the provider cost, tax, payment fees, support, and expected operating costs leave sufficient margin. The business model should calculate the selling price transparently and reject loss-making or stale quotes.

## Shared hosting vs dedicated server

- **Shared/free tier:** host small projects on ULUGBEK AI infrastructure with documented CPU, memory, storage, bandwidth, inactivity, and acceptable-use limits. Free does not mean unlimited.
- **Dedicated deployment:** the customer pays the selected provider directly where possible, or pays ULUGBEK AI only under a clear disclosed resale agreement. The server belongs to the customer/account or is allocated to the customer with clear ownership and exit rights.
- Support project export and deployment portability; do not lock a user's project into a proprietary format unnecessarily.
- Never combine unrelated customers' private data or expose one tenant's environment to another.

## Chat and voice controls

Chat/voice can create a proposed change set such as "add a product search field" or "show monthly sales in the admin panel." Before changes are applied:
- identify the exact project and environment;
- explain files/data/schema/configuration that will change;
- run validation and tests in an isolated preview/staging environment;
- request confirmation for production changes, spending, external integrations, permission changes, destructive operations, or data migration;
- keep an audit entry and allow rollback where feasible.

Voice commands must use the same identity, permissions, confirmation steps, and audit controls as typed commands. A voice match alone is not sufficient authorization for sensitive operations.

## Protected platform boundary

- A project owner can create, edit, export, deploy, pause, or delete their own project within policy.
- A collaborator can access only the specific permissions granted by the owner.
- Platform administrators have separately authenticated, audited roles.
- No user may alter the platform builder's core source, global policies, billing logic, secrets, or another user's project through prompts or generated code.
- AI-generated code is untrusted until linting, tests, dependency scanning, secret scanning, sandbox execution, and review pass.
- Treat prompt injection in uploaded files, website content, and project source as untrusted input; it cannot override authorization or deployment policy.

## Revenue sharing

A configurable agreement may allocate 70% of eligible net project revenue to the project owner and 30% to ULUGBEK AI. It must specify:
- whether the percentage applies to gross or net revenue (recommended: clearly defined net receipts after refunds, chargebacks, payment processor fees, taxes collected, and other expressly listed deductions);
- supported payment methods, currency conversion, payout thresholds, refunds/chargebacks, reserves, and payout schedule;
- user acceptance, invoices/records, dispute handling, tax obligations, and local-law compliance.

Do not automatically collect or split money until payment-provider support, legal terms, identity/anti-fraud checks where required, and payout accounting are implemented and tested. The 70/30 arrangement is a proposed business rule, not a universal default that can override a signed agreement.

## Automated maintenance and scheduled updates

- Run maintenance jobs on a schedule with a visible change log.
- Automatic checks, backups, dependency alerts, and non-destructive updates may run under a documented policy.
- Application feature changes should be proposed by AI, tested in staging, and approved by the owner before production rollout unless the owner explicitly configured a narrow, reversible auto-update policy.
- Never silently change a customer's application, pricing, permissions, database schema, or billing terms.
- Provide scheduled rollback and restore tests.

## Admin console requirements

- Project list, deployment/region status, health, estimated provider costs, usage limits, and revenue/payout ledger.
- Chat and voice command entry with transcription/edit-before-submit option.
- Pending AI change sets, diffs, test results, approvals, audit history, rollback, backups, and export.
- Permission management, API credential revocation, budget caps, spending alerts, and stop/delete deployment controls.
- Separate high-risk confirmation for payment, production deploy, destructive database operations, and server provisioning.

## Delivery phases

1. Project model, ownership/tenant isolation, safe visual editor, preview, export.
2. Authentication, roles, audit trail, versioned change sets, sandbox tests.
3. Shared hosting with quotas, backups, monitoring, deployment health.
4. Provider pricing catalog with dated estimates and explicit user confirmation.
5. One provider integration for user-authorized server provisioning; then add other providers after testing.
6. Chat change proposals and safe application; voice commands using the same permission model.
7. Billing ledger and payout integration only after legal/accounting review.
8. Scale, disaster recovery, security review, load testing, and regional compliance.

## Release criteria

No phase is complete until automated tests pass, tenant isolation is tested, secrets are redacted, failure and rollback paths are exercised, costs and permissions are visible, and the feature is documented. Do not market planned functionality as available until it is implemented and verified.
