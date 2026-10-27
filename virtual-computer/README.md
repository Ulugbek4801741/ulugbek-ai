# ULUGBEK Virtual Computer — V1 Foundation

Status: design + safety foundation only. This is NOT yet a running virtual machine service.

## Goal
Give every authenticated user an isolated, persistent workspace that can later host a browser, terminal, files, and approved AI-agent tasks. Do not expose another user's files, process, secrets, or session.

## V1 architecture
- Control plane: authenticated API creates, pauses, resumes, deletes, and reports workspace metadata.
- Workspace identity: derive owner from the verified server session; never trust a userId supplied by the browser.
- Isolation provider interface: keep provider-specific execution behind an adapter. Start with a container runtime on a server we control; do not run arbitrary code inside the main web-server process.
- Per-user storage: private workspace directory/volume, owner-bound database record, quotas, and backups. Validate every file path and block traversal/symlink escapes.
- Resource limits: CPU, RAM, disk, process count, runtime, network access, and concurrent workspaces must be bounded server-side.
- Network: deny outbound access by default for execution sessions; add explicit allowlists only when needed.
- Secrets: never mount application/admin secrets into user workspaces. Use short-lived scoped credentials if a feature requires them.
- Admin controls: admin-only inventory, pause/terminate, quotas, audit events, and version rollout status. Normal users cannot see admin controls or other users' workspace metadata.
- Agent policy: Chat Agent cannot start specialist agents or execute workspace commands unless an explicit permission record allows the exact action. Default deny.
- Updates: signed/versioned release manifest -> verify signature and checksum -> test in staging -> canary -> health checks -> gradual rollout -> automatic rollback on failed checks. Never let a running user workspace rewrite the updater or silently approve its own update.
- Per-user release pinning: users may be moved to a new compatible workspace image after tests; preserve their files and configuration. Offer maintenance notice and rollback where possible.

## Versioning
- Control-plane API and workspace image are versioned independently.
- Use immutable image tags/digests; never update a mutable `latest` image in place.
- Record workspace image version, update result, health status, and rollback reason.
- Critical security fixes may be expedited, but must still pass signature verification and minimum smoke tests.

## Suggested implementation sequence
1. Inventory existing authentication, database, deployment, and test setup before integrating routes.
2. Add schema/migration for workspace owner, status, quotas, image digest, and timestamps.
3. Implement provider interface plus a disabled-by-default adapter; fail closed when runtime configuration is absent.
4. Add authenticated owner-scoped CRUD APIs and admin-only control endpoints.
5. Add tests for cross-user access, path traversal, resource limits, unauthenticated access, and default-deny agent execution.
6. Build and test a minimal image; run security checks and a staging canary.
7. Enable for a small opt-in pilot only after the checks pass.

## Not in V1
- A new hypervisor or a full operating system built from scratch.
- Unlimited free CPU/RAM/storage.
- Unattended self-modifying code or automatic deployment without rollback.
- Claiming a real desktop is available before an execution provider and browser/terminal frontend are deployed.

## Acceptance checklist
- [ ] User A cannot read, list, stop, or modify User B's workspace.
- [ ] Missing auth, owner, policy, or runtime config means deny/no execution.
- [ ] Resource and storage quotas are enforced on the server.
- [ ] Admin endpoints require the existing verified admin session.
- [ ] Update signatures and digests are checked before installation.
- [ ] Failed health checks trigger rollback and create an audit event.
- [ ] Tests pass in CI before any production rollout.
