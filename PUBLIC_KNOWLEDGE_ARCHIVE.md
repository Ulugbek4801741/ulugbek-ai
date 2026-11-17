# Public knowledge archive setup

Production integration: `modules/public-knowledge-archive.js` in the Node.js server.

- Only eligible public Wikipedia research entries are archived (Uzbek, English, Russian).
- Records are tagged CC BY-SA 4.0 and retain the article source URL.
- Chat history, user profiles, private uploads, credentials and arbitrary database dumps are excluded.
- Email, phone-like values and obvious secret markers are rejected.
- Snapshots use GZIP JSONL, SHA-256 manifests, and integrity-checked restore.
- Restored entries remain pending review and are merged without overwriting existing local records.

Render variables:
- `ARCHIVE_GITHUB_OWNER=Ulugbek4801741`
- `ARCHIVE_GITHUB_REPO=ulugbek-ai`
- `ARCHIVE_GITHUB_BRANCH=public-knowledge-archive`
- `PUBLIC_ARCHIVE_INTERVAL_MS=3600000`

For publishing, create a GitHub fine-grained token scoped only to this repository with Contents read/write and save it in Render as `GITHUB_ARCHIVE_TOKEN`. Never paste it into chat or commit it. Without the token, the service can restore public snapshots but cannot publish new ones.

The server restores the archive before restarting the public learning worker, then checks hourly. Render Free local storage remains ephemeral; the public GitHub branch is the recovery copy. This is sourced retrieval memory, not foundation-model training or new neural-network weights.
