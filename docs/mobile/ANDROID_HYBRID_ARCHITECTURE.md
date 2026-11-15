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


## Storage Marketplace — peer-provided rented storage

### Product behavior

A device owner may explicitly list a chosen amount of free disk space as a storage offer. Another user may purchase/rent a quota and use it as a private remote drive through the ULUGBEK AI app. Supported providers may include Android phones and desktop computers, but each platform must run its own signed provider application/service; installing the Android APK on a computer is not assumed.

### Roles and consent

- **Provider (seller):** selects a dedicated app-managed storage folder, quota, price, availability schedule, bandwidth cap, and whether the node may sleep or disconnect. The app must never share the whole disk or arbitrary folders.
- **Customer (buyer):** chooses a provider/plan, reviews uptime, location/region if disclosed, price, retention and redundancy terms, then explicitly purchases and receives a private virtual volume.
- Either party can pause or terminate future service. Existing customer data must have a clear export/migration and deletion window; do not silently delete data when a provider goes offline.
- A provider must be able to see only operational metadata required to manage the offer (used capacity, transfer volume, node status, payout); not filenames, file contents, customer keys, or plaintext previews.

### Confidentiality and isolation

- Encrypt files on the customer device before upload. Use authenticated encryption, per-customer/per-object data keys, and envelope/key wrapping so the provider stores ciphertext only.
- Customer keys stay under the customer's control (Android Keystore/desktop OS secure key store where available); never transmit plaintext keys to the provider, marketplace, relay, or another customer.
- Split data into bounded chunks with authenticated integrity hashes. The provider API exposes only an opaque customer-scoped object namespace and quota operations; it must not expose filesystem paths or shell access.
- Separate tenants with cryptographically random IDs, authorization checks, quotas, and storage namespaces. Test cross-tenant access denial for every read, write, list, delete, and metadata endpoint.
- Encrypt metadata that could reveal sensitive filenames or folder structure. Provider dashboards should show opaque object IDs and aggregate usage only.
- Do not promise absolute privacy against a compromised provider device, operating system, app, or customer endpoint. Explain the threat model and keep the customer-side encryption keys off provider devices.

### Availability, durability, and network limits

- A phone being online does not guarantee public reachability: NAT, carrier firewalls, Wi-Fi changes, Android Doze, battery saver, app termination, and owner pause can interrupt service.
- Show provider availability history and a clear service-level description; do not sell guaranteed 24/7 availability from an ordinary phone.
- For important files, offer optional encrypted replication across multiple independent providers or a customer-controlled backup. Replication copies ciphertext only and requires explicit customer consent because it consumes extra storage/bandwidth.
- Define behavior for provider disconnection, missed heartbeats, insufficient capacity, corrupted chunks, customer cancellation, provider withdrawal, and recovery/migration.
- A signaling/relay service may coordinate sessions; any relay sees encrypted payloads only. Relay bandwidth and costs must be disclosed.
- Use resumable uploads/downloads, integrity verification, rate limits, bandwidth schedules, and per-plan transfer quotas.

### Marketplace, billing, and abuse controls

- Marketplace listings must disclose capacity, price, currency, region if relevant, bandwidth limits, uptime history, retention, redundancy, and cancellation terms.
- Use a trusted payment provider for real payments; never store card details. Show fees, refunds, payout timing, and disputes clearly.
- Apply identity/risk controls appropriate to the jurisdiction and transaction value. Add reporting, abuse response, provider/customer suspension, and an auditable dispute process.
- Do not allow rented storage to be marketed for illegal content, malware hosting, command-and-control, or evading lawful access controls. Publish acceptable-use and takedown procedures.
- Obtain explicit consent before using device storage, battery, CPU, or mobile data. Default mobile-data upload limits should be conservative and configurable.

### Storage Marketplace acceptance tests

1. Provider can list only a dedicated app-managed folder and a bounded quota.
2. Customer can upload/download files while the provider is online; transfers resume after a network interruption.
3. Provider cannot decrypt customer file contents or enumerate plaintext filenames.
4. Customer A cannot list, read, overwrite, or delete Customer B's objects, even by guessing IDs.
5. Provider cannot access its own personal files through the customer volume API, and customer cannot access provider files.
6. Provider going offline produces a clear unavailable state; no false claim of continuous availability.
7. Replication, migration, deletion, and billing events are consented, logged, and tested.
8. The app shows exactly what capacity, bandwidth, and background activity the provider is contributing.

