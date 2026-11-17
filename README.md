# ULUGBEK AI public knowledge archive

This branch contains a Node.js archive integration for the existing ULUGBEK AI server.

## What is archived

Only records from the existing autonomous Wikipedia research worker are eligible:
- source host must be `uz.wikipedia.org`, `en.wikipedia.org`, or `ru.wikipedia.org`;
- source path must be a Wikipedia article URL over HTTPS;
- license is recorded as CC BY-SA 4.0 with the original article URL retained;
- only the worker's public research entries are considered.

Chat histories, user profiles, uploaded files, private business data, credentials, and arbitrary database exports are never included. Obvious email addresses, phone-like values, and secret markers are rejected. Restored entries remain `pending-review`; restoration does not mark claims as verified.

## GZIP snapshots

The Node module `modules/public-knowledge-archive.js`:
- compresses JSONL snapshots with GZIP;
- stores snapshots under `snapshots/` on this branch;
- publishes `latest.json` with SHA-256 and record count;
- verifies the digest and count before restore;
- merges restored public entries without overwriting local/private knowledge.

The Docker image is Node.js based, so the server uses this native Node implementation. The Python utility in `knowledge-worker/public_archive.py` is a standalone test/reference utility, not the production startup path.

## Render configuration

Set these variables on the ULUGBEK AI Render service (merge with existing variables; do not replace the environment):
- `ARCHIVE_GITHUB_OWNER=Ulugbek4801741`
- `ARCHIVE_GITHUB_REPO=ulugbek-ai`
- `ARCHIVE_GITHUB_BRANCH=public-knowledge-archive`
- `PUBLIC_ARCHIVE_INTERVAL_MS=3600000`

For publishing, create a GitHub fine-grained token scoped only to this repository with Contents read/write and save it as the Render secret `GITHUB_ARCHIVE_TOKEN`. Never paste it into chat or commit it. Without this token, the service can restore public snapshots but cannot publish new ones.

The server runs an initial restore before resuming its public learning worker, then checks the archive hourly. The local Render filesystem remains ephemeral on the Free plan; GitHub is the external recovery copy. If no archive exists yet, restore is a no-op. The first publish happens after the server has collected eligible, rights-cleared Wikipedia entries.

## Important limitation

This is durable sourced-knowledge retrieval memory, not training a foundation model or creating new neural-network weights. Free Render sleep pauses the service; it resumes on the next request and can restore the public archive then. A separate persistent disk is not included in Render Free.
