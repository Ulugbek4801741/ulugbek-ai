# Large knowledge archive, PDF/EPUB and multilingual vector search

## What is implemented

- `knowledge-worker/app.py`: protected internal service for PDF/EPUB extraction and BAAI/bge-m3 multilingual embeddings.
- `knowledge-worker/archive_ingest.py`: private persistent file downloader for an explicit queue of approved PDF/EPUB items.
- `knowledge-worker/library-sources.json`: discovery seeds for OER and book catalogues.
- ULUGBEK: local BM25 retrieval with optional Qdrant vector retrieval and a protected raw PDF/EPUB upload endpoint.
- ASILBEK: SQLite FTS5 retrieval with optional Qdrant vector retrieval and owner-token-protected PDF/EPUB upload endpoint.
- Separate LoRA training starter under `training/`.

## Start the vector and document services

On a persistent Linux host with Docker Compose:

1. Set a unique `KNOWLEDGE_WORKER_TOKEN` in a private .env file.
2. Run `docker compose -f docker-compose.knowledge.yml up -d --build`.
3. The worker downloads `BAAI/bge-m3` on first embedding request. It is about 2.27 GB and supports over 100 languages; Uzbek quality must be benchmarked on your own query set.
4. Create a Qdrant collection automatically on first ingestion. Keep the Qdrant volume persistent and private.
5. Configure the application service with:
   - `KNOWLEDGE_WORKER_URL=http://<private-worker-host>:8080`
   - `KNOWLEDGE_WORKER_TOKEN=<same-secret>`
   - `EMBEDDING_API_URL=http://<private-worker-host>:8080`
   - `EMBEDDING_API_TOKEN=<same-secret>`
   - `QDRANT_URL=http://<private-qdrant-host>:6333`
   - `QDRANT_API_KEY=<if configured>`
   - `EMBEDDING_DIMENSION=1024`
   - `QDRANT_COLLECTION=ulugbek_knowledge_v1` or `asilbek_knowledge_v1`

Use distinct tokens, Qdrant collections, databases and disks for the two AI projects. Never expose Qdrant or the worker publicly without network controls and authentication.

## PDF/EPUB ingestion

- ULUGBEK admin route: `POST /api/admin/knowledge/upload?filename=book.epub`; send raw file bytes with `Content-Type: application/epub+zip` (or `application/pdf`). Admin session required.
- ASILBEK route: `POST /knowledge/upload`; send raw bytes, `X-Filename: book.pdf`, and `X-Owner-Token`. Owner token required.
- Maximum upload is 50 MB; extracted text capped at 2 million characters. Scanned PDFs need OCR, which is not included in this version.
- Extracted text is chunked, indexed locally and embedded into Qdrant when the embedding service is configured. BM25/FTS5 remains the fallback.

## Archive downloading

Add one JSON record per file to `knowledge-worker/archive-queue.example.jsonl` (copy it to `archive-queue.jsonl`). The downloader only accepts HTTPS PDF/EPUB URLs and records with a non-empty license plus `rights_status` set to `open-license`, `public-domain-global`, or `permission-granted`. It writes files and SHA-256 manifests to a private persistent volume:

```bash
python knowledge-worker/archive_ingest.py --manifest knowledge-worker/archive-queue.jsonl --storage /var/data/books --max-items 100
```

The script does not scrape every catalogue or assume that every catalogue record has a reusable full text. Open Library offers monthly metadata dumps and explicitly says its API is not intended as a bulk data backend. Project Gutenberg recommends its offline catalogues and mirrors for bulk access. Non-US users must check local rights status. Restricted titles stay as metadata and official links.

## Model adaptation

`training/train_lora.py` is a separate LoRA fine-tuning starter using Qwen2.5-0.5B-Instruct. It does not train from scratch and has not been run. A GPU and a reviewed Uzbek instruction dataset are required. Keep model training datasets distinct from RAG book ingestion; do not treat all retrieved books as automatic fine-tuning data.

## Operational limits

- BGE-M3 model files are about 2.27 GB; first start downloads weights and requires substantial RAM/CPU or preferably GPU.
- Qdrant and source files require persistent storage. Render Free ephemeral filesystem is not suitable for the archive.
- Current retrieval falls back to lexical search if vector services are not configured or unavailable.
- Vector indexing of existing old records requires re-ingestion; new uploads and new learning records are embedded automatically.
- No production deploy, paid resource purchase, or model training was triggered by these commits.
