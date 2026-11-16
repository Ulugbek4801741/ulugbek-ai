# ULUGBEK AI — universal account and course marketplace

This branch adds a PostgreSQL-backed API foundation for a single account shared by ULUGBEK AI and the course marketplace.

## Required Render environment

- DATABASE_URL: Render PostgreSQL internal connection string.
- AUTH_SESSION_SECRET: long random secret (at least 32 bytes).
- AUTH_OTP_SECRET: separate long random secret for verification-code hashing.
- RESEND_API_KEY and optionally AUTH_EMAIL_FROM: email verification delivery.
- TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER: SMS verification delivery.
- FRONTEND_ORIGIN: comma-separated allowed browser origins.

Payme and Click keys are not sufficient on their own. Their merchant callback handlers and sandbox certification must be implemented and tested before enabling real payments. The current API deliberately returns HTTP 501 rather than pretending a payment was accepted.

## API

- GET /api/marketplace/status
- POST /api/marketplace/auth/register
- POST /api/marketplace/auth/verify
- POST /api/marketplace/auth/login
- GET /api/marketplace/auth/me
- POST /api/marketplace/auth/logout
- GET /api/marketplace/courses?q=&type=all|free|paid
- POST/PATCH/DELETE /api/marketplace/courses
- GET /api/marketplace/teacher/courses
- GET /api/marketplace/student/courses
- POST /api/marketplace/payments/intent

## Security notes

Passwords use Node.js scrypt; sessions are random, stored hashed, and issued as HttpOnly Secure cookies. Verification codes are hashed, expire after ten minutes, and are limited to five attempts. Course mutations are constrained by owner ID in SQL. Paid content is not exposed in the catalog response unless the signed-in buyer has a paid purchase record.

The course menu is connected to the API through marketplace-ui.js. The rest of the ULUGBEK AI application is not yet globally gated by this account. A Render PostgreSQL database and email/SMS credentials must be configured before registration can work. Do not enable production payment until Payme/Click callback validation, idempotency, refunds, and sandbox tests are complete.
