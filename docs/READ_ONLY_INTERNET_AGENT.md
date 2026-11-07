# ULUGBEK AI — Read-only Internet Learning Agent

## Permission boundary

The research agent is strictly read-only toward every external website. It may issue HTTPS GET requests only to publicly reachable pages and public search endpoints. It must never submit forms, authenticate, register accounts, post comments, upload files, send messages, or use POST/PUT/PATCH/DELETE against external origins.

## Required reading checks

- Resolve the hostname and reject private, loopback, link-local, and reserved IP addresses.
- Fetch and obey the site's `robots.txt` before reading both search-result pages and destination pages.
- Observe `Crawl-delay` and a minimum per-host request gap.
- Stop on HTTP 401, 403, or 429; do not retry around a block or use alternate identities.
- Follow only a small number of HTTPS redirects and revalidate every destination.
- Read only public HTML or plain text with strict response-size and timeout limits.
- Never execute JavaScript, downloaded code, browser extensions, or files.

## Knowledge handling

- Store source URL, title, language, retrieval timestamp, and extracted public text in the internal knowledge store only.
- Deduplicate previously visited URLs and content.
- New material remains `pending-review`; it is not factual chat evidence until approved.
- The chat may retrieve only approved knowledge entries.
- Learning text statistics is not the same as retraining neural model weights. Report these states separately.

## Operational status

The learning worker must expose its current state, last successful read, saved count, blocked/robots errors, and storage location. A running worker with zero saved pages is not considered successful learning.
