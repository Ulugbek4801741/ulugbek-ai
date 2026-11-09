# ULUGBEK AI — operational knowledge base

This folder documents the runtime implementation. It is not a claim that a large book corpus has already been downloaded.

## Runtime components

- `modules/knowledge-store.js`: persistent append-only JSONL chunk store.
- Text splitting: approximately 1,800 characters per chunk with overlap.
- Search: in-memory inverted index with BM25-style ranking, title weighting and phrase boost.
- Chat integration: the normal chat path retrieves local chunks before deciding whether external research is needed.
- URL ingestion: uses the existing HTTPS-only public reader, including public-address checks, robots.txt handling, redirect limits and per-host delay.
- Upload: administrator-only text ingestion, max 1 MB per document.
- No model weights are changed. This is retrieval-augmented generation (RAG).

## Protected administrator endpoints

All endpoints below require the existing ULUGBEK AI administrator session cookie.

- `GET /api/admin/knowledge/status`
- `POST /api/admin/knowledge/ingest` — JSON: `{ "title": "...", "author": "...", "source": "user://...", "language": "uz", "content": "..." }`
- `POST /api/admin/knowledge/read-url` — JSON: `{ "url": "https://...", "language": "uz" }`
- `POST /api/admin/knowledge/search` — JSON: `{ "query": "...", "limit": 6 }`

## Persistent storage

Set `ULUGBEK_DATA_DIR=/var/data` and, optionally, `ULUGBEK_KNOWLEDGE_DIR=/var/data/knowledge-base`. Attach a persistent volume mounted at `/var/data`. Without a persistent volume, knowledge files can be lost on restart/redeploy. The current in-memory inverted index is rebuilt from the append log at process start.

For large corpora, use object storage for original source files and a dedicated database/search service for the index. Do not put book files or private corpora in the Git repository.

## Limits and next stages

- Current index is fast lexical retrieval, not a semantic embedding model.
- PDF/EPUB extraction, OCR, multilingual embeddings, reranking, deduplication across editions, and a background catalogue crawler are separate future stages.
- Ingestion is bounded to 1 MB per document and 8,000 characters per public HTML page in the existing reader.
- Only content the system is permitted to ingest should be stored. For restricted works, retain catalogue metadata and official links instead of full text.

## Verification

Run `npm test`. The knowledge-store test checks chunking, persistence after module reload, and multilingual lexical retrieval. CI must pass before merge. Production deployment is not triggered by this documentation.
