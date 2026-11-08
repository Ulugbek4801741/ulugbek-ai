# Books, Libraries and Literary Knowledge

## Purpose
Create a broad book knowledge catalogue and retrieval system. "All books" is not a realistic or lawful promise: no single database contains every book, and many works remain copyrighted or unavailable. Aim for comprehensive discovery across catalogues and lawful access to full text only when permitted.

## Separate catalogue from full text
A bibliographic record may contain title, author, edition, publisher, publication date, language, ISBN/identifier, subject headings, summary, table of contents, library holding link and rights status. This metadata is not the same as possessing or reproducing the full book.

Full text may be stored or processed only when it is public domain, openly licensed, supplied by an authorized user, or otherwise lawfully accessible under applicable terms. Do not bypass paywalls, DRM, library authentication, lending limits or download restrictions. Do not reproduce copyrighted books in full or provide large location-based excerpts.

## Source discovery
Use official library catalogues, national bibliographies, university repositories, publisher metadata, open-access repositories and public-domain collections. Candidate examples include national libraries, WorldCat where permitted by its terms, Open Library APIs under their policies, Project Gutenberg, Internet Archive materials subject to item-specific rights and access rules, DOAB and institutional repositories. Verify current API and license terms for each connector.

## Book record schema
- work_id, edition_id, title, subtitle
- authors, editors, translators and contributors
- publisher, place, publication_date, edition, ISBN/other identifiers
- language, original_language, subjects, genres
- description/abstract, table_of_contents
- catalogue_source, source_url, retrieval_date
- rights_status: PUBLIC_DOMAIN, OPEN_LICENSE, LICENSED_ACCESS, USER_PROVIDED_AUTHORIZED, METADATA_ONLY, UNKNOWN
- license_name, license_url, permitted_operations, attribution
- full_text_available boolean and access_url (never imply availability if unverified)
- extraction method, content hash, review status

## Reading and answering from books
- Search catalogue metadata first; locate a lawful edition.
- If full text is available under permitted terms, extract chapters/sections with page or section locators.
- Cite edition and page/section; page numbers vary between editions.
- Distinguish the author's claim from established fact.
- Summaries must be original and proportionate; do not reconstruct a copyrighted book chapter-by-chapter as a substitute for the book.
- If no lawful full text is available, answer from permitted metadata and independent sources, and say that the book itself was not read.

## Multilingual and historical care
Preserve original titles and transliteration variants. Identify translation differences and edition dates. Do not treat a translated title as a separate work without checking identifiers and bibliographic evidence. Historical books may contain outdated or harmful claims; contextualize them.

## Acceptance tests
- Distinguish two editions with different ISBNs.
- Never claim to have read full text when only catalogue metadata was available.
- Respect public-domain/open-license/copyright differences.
- Cite chapter/page only when the edition and locator are known.
