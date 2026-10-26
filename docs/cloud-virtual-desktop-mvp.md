# ULUGBEK AI Cloud Virtual Desktop MVP

## Goal
Provide each signed-in user a private remote desktop through the ULUGBEK AI web/mobile interface, with persistent private files. The service is intended to be free to end users, but compute, storage, bandwidth, and Windows licensing still have costs.

## Current status
This branch adds a policy-only foundation and unit tests. It does **not** create cloud machines, connect a desktop stream, or establish authentication. Do not present the Windows desktop as available until an actual provider and session broker are configured.

## Product rules confirmed
- End users get one personal virtual desktop each.
- The service is intended to be free at launch.
- A signed-in user may only start and stop their own desktop, and only when the administrator has enabled the service for them.
- The admin panel controls global enable/disable, per-user access, quotas, session limits, idle-stop policy, storage limits, status, and audited emergency stop.
- Users cannot delete their VM or another user's data through the start/stop controls.
- "Free" is a pricing choice, not zero infrastructure cost. Limit capacity until funding and real per-session costs are known.

## Safe implementation order
1. Confirm the app's real authentication/session mechanism and use its server-verified user ID. Never accept owner IDs from request JSON.
2. Add a database table for desktop sessions: owner ID, provider instance ID, lifecycle state, storage reference, timestamps, and quota counters. Enforce owner checks on every read/write.
3. Choose a provider/hypervisor and deploy one isolated test instance. For real Windows desktops, confirm Microsoft licensing and hosting terms first.
4. Put the desktop behind a browser gateway such as Kasm/Guacamole or a provider-supported secure gateway. Do not expose RDP (3389) directly to the public internet.
5. Store each user's disk/files in a separately permissioned volume. Encrypt backups and test restore.
6. Add authenticated endpoints to request start/stop/status. Use a server-side queue, quotas, rate limits, timeout cleanup, and audit logs. Do not let users provide arbitrary VM images, shell commands, hostnames, or provider IDs.
7. Test cross-user isolation, unauthenticated requests, CSRF/session handling, quota exhaustion, VM restart, storage restore, and network isolation.
8. Launch with a small invited test group, measure per-user cost, then scale capacity.

## First release acceptance criteria
- User A cannot view, start, stop, or access User B's desktop or files.
- A request without a verified login is denied.
- Desktop management credentials and provider secrets are never sent to the browser.
- Sessions stop when idle according to policy; persistent files remain.
- RDP is not publicly exposed; traffic uses HTTPS and the selected secure gateway.
- Windows licensing and free-service funding are documented before public launch.

## Important limitation
A policy module alone is not a cloud desktop. The next implementation step depends on inspecting the app's authentication flow and selecting a real compute provider. The current server must not fabricate successful provisioning responses.
