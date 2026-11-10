# ULUGBEK AI — Privacy and Operations Baseline

## Status

This document defines implementation requirements; it is not a claim that every control is already implemented or that the service is production-ready. The current Platform v1 branch is a backend foundation only.

## Privacy defaults

1. **First-party processing by default.** User profiles, messages, uploads, sessions, audit records, and application data must be processed on infrastructure controlled by ULUGBEK AI. Do not send user prompts, files, contacts, message bodies, or profile data to external AI APIs, analytics, advertising SDKs, or error-reporting services by default.
2. **No hidden third-party integrations.** Any optional external processor must be explicitly documented, disabled by default, reviewed for data minimization and contractual/privacy requirements, and enabled only after an authorized operator decision. Keep an inventory of data, purpose, recipient, retention, and opt-in status.
3. **Secrets stay server-side.** Never put database credentials, SMTP passwords, SMS credentials, encryption keys, or AI model credentials in browser code, mobile apps, Git, logs, or API responses. Store production secrets outside the repository and rotate them after suspected exposure.
4. **Data minimization.** Collect only data needed for a stated feature. Avoid logging request bodies, passwords, authentication codes, message content, access tokens, and full personal identifiers.
5. **Access and encryption.** Require TLS in transit; encrypt sensitive stored data where appropriate; use least-privilege database roles; isolate uploaded files from public web paths; verify authorization on every private-resource request.
6. **Retention and deletion.** Define retention periods per data type, provide user export/deletion workflows where legally appropriate, and ensure backups expire under a documented schedule. Deletion from the live database alone is not a promise that every backup has immediately vanished.
7. **Accountability.** Record security-relevant administrative actions without copying private message content into audit logs. Add incident response, backup restoration tests, dependency patching, and access reviews before public launch.

## Email and SMS limitations

- The application can run its own notification queue and mail/SMS connector on the ULUGBEK AI server.
- **Email delivery is not entirely first-party** when sending to an address hosted by another provider: the recipient's mail service and intermediate mail relays may process message metadata and content. A self-hosted SMTP server gives more control over the sending side, but does not make the entire email route private.
- **SMS delivery is not entirely first-party**: mobile operators and any SMS gateway used to reach the destination necessarily process routing data and often message content. A directly attached SIM/modem can avoid an SMS aggregator in some use cases, but the mobile operator still handles delivery and it is not a scalable global SMS service.
- Therefore, do not put sensitive personal details in SMS/email. Use short-lived, single-use verification codes; store only a hash of the code; rate-limit requests; expire codes quickly; and never log codes. Offer an authenticator/passkey or in-app verification option where practical.
- For global email/SMS, do not claim “no third party can see anything.” Publish a clear data-flow notice and obtain any required consent before enabling an external delivery route.

## One-server starting architecture

A single Linux VPS can initially host the reverse proxy/TLS endpoint, application API, PostgreSQL, Redis/queue, background workers, and a self-hosted model runtime only if the chosen model fits available RAM/CPU/GPU. Keep services in separate containers, expose only HTTPS publicly, bind databases/Redis to private container networking, use a firewall, and automate encrypted off-server backups.

One VPS is a cost-effective starting point, not high availability: hardware failure, maintenance, or resource exhaustion can take the entire service offline. Backups stored on the same disk are not sufficient. Load testing must establish actual concurrency and capacity before publishing performance claims.

## AI processing modes

- Default privacy mode: local/self-hosted model inference, with no prompt/file forwarding to an external model vendor.
- If local inference is unavailable or too weak, fail clearly or ask the user to explicitly enable a named external provider. Never silently fall back to a third-party AI.
- Local inference consumes server resources and may require a larger machine; the cheapest VPS may not be capable of running a useful language model at acceptable speed. Model capability and capacity must be benchmarked.

## Release gates before real users

- Threat model and data-flow inventory reviewed.
- Authentication, authorization, password/session protection, account recovery, and abuse limits implemented and tested.
- Encryption keys/secrets configured outside Git.
- Upload validation, private-media access controls, and deletion flows tested.
- Database migrations, backup restoration, monitoring, patching, and incident procedures verified.
- Email/SMS routes documented and explicitly configured; no open mail relay and no SMS/OTP logging.
- Automated tests, dependency/security checks, and realistic load tests pass.
- Privacy notice and terms reviewed for the countries in which the service will operate.

Until these gates are satisfied, this foundation must not be represented as a finished, secure global platform.
