# Global library discovery and registry

## Goal
Build a federated, continuously refreshable directory of public, open-access, public-domain and institutionally hosted library catalogues worldwide. "All libraries" is an evolving discovery target, not a finite list or a claim that every institution has an API. Discover new repositories through union catalogues, repository registries, OAI-PMH, sitemaps and publisher feeds; keep each connector independently configurable.

## Required source record
Each source record must include: stable source_id; official name; operator/publisher; country/region; languages; subjects; official homepage; catalogue/search URL; API/OAI-PMH/feed endpoint if documented; supported formats; access class; automation terms/robots status; attribution requirements; last_checked_at; connector status; evidence URL; notes. Never infer a download endpoint from a homepage.

## Required book record
Use a stable source-qualified identifier and retain: title (original script plus normalized form); authors/contributors and roles; ISBN/DOI/other identifiers; publisher; publication date/edition; language; subject taxonomy; description/abstract; source library; canonical record URL; full-text availability (none/metadata/preview/borrow/open-download); file format and verified file URL; checksum when downloaded; rights statement URL; SPDX or normalized licence identifier where possible; public-domain jurisdiction/basis if established; attribution and share-alike/non-commercial/no-derivatives conditions; access date; retrieval method; verification status.

## Discovery strategy
1. Start with aggregator/union registries such as OpenDOAR, OAIster, OpenAlex, CORE, DOAB, re3data and Open Research Library.
2. Expand to national libraries, university repositories, specialist collections, open textbook networks and regional portals.
3. Prefer documented APIs, OAI-PMH, official metadata dumps and publisher feeds. Respect rate limits, robots directives, terms, authentication and takedown requests.
4. Deduplicate by DOI/ISBN, then normalized title + creator + edition; preserve multiple holdings and source-specific rights.
5. Refresh source metadata incrementally and record source snapshots so removals and licence changes are visible.
6. Allow community-submitted sources only after validation of operator, domain ownership, access terms and security.

## Seed catalogue (discovery entry points, not a complete world inventory)
- DOAB — peer-reviewed open-access book discovery; metadata and book-level links.
- OAPEN Library — open scholarly books and full-text where the title licence permits.
- OpenAlex — scholarly work metadata and OA locations; a record does not guarantee a book file or reuse rights.
- CORE — research outputs and repository discovery; item-level rights must be checked.
- OpenDOAR — directory of academic open-access repositories.
- OAIster — union catalogue of institutional and cultural-heritage collections.
- Open Research Library — open-access scholarly book discovery.
- Open Library / Internet Archive — catalogue, lending and selected downloadable public-domain/open items; borrowing is not permission to redistribute.
- Project Gutenberg — public-domain ebooks subject to jurisdiction and site terms.
- Wikisource and Wikibooks — community-maintained source texts and open textbooks under item-specific terms.
- HathiTrust — catalogue and access levels vary by item and jurisdiction.
- Europeana and Digital Public Library of America — cultural heritage metadata and item-level rights statements.
- Gallica (BnF) and Library of Congress digital collections — digitized books and primary sources with item-level rights.
- Biodiversity Heritage Library — biodiversity literature; item-level reuse statements.
- Google Books — discovery and preview/full-view status; preview is not a redistribution licence.
- Open Textbook Library and LibreTexts — open educational textbooks with item-level licences.
- Pressbooks Directory — open textbook discovery; licence differs by title.
- SciELO Books and OpenEdition Books — scholarly books; check title-level licence and download permissions.
- JSTOR Open Content — selected open books and primary sources; rights vary by item.
- NCBI Bookshelf — biomedical books and reports; rights vary by title.
- National and university digital libraries — add through validated official APIs/feeds; do not assume a common licence.
- National Library of Uzbekistan and Uzbek university repositories — priority regional discovery targets; verify each institution's official access and reuse policy before harvesting.

The machine-readable starter list is `library-sources.seed.json`. It is deliberately a registry of discovery endpoints, not a mirror of books.

## Coverage reporting
Show counts separately: sources discovered, sources verified, catalogue records indexed, full texts lawfully downloadable, full texts actually ingested, metadata-only, preview/borrow-only, blocked or terms-unclear. Never report the total catalogue count as the number of books read or downloaded.
