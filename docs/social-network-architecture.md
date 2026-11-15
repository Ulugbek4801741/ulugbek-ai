# ULUGBEK AI Social Network — architecture and rollout

## Product decision
One first-party social network inside ULUGBEK AI with two account modes:
- **Private**: new accounts and new posts default to private; profiles may be private or invite-only.
- **Public**: users may explicitly publish public profiles and posts.
- Visibility is selected separately for each profile and post. A private profile never makes its content public automatically.

## First-party features
Profiles and handles, public/private feeds, follow requests, text/media posts, comments, reactions, blocks, reports and moderation. Direct messages remain disabled until secure message storage and key management are designed.

## Privacy and safety rules
1. New profiles and posts default to private.
2. Profile and post visibility are evaluated server-side on every request.
3. A block overrides public/follower/invite visibility and prevents interaction in both directions.
4. Followers-only content requires an accepted follow relationship.
5. Invite-only content requires a valid accepted invite.
6. Publishing, sending messages, changing visibility, deleting content and external sharing require explicit user confirmation.
7. Never scrape private accounts or bypass third-party platform permissions.
8. Never log post bodies, message contents, access tokens, email addresses or private profile data.
9. Reports are visible only to the reporter and authorized moderators.
10. Account export, deletion, retention policy, abuse appeal, backups and restore tests are required before public launch.
11. A public profile is not consent to expose private messages, contact details or private media.

## Architecture
- One universal ULUGBEK AI agent coordinates user tasks; the social network is a product module, not a second agent.
- PostgreSQL stores account references, profiles, follows, posts, comments, reactions, blocks, invites and reports.
- Object storage holds uploaded media; PostgreSQL stores object keys and metadata only.
- Existing db/schema.sql defines app_users, but it is a design scaffold and is not automatically applied by the current server.
- Existing admin PIN authentication is for administration only; it is not end-user authentication and must never authorize social accounts.
- Authentication must be established before social read/write routes are enabled.
- Database access must use a non-owner application role, transaction-scoped authenticated user identity and tested Row-Level Security (RLS).
- The current social status endpoint remains read-only and reports the feature as disabled.
- Direct messages are not enabled: the foundation table is not end-to-end encrypted.
- Third-party networks may be connected only through official APIs and OAuth scopes, with revocable tokens and per-action approval.

## Existing open-source work reviewed
- [Fedify](https://github.com/fedify-dev/fedify) is a TypeScript/JavaScript ActivityPub framework. It is a suitable later integration candidate if ULUGBEK AI needs federation with Mastodon and other ActivityPub services; it is not a replacement for our private-account authorization, user database or product UI.
- [Cloudflare Wildebeest](https://github.com/cloudflare/wildebeest) demonstrates a Mastodon-compatible ActivityPub server and media/profile/feed features, but its repository is archived. Do not adopt it as the production core or copy its infrastructure assumptions.
- The current Node.js/Express ULUGBEK AI code remains the first-party application. Reuse proven protocol libraries only for optional interoperability; do not import an entire unrelated social platform.

## Rollout gates
1. **Foundation:** schema, visibility policy, fail-closed tests and architecture (this PR).
2. **Identity:** real end-user sign-in, verified identity, account recovery, secure sessions, CSRF protection and rate limits.
3. **Private beta:** profile CRUD, follow requests, posts, feed, comments, reactions, blocks and reports with per-request authorization and RLS.
4. **Public launch:** moderation, abuse reporting, export/delete, privacy retention, backups, security review, load tests and monitoring.
5. **Optional federation:** ActivityPub via a maintained library after local privacy and block semantics are proven.

## Current limitation
This PR is a tested foundation, not a running social network. There is no configured end-user identity provider, PostgreSQL connection or applied social migration. Social read/write routes remain disabled. Do not claim posting, messaging, registration or private feeds work until each is implemented and verified end-to-end.
