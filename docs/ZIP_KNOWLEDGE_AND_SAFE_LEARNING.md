# ULUGBEK AI ZIP knowledge archive

The administrator can import and export retrieval-only knowledge documents as ZIP archives.

## Import

POST /api/admin/knowledge/import.zip

Authentication: sign in to the admin panel first; the browser sends the HttpOnly ulugbek_admin session cookie automatically. Content-Type: application/zip. Also accepts application/x-zip-compressed and application/octet-stream.

Limits: 20 MiB compressed archive, 40 MiB expanded total, 100 files, 1 MiB per file. Text/document and source-code extensions are allowlisted. Unsupported/binary files and files containing detected credentials are skipped. ZIP paths are validated; symbolic links and encrypted archives are rejected. Files are streamed and never extracted to disk. Imported source code is retrieval-only and never executed.

## Export

GET /api/admin/knowledge/export.zip

The response contains manifest.json and knowledge/documents.jsonl. Administrator access is required because the archive may contain user-provided material.

## Safe public-source learning

Set ENABLE_PUBLIC_LEARNING_WORKER=true to start only the read-only public research worker while keeping admin autopilot, developer-agent code changes, and self-recovery disabled. The worker respects robots.txt, rate limits, HTTPS-only access and public-source restrictions. New research candidates remain pending review and are not silently promoted to verified facts.

For Render Free, start with LEARNING_INTERVAL_MS=21600000 (six hours). The local candidate corpus is ephemeral unless persistent storage is configured. Set ENABLE_HEAVY_KNOWLEDGE_SEARCH=true only when the host has enough memory to load the BM25 index.
