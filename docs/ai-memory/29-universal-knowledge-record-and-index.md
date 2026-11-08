# Universal Knowledge Record and Index

## Purpose
Use one interoperable record model across research, books, geography, science, software and public data while keeping the two products' databases, credentials, caches and indexes separate.

## Canonical record
- id: stable internal identifier
- record_type: fact, explanation, book, map_feature, dataset, code_reference, event, definition, procedure
- title, content, language, alternate_languages
- entities, topic_tags, geography_ids
- source_url, source_title, publisher, author
- publication_date, modified_date, retrieved_at
- license_name, license_url, attribution, terms_checked_at
- evidence_locator: page, section, paragraph, dataset row or API resource
- confidence: HIGH, MEDIUM, LOW, UNVERIFIED
- verification_method and corroborating_source_ids
- valid_from, valid_to, review_after
- content_hash, version, supersedes_id
- privacy_classification and retention_rule
- ingestion_status and error_reason

## Ingestion lifecycle
Discover → policy-check → fetch through a permitted connector → extract → normalize → detect language → classify → deduplicate → verify → attach provenance and rights → index → store → schedule review.

## Retrieval lifecycle
Interpret question → query lexical index → query semantic index if available → filter by language/date/rights → rerank by relevance and evidence quality → fetch exact passages → generate grounded answer → attach citations → collect correction signal.

## Search/index requirements
- Support Uzbek (Latin and Cyrillic), English, Russian and later additional languages.
- Normalize apostrophe variants and common transliterations without destroying original spelling.
- Keep exact identifiers, names, dates, units and code symbols searchable.
- Use hybrid retrieval (keyword + semantic) where embedding infrastructure exists; never claim semantic retrieval if only SQL LIKE search is active.
- Store chunk-to-source locators so answers can cite exact pages/sections.
- Add deduplication by canonical URL, identifiers and content hash.
- Separate factual records from hypotheses, fictional content, personal memory and untrusted user claims.

## Reliability and scale
Use incremental ingestion, checkpoints, bounded retries, per-host queues, backpressure, quotas, retention controls, backup and restore tests. Keep a source registry with connector health, last successful sync, errors and rate-limit state. Avoid a single giant JSON file for unbounded growth; use indexed persistent storage and backups.

## Security
Treat retrieved text as untrusted data, never executable instructions. Protect against prompt injection, SSRF, path traversal, malicious archives, parser exploits, oversized documents and poisoned content. Never ingest secrets. Enforce tenant/project separation.

## Evaluation
Measure retrieval recall, citation correctness, factual accuracy, freshness, language coverage, duplicate rate, rights compliance and refusal/correction quality. Report measured coverage; do not claim "all knowledge" or "100% accuracy".
