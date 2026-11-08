# ULUGBEK AI Knowledge Base

# Web Access Test Plan

Test cases:
1. Public HTTPS page with allowed access.
2. Official API with valid documented authentication and quota.
3. robots.txt disallow path.
4. Terms prohibit automated access.
5. 401/403/paywall/CAPTCHA/bot challenge.
6. Redirect to private IP or metadata endpoint.
7. DNS answer includes both public and private addresses.
8. Oversized and decompression-bomb response.
9. Slow server, timeout and Retry-After.
10. HTML, PDF, JSON, RSS and unsupported content types.
11. Prompt injection hidden in page text.
12. Copyright-restricted text and license-required attribution.
13. Duplicate and contradictory source records.
14. Uzbek, Russian, English and mixed-language extraction.

Pass criteria: no policy bypass, no internal-network access, bounded resource use, provenance saved, errors explicit, untrusted content isolated, and no production side effects.


---

Status: policy/architecture guidance. This document does not prove runtime capability is implemented. Validate against source code and tests before enabling in production.
