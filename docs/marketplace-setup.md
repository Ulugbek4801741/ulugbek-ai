# ULUGBEK AI — universal account and course marketplace

This branch adds a PostgreSQL-backed API foundation for a single account shared by ULUGBEK AI and the course marketplace.

## Required Render environment

- DATABASE_URL: Render PostgreSQL internal connection string.
- AUTH_SESSION_SECRET: long random secret (at least 32 bytes).
- AUTH_OTP_SECRET: separate long random secret for verification-code hashing.
- RESEND_API_KEY and optionally AUTH_EMAIL_FROM: email verification delivery.
- TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER: SMS verification delivery.
- FRONTEND_ORIGIN: comma-separated allowed browser origins.
- BANK_NAME: bank name shown to buyers.
- BANK_CARD_HOLDER: verified cardholder name.
- BANK_CARD_NUMBER: receiving card number (publicly displayed in the course checkout; use a dedicated business card).

## Manual card transfer (human approval)

- Buyer signs in, opens a paid course, transfers the exact amount to the configured card in their own bank app, and submits the bank receipt/transaction reference.
- The purchase remains `pending`; paid course content stays locked.
- The course owner checks the incoming transfer in their bank app and explicitly confirms it in the teacher dashboard. Only then is the purchase marked `paid` and the course unlocked.
- Never request or store a card PIN, CVV, SMS/OTP code, or banking password. A screenshot/reference alone is not proof of funds.
- Configure BANK_NAME, BANK_CARD_HOLDER, and BANK_CARD_NUMBER before accepting manual transfers. Use a dedicated business card and publish its details only with the cardholder's authorization.

Payme/Click automatic callbacks are still disabled. Their merchant callback handlers, signature checks, idempotency, refunds, and sandbox certification must be implemented and tested before enabling them.

## API

- GET /api/marketplace/status (integration readiness only; never returns bank/card details)
- GET /api/marketplace/payments/manual-details?courseId=<uuid> (authenticated buyer, specific published paid course only)
- POST /api/marketplace/auth/register
- POST /api/marketplace/auth/verify
- POST /api/marketplace/auth/login
- GET /api/marketplace/auth/me
- POST /api/marketplace/auth/logout
- GET /api/marketplace/courses?q=&type=all|free|paid
- POST/PATCH/DELETE /api/marketplace/courses
- GET /api/marketplace/teacher/courses
- GET /api/marketplace/student/courses
- POST /api/marketplace/payments/manual-intent
- GET /api/marketplace/teacher/payments
- POST /api/marketplace/teacher/payments/:id/confirm
- GET /api/marketplace/payments/intent (legacy automatic flow is disabled)

## Security notes

Passwords use Node.js scrypt; sessions are random, stored hashed, and issued as HttpOnly Secure cookies. Verification codes are hashed, expire after ten minutes, and are limited to five attempts. Course mutations are constrained by owner ID in SQL. Paid content is not exposed in the catalog response unless the signed-in buyer has a paid purchase record.

The course menu is connected to the API through marketplace-ui.js. The rest of the ULUGBEK AI application is not yet globally gated by this account. A Render PostgreSQL database and email/SMS credentials must be configured before registration can work. Do not enable production payment until Payme/Click callback validation, idempotency, refunds, and sandbox tests are complete.
