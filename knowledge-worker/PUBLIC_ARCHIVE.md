# Public knowledge archive operations

See the root README in this branch for policy and commands.

The archive utility is deliberately separate from ULUGBEK conversation memory. It only accepts the explicit `public-knowledge.jsonl` export contract, validates rights and source URLs, rejects unexpected fields and obvious personal/secret patterns, compresses snapshots with gzip, and verifies SHA-256 before restore.

No automatic export from the existing application database is enabled yet: the current knowledge store schema must be mapped and reviewed first. Do not point the tool at arbitrary JSON, chat history, profile data, or database dumps.
