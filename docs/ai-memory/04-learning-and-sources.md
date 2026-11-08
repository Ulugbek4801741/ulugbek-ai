# ULUGBEK AI — Learning and Source Verification

## Learning loop
Define question → search approved sources → fetch primary material → extract claims → cross-check → label confidence → store candidate → retrieve in relevant tasks → evaluate usefulness → update with version history.

## Source hierarchy
Prefer official technical documentation, standards, original research papers, government/public datasets and primary project repositories. Use reputable secondary sources for context. Treat social posts, forums, scraped snippets and generated content as leads, not proof.

## Verification requirements
- Store source URL, title, publisher, date and retrieval time.
- For important or changing claims, compare at least two independent reliable sources where practical.
- Record contradictions and uncertainty; do not hide them.
- Respect robots.txt, site terms, copyright, licenses, privacy and rate limits.
- Do not bypass authentication, paywalls, access controls or platform restrictions.
- Only use datasets and code under licenses/permissions compatible with the intended use.

## Model independence
The knowledge base, retrieval, task planner, policy checks and evaluation must remain usable when an external model provider is unavailable. Provider adapters may be added or removed without losing project memory. Do not claim foundation-model training merely because documents or statistical language patterns were stored.
