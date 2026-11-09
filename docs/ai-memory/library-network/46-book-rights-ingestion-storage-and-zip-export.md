# Book rights, lawful ingestion, storage and ZIP export

## Non-negotiable rights gate
A book being free to read, visible in a search result, available in a library catalogue, or downloadable by an account holder does not by itself grant permission to copy, retain, process with AI, redistribute, or publish it. Rights are evaluated per edition and per file, not once per library.

## Rights decision states
- `public_domain_verified`: evidence and jurisdiction/basis recorded; still obey source-site terms and local law.
- `open_license_redistribution_allowed`: licence explicitly permits the proposed copying and distribution; comply with attribution, share-alike and other conditions.
- `open_access_read_only_or_unclear`: reading is allowed but redistribution or AI processing is not established; do not mirror.
- `borrow_or_limited_access`: lending/preview only; do not bulk-download or redistribute.
- `all_rights_reserved_or_unknown`: metadata only; link to the lawful source.
- `permission_granted`: retain written permission scope, grantor, date, permitted uses and expiry.
- `blocked_or_takedown`: stop ingestion and remove controlled copies according to the documented takedown process.

## Per-title preflight
Before downloading, verify: exact edition; rights statement; licence URL and version; permitted territory; commercial/non-commercial status; derivatives/adaptation; redistribution; attribution; share-alike; text/data-mining and AI-use restrictions; source terms; robots/rate limits; file integrity. A Creative Commons NoDerivatives licence does not permit adapted/revised versions; NonCommercial does not authorize commercial service use. When terms conflict or are unclear, keep metadata and canonical link only.

## Ingestion pipeline
1. Harvest metadata only from documented interfaces.
2. Normalize identifiers, title, author names, languages and subject tags without discarding originals.
3. Resolve canonical record and item-level rights evidence.
4. Apply a policy engine to the intended action (read, cache, embed, summarize, quote, redistribute, commercial use).
5. Download only if that exact action is allowed; obey provider limits and store provenance.
6. Verify MIME type, size limits, malware scan, checksum, archive-bomb protections and parser sandboxing.
7. Extract text with page/chapter anchors; distinguish OCR from born-digital text.
8. Store text/chunks only for permitted purposes; keep source attribution and licence alongside every chunk.
9. Record coverage honestly: metadata-only, preview-read, partial authorized text, full authorized text, or independently evaluated.
10. Support expiry, licence-change rechecks, source deletion and takedown propagation.

## ZIP export rules
A ZIP can contain only files whose licences/permissions allow the requested redistribution. Every export must include a manifest with title, creator, source URL, edition, file checksum, licence name/version/URL, attribution text, retrieval date, and included file path. Preserve required licence notices and share-alike terms. Exclude borrow-only, preview-only, all-rights-reserved, unknown-rights and non-redistributable items. Do not put copyrighted books in a public Git repository or release ZIP merely because an AI can access them.

For a large lawful corpus, store book files in object storage or a dedicated dataset repository with access controls, not in the application source-code repository. GitHub source repositories are not a bulk ebook hosting service. Keep the code, metadata index and rights manifests in Git; store only approved corpus objects in a storage system whose terms and capacity are suitable.

## Acceptance tests
- A catalogue record with no file is indexed as metadata-only.
- A preview or borrow-only title is never bulk-downloaded.
- A CC BY title can be exported with required attribution.
- A CC BY-SA title retains share-alike notices.
- A CC BY-NC title is blocked from commercial-use export unless separately licensed.
- A CC BY-ND title is blocked from adapted editions.
- An unknown licence is blocked from redistribution.
- Licence changes and takedowns propagate to chunks, caches and export manifests.
- ZIP manifest and checksums match actual files.
- No system claims "all books copied" when only a catalogue was harvested.
