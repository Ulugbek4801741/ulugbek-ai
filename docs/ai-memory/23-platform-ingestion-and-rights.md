# Platform media ingestion and rights

## Supported acquisition paths
Prefer, in order:
1. User-uploaded files or media the user has rights to use.
2. Official platform APIs and documented export/download features, with required user authorization.
3. Publicly accessible media where platform terms, copyright and applicable law permit the intended processing.
4. Licensed stock/media providers and open-licensed archives.

## Platform-specific guardrails
YouTube, Instagram, Facebook and similar services have distinct API, embed, download, privacy and reuse rules. Implement separate adapters that check current official terms and API scopes. Do not assume a public URL grants a right to download, modify, redistribute or monetize the media.
Never bypass login, paywalls, CAPTCHAs, DRM, bot challenges, rate limits, access controls or private-account restrictions. Do not scrape private profiles or collect personal data at scale.

## User intent and permissions
Before processing external media, establish the permitted operation: link preview, metadata extraction, transcript where authorized, user-provided download, editing for personal use, or redistribution. If the requested action requires rights the user has not established, request a licensed/user-provided source or offer a lawful alternative.

## Copyright-aware transformation
A transformation does not automatically remove copyright obligations. Keep attribution and license conditions; limit retained excerpts; do not reproduce substantial copyrighted works. Do not offer a workflow that strips watermarks or removes creator attribution to disguise ownership.

## Source manifest
For each imported asset record: original URL, platform, asset identifier, acquisition method, account authorization scope (never tokens), uploader/creator attribution when public and relevant, access timestamp, license/permission basis, processing steps, output relationship and retention expiry.
Store OAuth tokens only in a secrets manager, encrypted and scoped to minimum permissions. Never log tokens or place them in memory documents.

## Failure behavior
If API access is unavailable, explain that the platform blocks or does not authorize the requested operation. Offer user upload, official export, embed/link analysis, or licensed media instead. Never claim to have fetched media when only a URL or metadata was obtained.

## Acceptance tests
- Private content cannot be accessed without valid user authorization.
- Rate-limit and access-denied responses are respected.
- Imported media retains creator/license provenance.
- API scopes are least-privilege and revocable.
- No token, cookie or credential appears in logs, prompts or memory.
