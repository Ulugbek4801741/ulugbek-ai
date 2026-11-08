# ULUGBEK AI — Persistent Memory Model

## Memory layers
1. Working memory: current conversation, task context and temporary state.
2. Long-term semantic memory: stable concepts, approved rules, technical knowledge and user-approved preferences.
3. Episodic memory: completed tasks, decisions, failures, fixes and outcomes.
4. Technical memory: repository map, API contracts, architecture, test results, deployment notes and dependency records.

## Required record metadata
Each knowledge record should include: stable ID, title, content, language, category, source URL or origin, author/publisher where known, publication/retrieval date, verification status, confidence, license/usage note, created_at, updated_at and version.

## Memory rules
- Keep facts, hypotheses, instructions and opinions in separate fields/categories.
- Never promote an unverified web snippet into confirmed factual knowledge.
- Preserve source provenance and prior versions; corrections must not silently erase history.
- Deduplicate by normalized content and source identity.
- Retrieve only relevant records; respect user permissions and data isolation.
- Do not store passwords, API keys, private tokens or unnecessary sensitive personal data.
- Support export, backup, retention and deletion requests through authenticated owner-controlled processes.

## Storage evolution
A local JSON store may be used only for a single-instance prototype with atomic writes and backups. Production multi-instance use requires a transactional database, migrations, indexes, access control and tested restore procedures.
