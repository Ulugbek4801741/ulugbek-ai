# ULUGBEK AI Social Network — architecture and rollout

## Product decision
One social network inside the ULUGBEK AI website with two account modes:
- **Private**: new accounts default to private; profile can be private or invite-only.
- **Public**: users can publish public profiles/posts and be discoverable.
- Users can switch visibility per profile and per post. A private account does not make an individual public post visible automatically.

## First-party features
Profiles and handles, public/private feeds, follow requests, posts with text/media, comments, reactions, direct messages, blocks, reports, moderation queue, account export and deletion.

## Privacy rules
1. New profiles default to private.
2. Profile and post visibility are evaluated server-side for every request.
3. A block overrides public visibility and prevents interaction in both directions.
4. Followers-only content requires an accepted follow relationship.
5. Invite-only content requires an accepted invite.
6. Publishing, sending a direct message, changing visibility, deleting content and external sharing require a fresh explicit user confirmation in the UI.
7. Never scrape private accounts or bypass third-party platform permissions.
8. Do not log post bodies, messages, tokens, email addresses or private profile data.
9. Reports are private to the reporter and moderation team; reported content is not automatically public.
10. Provide account export, deletion, retention policy and abuse appeal before public launch.

## Architecture
- One universal ULUGBEK AI agent coordinates tasks; social networking is a product module, not a second agent.
- PostgreSQL stores identities, profiles, follows, posts, comments, reactions, blocks, invites, reports and messages.
- Object storage holds uploaded media; PostgreSQL stores object keys and metadata only.
- Authentication must be established before any social read/write route is enabled.
- Database access uses a non-owner application role and transaction-scoped authenticated user identity. RLS is added and tested before public launch.
- Third-party networks connect only through their official APIs and OAuth scopes, each with revocable tokens and per-action approval.

## Rollout gates
1. **Foundation (this PR):** visibility policy, schema migration, status endpoint, tests and product requirements.
2. Identity: verified sign-in, account recovery, sessions, rate limits and consent.
3. Private beta: profiles, follow requests, posts, feed, comments, reactions, blocks and reports.
4. Public launch: moderation, abuse reporting, privacy/export/delete, backups, storage quotas, security review and load tests.
5. Integrations: Telegram Bot API and approved Meta/other official APIs. No password collection or scraping.

## Current limitation
This PR does not claim a running social network. The existing app has no configured social identity provider and no applied production migration. The status endpoint remains read-only and reports disabled until those prerequisites exist. Do not merge a future implementation that enables posting or messaging before authentication, authorization, database policies and tests are in place.
