# ULUGBEK AI — Security baseline

## Secret handling
- Keep AI provider keys and admin credentials only in the backend host's secret manager/environment variables.
- Never place real values in frontend files, source control, logs, issues, or screenshots.
- Rotate a credential immediately if it is accidentally published.
- GitHub Pages serves static files only; it cannot securely host server-side credentials or the Express API.

## Before enabling an admin panel
- Implement server-side authentication and authorization on every admin API route.
- Use HTTPS, short-lived HttpOnly cookies with Secure and SameSite attributes, CSRF protections where applicable, and server-enforced expiry.
- Rate-limit login attempts and use constant-time comparisons for secret comparisons.
- Log security events without logging credentials, cookies, or session tokens.
- Do not expose private user data in the admin overview.
- Add tests for anonymous access denial, incorrect credentials, successful access, expiry, logout, and rate limiting.
- The current `public/admin.html` is only a UI shell. It is not a functioning or secure admin system until these server-side controls are implemented and verified.

## Agent execution safety
- Do not execute generated code on the main application server with unrestricted permissions.
- Run builds and tests in isolated, disposable workers with CPU, memory, time, disk, and network limits.
- Treat web pages, repositories, uploaded files, and model output as untrusted input.
- Require human approval before publishing, spending money, sending messages, deleting data, changing permissions, or deploying to production.
- Record provenance and license information for code or dependencies proposed from public sources.
- Pin dependency versions, run automated tests and dependency/security scans, and review changes before release.

## Production readiness gaps
- User authentication and role-based access control are not implemented.
- Durable database, backups, data retention controls, and account deletion are not implemented.
- Admin authentication is not implemented in the current backend.
- Background job queue, isolated code execution, internet research tools, and autonomous deployment are not implemented.
- Perform an independent security review and staged load testing before public production use.
