# ULUGBEK AI Android Hybrid Mobile Server

Status: architecture baseline; implementation is staged and must pass CI before release.

## Product goal

Ship an installable Android APK that does not require Termux, a Linux shell, or a Render-hosted application server for its local features. Each installation owns an isolated local workspace. When the owner explicitly enables **Hybrid node mode**, the app may offer a small, permission-scoped set of compute and public-knowledge tasks to other enrolled devices.

This document describes the intended architecture; it does not claim that peer networking, background uptime, or autonomous model training is already implemented.

## Device baseline

- Minimum target for the first implementation: Android 8.0 (API 26), subject to dependency compatibility tests.
- Test devices: Android 11 / API 29 first; then API 26, API 28, API 31+, and current Android.
- Low-memory profile: 2 GB RAM and less than 5 GB free storage.
- No root, Termux, Docker, local large language model, or mandatory cloud account.
- APK must remain small; optional capabilities and language packs are downloaded only after user consent and a storage check.

## Architecture

1. **Android app shell** — Kotlin Android host plus the existing Capacitor chat UI, with native permissions and lifecycle handling.
2. **Local runtime** — app-private process/service; binds to loopback only by default. It is not exposed to the public network by default.
3. **Private local data** — SQLite for structured records; app-private files for attachments; Android Keystore-backed encryption keys. Chat, personal files, and user memory remain on that device.
4. **Agent/task engine** — bounded task queue, explicit capability grants, timeouts, quotas, cancellation, and audit log. No arbitrary shell execution.
5. **Offline mode** — local settings, local chat history, cached approved knowledge, and deterministic lightweight tools. Do not promise full generative AI without a local model or configured online provider.
6. **Online research** — allowlisted HTTPS sources, source attribution, download size/type limits, malware/content checks where available, user-configurable data/battery quotas, and local storage. Do not crawl private pages or bypass access controls.
7. **Hybrid device network** — each device has a random device identity and revocable enrollment. Exchange task metadata only; private user content is excluded unless the owner separately shares a selected item for a specific task.
8. **Update channel** — signed APK releases and integrity checks. Downloaded knowledge is data, never executable code. App updates require platform signature validation and user/platform approval.

## Hybrid networking: important constraints

- A group of 2–10 phones can cooperate only while each owner has enabled node mode and granted the specific task capability.
- Devices on the same Wi-Fi can discover peers locally in a later phase. Cross-network peer connections require secure rendezvous/signaling and NAT traversal; many mobile networks do not permit direct inbound connections.
- A relay/signaling service may be needed for discovery and connection setup. It must not store private chat/files. This service is not the user's AI server and must not be a mandatory dependency for local/offline features.
- Do not claim that a phone is reachable from the public internet merely because mobile data is on.
- Android may stop background work due to Doze, battery saver, OEM restrictions, or process limits. WorkManager is for deferrable work (periodic work has a platform minimum interval); a user-started foreground service with a visible notification is required for continuous active-node sessions where permitted. No 24/7 uptime guarantee.
- A phone network does not automatically pool RAM/CPU into one large computer. Tasks must be split into bounded independent jobs and matched to device capability.

## Privacy and security invariants

- Per-installation identity, keys, database, and files are isolated.
- No personal data, chat history, contacts, location, microphone audio, or documents are uploaded by default.
- Voice recognition and text-to-speech use on-device Android services where available. If a provider sends audio off-device, show a clear consent prompt first.
- Network requests use HTTPS and certificate validation. Never disable TLS validation.
- Peer enrollment uses short-lived pairing codes or QR codes, mutual authentication, revocation, and least-privilege task grants.
- Never expose the local API on 0.0.0.0 without an explicit advanced opt-in and authenticated transport.
- Never store API keys in source control, APK assets, logs, or plaintext preferences.
- Knowledge downloads are size-limited, typed, attributed, and stored as untrusted data until reviewed.
- Agent-generated code cannot self-install, change permissions, read arbitrary files, or update the app. Changes require sandboxed tests and user approval.
- Provide clear controls to pause node mode, revoke peers, delete local data, and export user data.
- Maintain a local audit trail for task grants and network sharing; avoid logging message bodies or file contents.

## Phased implementation and acceptance tests

### Phase 1 — APK build foundation
- Verify the existing Capacitor Android wrapper and GitHub Actions APK build.
- Confirm debug APK artifact is produced from a pull request.
- Confirm no Render URL is required to launch the shell.
- Keep existing web/API behavior unchanged.

### Phase 2 — offline-first local storage
- Add native local database and app-private file storage.
- Test create/read/update/delete while airplane mode is enabled.
- Test that a second app installation cannot read the first installation's private files.
- Test that no personal data is sent in background network requests.

### Phase 3 — native local service
- Add a user-controlled foreground service and loopback-only API.
- Test start/stop, notification, process restart behavior, battery restrictions, and Android version compatibility.
- Verify service is not reachable from another device unless the user explicitly enables a protected sharing mode.

### Phase 4 — hybrid peer enrollment
- Add QR/pair-code enrollment, mutual authentication, task capability grants, expiry, and revocation.
- Test two devices first, then up to ten simulated/physical devices.
- Verify device A cannot read device B's chat, private files, or memory.
- Test dropped connections, duplicate tasks, malicious task payloads, and node departure.

### Phase 5 — bounded online research and updates
- Add allowlisted research, quotas, attribution, safe download handling, and local indexing.
- Test offline fallback, storage exhaustion, data cap, invalid certificates, oversized files, and untrusted content.
- Treat model training and code updates as separate, explicitly approved future projects.

## Release gates

Do not merge or publish a production APK until CI passes, Android device tests pass, privacy tests pass, signing/release process is defined, and the privacy policy accurately describes every network transfer. Draft PRs only until the owner explicitly approves merge and release.
