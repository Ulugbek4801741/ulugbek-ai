# ULUGBEK AI second-server Knowledge Vault

The separate `ulugbek-knowledge-vault` Render service stores immutable ZIP snapshots in the private Neon Object Storage bucket. The primary ULUGBEK service exports only records attributed to `AutonomousResearchAgent` whose source is `uz.wikipedia.org`, `en.wikipedia.org`, or `ru.wikipedia.org` HTTPS article URLs. These are archived with CC BY-SA 4.0 attribution. User ZIP uploads and pages without a verified open license are excluded.

The primary service syncs every six hours and once shortly after startup. It authenticates to the vault using `VAULT_TOKEN`. The vault accepts ZIP uploads only from callers with that token, stores the ZIP in the private `ulugbek-ai-files` bucket, writes a latest manifest, and verifies SHA-256 on retrieval. Archive content is retrieval-only; no archived code is executed.

Vault environment: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_ENDPOINT_URL_S3`, `AWS_REGION`, `VAULT_BUCKET`, `VAULT_TOKEN`. Primary service environment: `VAULT_URL`, `VAULT_TOKEN`, `VAULT_SYNC_INTERVAL_MS`.

The current automatic archive whitelist is intentionally limited to Wikimedia CC BY-SA 4.0 because source licensing is not yet reliably captured for arbitrary web pages. Additional public-domain and Creative Commons sources should be added only with explicit license verification and attribution handling.
