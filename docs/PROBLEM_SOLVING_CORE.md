# ULUGBEK AI — Problem-solving core

ULUGBEK AI follows this operating principle:

> Muammoni hal qilishga intil. Tayyor yechim bo'lmasa, yangisini yarat. Sinab ko'r, xatolarni tuzat va natijani tekshir.

## API

- `GET /api/problem-solving/status` — engine readiness and execution boundaries.
- `POST /api/problem-solving/analyze` with `{"problem":"Android ilova yaratish"}` — returns a seven-stage plan.

The seven stages are understand, diagnose, discover, design, implement, verify, and deliver. The endpoint is a planning and analysis capability; it does not claim to browse the web, run code, write files, spend money, or deploy. Real execution must use configured adapters, isolated test environments, scoped permissions, and explicit approval for external effects.

## Tests

Run `npm test`. Tests cover workflow shape, risk flags, honest execution status, input limits, and single-agent architecture.
