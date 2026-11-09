# ULUGBEK AI Knowledge Base

# Web Fetcher Architecture

## Pipeline
User task → policy gate → URL validation → source registry → robots/terms check → bounded HTTP fetch → content-type validation → extraction → provenance record → knowledge review → storage.

## Transport
Use HTTPS by default. Permit HTTP only when explicitly justified for a public resource and never send credentials over it. Use official APIs before HTML scraping. Identify the client honestly with a descriptive User-Agent and contact URL where practical.

## Limits
Set connection/read timeouts, maximum redirects, response bytes, decompressed bytes, page count, per-host concurrency, request rate, and total task budget. Apply exponential backoff only for transient failures and respect Retry-After. Do not retry 401, 403, 404 or explicit blocks as a way to force access.

## Redirects
Revalidate every redirect target against URL and network safety rules. Do not forward authorization headers across origins. Reject unsupported schemes, embedded credentials and malformed URLs.

## Extraction
Prefer structured data, RSS/Atom, sitemaps and documented APIs. Preserve page title, headings, canonical URL, dates and text boundaries. Keep raw HTML only when necessary and retention is lawful.

## Failure behavior
Record a typed failure (blocked, disallowed, timeout, oversized, unsupported, parse error, network error). Do not silently claim that a failed fetch was successful.


---

Status: policy/architecture guidance. This document does not prove runtime capability is implemented. Validate against source code and tests before enabling in production.
