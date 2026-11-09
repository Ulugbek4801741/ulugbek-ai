# Knowledge Coverage Roadmap and Acceptance Tests

## Goal
Grow broad and useful knowledge coverage without promising omniscience. Measure actual sources, languages, formats, retrieval quality and freshness.

## Phases
### Phase 1 — Reliable foundations
- Implement canonical provenance-aware records.
- Add question classification and false-premise detection.
- Add exact citation locators and correction history.
- Add Uzbek Latin/Cyrillic normalization and English/Russian support.

### Phase 2 — Public knowledge connectors
- Official documentation and public web pages.
- Government open-data portals and statistical datasets.
- Open scholarly metadata and openly licensed research.
- Public source-code repositories and package registries.
- RSS/Atom and permitted sitemap discovery.

### Phase 3 — Books and documents
- Bibliographic catalogues and public-domain/open-license full text.
- PDF, HTML, TXT, EPUB, DOCX, CSV and XLSX extraction where supported.
- Per-item rights checks, page/section locators and edition tracking.

### Phase 4 — World geography
- Global country/admin gazetteer.
- Open licensed boundaries and physical geography.
- Settlements, streets, public paths and public POIs where permitted.
- Update timestamps, positional accuracy and coverage-gap reporting.

### Phase 5 — Evaluation and scale
- Benchmark retrieval and answer accuracy by language and topic.
- Monitor connector health, freshness, failures, costs and storage.
- Backups, restore drills, quotas, incremental updates and deletion policies.
- Add connectors only after legal, security and reliability review.

## Minimum acceptance suite
1. False-premise question is challenged with evidence.
2. Fictional question is labeled and not stored as fact.
3. Current event uses fresh sources and date.
4. Two contradictory sources remain visible with confidence notes.
5. Uzbek Latin/Cyrillic variants retrieve the same relevant concept.
6. Book metadata is never described as full-text reading.
7. Copyrighted full text is not copied into the knowledge store without permission.
8. Map feature retains license and attribution.
9. Building location is not used to infer resident identity.
10. Robots, API terms, rate limits and access denials are honored.
11. Retrieved prompt injection is treated as untrusted content.
12. Failed ingestion resumes from checkpoint without hammering a source.
13. ULUGBEK AI cannot read ASILBEK AI private storage or secrets, and vice versa.
14. Documentation does not count as a passing runtime test.

## Operational reporting
Expose counts for sources, records, languages, formats, verified records, stale records, failed connectors and last successful sync. Report measured coverage and known gaps. Do not claim every book, every house or every fact is indexed.
