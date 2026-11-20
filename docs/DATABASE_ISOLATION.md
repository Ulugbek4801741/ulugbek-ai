# Database isolation

- ULUGBEK knowledge chunks use only ULUGBEK_DATABASE_URL and the ulugbek_knowledge_chunks table.
- VIZOR learning platform uses only VIZOR_DATABASE_URL and its vizor_* tables.
- The generic DATABASE_URL is intentionally unused by both modules to prevent cross-project data mixing.
- The two Neon projects are separate: ULUGBEK-AI-MEMORY and vizor-platform-db.
