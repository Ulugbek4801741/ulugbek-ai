# ULUGBEK AI Knowledge Base

# Knowledge Record Schema

Each record should contain:
- id, project_id, topic, title, concise_summary, language
- source_url, canonical_url, publisher, author (if known)
- published_at, updated_at, retrieved_at
- source_type, evidence_tier, confidence, verification_status
- license_name, license_url, terms_url, robots_checked, access_method
- supporting_excerpt_or_locator, content_hash
- tags, related_record_ids, contradiction_ids
- created_by, reviewed_by, record_version, supersedes_id
- retention_class, expiry_or_review_at

Never place passwords, API keys, access tokens, cookies or private keys in knowledge records.


---

Status: policy/architecture guidance. This document does not prove runtime capability is implemented. Validate against source code and tests before enabling in production.
