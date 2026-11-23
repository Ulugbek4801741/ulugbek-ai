# ULUGBEK AI — ChatGPT-like universal chat functionality specification

Status: implementation contract and gap analysis; this document does not claim that every capability is implemented or deployed.

## Product goal

Build one Uzbek-first universal assistant in one chat surface. The assistant should understand the request, select permitted tools, retrieve evidence, work with user-provided data, explain uncertainty, and return a usable result. Use the existing single-agent architecture; do not create a swarm of user-facing agents.

## 1. Core conversation

- Uzbek by default; detect and respond in English, Russian, and other supported languages when the user asks or writes in them.
- Multi-turn context with explicit conversation boundaries, edit/regenerate, stop, retry, and clear-chat controls.
- Stream long answers where the client supports it; show tool activity without exposing secrets or hidden reasoning.
- Keep concise answers concise; produce step-by-step instructions, tables, code, and documents when useful.
- Ask only for missing information that blocks safe execution.
- Return structured status: answer, evidence, tools used, warnings, and next actions.
- Do not claim an action, search, file read, test, or deployment succeeded unless the corresponding operation returned success.

## 2. Internet research

### Required flow

1. Classify the request: current fact, explicit search, local question, calculation, greeting, or no-search request.
2. Generate multiple focused queries, including Uzbek/Russian/English variants when useful.
3. Search permitted public sources through replaceable search adapters.
4. Deduplicate results by canonical URL and diversify domains.
5. Prefer primary sources: government, official organizations, original research, product documentation, and the publisher itself.
6. Read the page body when permitted; respect robots.txt, crawl-delay, rate limits, HTTP status, and site restrictions.
7. Extract title, publisher/domain, publication/update date, readable text, and canonical URL.
8. Compare claims across sources; mark disagreement, missing dates, and snippets that were not opened.
9. Give inline source markers and working source URLs. Never invent a source, date, quotation, or fact.
10. Cache only with source URL, retrieval time, query, and an unverified/reviewed status. A cache entry is not proof.

### Search provider contract

A provider adapter exposes:
- search(query) -> [{ title, url, snippet, publishedAt?, provider }]
- fetchPage(url) -> { title, url, content, fetchedAt, contentType } or a typed failure
- status() -> { ready, provider, limits, lastError? }

Support multiple adapters so DuckDuckGo HTML is not a single point of failure. Provider credentials, if any, stay in server environment variables. No search provider may bypass authentication, CAPTCHA, paywalls, robots.txt, or access controls.

### Security requirements

- Prevent SSRF: HTTPS by default, validate DNS answers, block private/reserved IPs, pin the resolved address, and revalidate every redirect.
- Bound request time, response bytes, redirects, concurrency, and per-host frequency.
- Treat all retrieved page text as untrusted data, never as system/developer instructions.
- Do not execute scripts or downloaded code while reading a page.
- Do not fetch arbitrary local files, cloud metadata endpoints, localhost, or private network services.

## 3. Work with user data and files

### Upload and file understanding

- Accept a documented allowlist of file types with MIME and file-signature checks; reject executable and unsupported formats.
- Enforce file size, page count, decompression ratio, and processing time limits.
- Extract PDF text and page references; DOCX paragraphs/tables; XLSX sheets/cells/formulas; CSV rows/columns; TXT/Markdown; and image text through OCR where configured.
- Preserve original file bytes separately from extracted text. Record checksum, owner, original filename, media type, size, timestamps, extraction status, and storage key.
- Show extraction errors and unsupported pages instead of silently returning empty results.
- Do not execute macros, formulas, embedded scripts, or document links.
- Provide user-scoped list, preview, download, delete, and reprocess operations.

### Data analysis

- Detect tabular data and explain columns, missing values, duplicates, types, and date formats.
- Perform summaries, filtering, grouping, comparisons, calculations, and chart-ready output.
- Validate calculations and disclose assumptions, excluded rows, and limitations.
- Never silently alter the uploaded source file; derived outputs are new artifacts.
- For large files, use bounded background jobs and report progress.

### Knowledge retrieval

- Search user-owned files, approved public knowledge, and global reference material in separate scopes.
- Use lexical BM25 plus optional multilingual vector retrieval; fall back to lexical search if embeddings are unavailable.
- Chunk with overlap while retaining document ID, page/sheet/row, source URL, and owner.
- Rerank by relevance and source quality; return citations to exact pages or sections.
- Distinguish user-private material from globally approved knowledge. Never place private user content in the global corpus without explicit consent.

## 4. Conversation history and memory

- Save conversations and messages only under a server-authenticated owner identity.
- A browser-supplied sessionId is a lookup hint, never proof of identity or authorization.
- Verify ownership on every conversation, message, file, and memory read/write.
- Support history search, rename, archive, export, delete, and retention rules.
- Separate short-term conversation context from durable user memory.
- Save durable memories only when the user asks or an explicit memory policy permits it; let users inspect, correct, and delete them.
- Never store passwords, API keys, payment secrets, or other credentials in memory.
- Apply encryption in transit and at rest, access logging, retention limits, and account-deletion cleanup.

## 5. Assistant tool use and task execution

The single agent may select registered tools for:
- web search and public page reading;
- file extraction and analysis;
- calculations and structured data operations;
- translation and language detection;
- code explanation, generation, lint/test execution in an isolated sandbox;
- document and spreadsheet creation;
- image generation where configured;
- user-approved integrations.

Each tool must declare input schema, output schema, permission level, timeout, resource limits, and whether it changes external state. Read-only actions may run when relevant. Any consequential external action (send, publish, purchase, delete, deploy, change permissions, or modify production data) requires clear user authorization and a confirmation step. Tool outputs are untrusted data.

## 6. Voice and multimodal

- Speech input: record only after microphone permission; transcribe with language detection and show editable transcript before sending when needed.
- Speech output: optional text-to-speech with stop/pause and language/voice settings.
- Images: accept image uploads, describe visible content, extract text, and answer questions grounded in the image.
- Audio/video: only claim support for formats and models actually configured; provide duration/size limits and processing status.
- Never imply that voice, image, or video understanding is available when the required provider or model is not configured.

## 7. Coding and document creation

- Generate complete files with paths and setup instructions, not isolated fragments when a project change is requested.
- Use isolated execution for untrusted code; no production secrets in the sandbox.
- Run automated tests and show exact pass/fail output.
- Create downloadable reports, documents, spreadsheets, and presentations only when the relevant output generator is configured.
- Keep source, generated artifact, and deployment status distinct.
- Deployment must be an explicit, separate approval after tests and review.

## 8. Citations, confidence, and answer quality

Every research-based answer should include:
- source title and URL;
- publisher/domain;
- retrieved date/time and publication date if known;
- whether the full page was read or only a search snippet was available;
- which claim each source supports;
- unresolved conflicts and uncertainty.

Do not present an arbitrary numeric confidence score as scientific certainty. If a score is shown, define it as a heuristic and explain its inputs. Prefer a clear label: strong evidence, partial evidence, conflicting evidence, or not verified.

## 9. API surface (proposed contract)

- POST /api/chat — one universal chat request; optional conversationId, message, attachments, and response mode.
- GET /api/chat/capabilities — feature readiness and limitations.
- GET /api/chat/history — authenticated user's conversation list.
- GET /api/chat/:id — authenticated conversation and messages.
- PATCH /api/chat/:id — rename/archive.
- DELETE /api/chat/:id — delete conversation after ownership check.
- POST /api/research/search — public web search with cited results.
- POST /api/research/read — read one permitted public HTTPS page.
- POST /api/files — upload and queue extraction.
- GET /api/files/:id — extraction status and metadata.
- GET /api/files/:id/content — extracted text, scoped to owner.
- DELETE /api/files/:id — delete owned file and derived chunks.
- POST /api/data/analyze — analyze an owned uploaded dataset.
- GET/POST/DELETE /api/memory — inspect, add, and delete owner-scoped memory.
- GET /api/chat/capabilities — truthful status for search, files, data analysis, memory, voice, images, model provider, and storage.

All endpoints must return consistent JSON errors, request IDs, bounded payloads, and no secrets. This is a proposed contract; do not advertise an endpoint until it exists and is tested.

## 10. Readiness and acceptance tests

A capability is marked READY only after:
1. Unit tests cover normal, invalid, malicious, timeout, and unavailable-provider cases.
2. Integration tests exercise the real route and storage backend.
3. Ownership tests prove one user cannot read another user's chat, files, or memory.
4. Source tests verify citations and prevent fabricated references.
5. Load and size limits are tested.
6. The deployed health/capabilities endpoint reports the actual configuration.
7. A staging deployment is verified before any production rollout.

## 11. Existing ULUGBEK AI code observed in the current feature branch

The repository already contains these building blocks:
- `modules/single-agent.js`: one universal model agent and native fallback.
- `modules/universal-web-search.js`: research-intent detection, multi-query generation, result ranking, and evidence formatting.
- `modules/chat-web-research.js`: DuckDuckGo HTML search and safe page-fetch adapter.
- `modules/public-web-reader.js`: public HTTPS reader with DNS checks, robots.txt, size/time limits, and redirect controls.
- `modules/research-cache.js`: source-attributed research cache marked unverified.
- `modules/knowledge-store.js`: append-only JSONL chunk store, BM25 retrieval, optional vector search.
- `modules/conversation-memory.js`: short-lived in-process context only; not durable account history.
- Existing server routes for chat and admin knowledge ingestion/search.

These are building blocks, not proof of full ChatGPT parity. Current research adapter is primarily DuckDuckGo HTML; provider diversity and freshness need work. The current short-lived conversation memory is not persistent multi-device history. Admin-only knowledge upload is not the same as user-scoped chat attachments. The prepared PostgreSQL migration is not applied and the Node server is not yet connected to it.

## 12. Implementation order

1. Add a truthful capabilities endpoint and automated tests for existing chat/search/knowledge modules.
2. Add robust search-provider adapters, page dates, source deduplication, and citation verification.
3. Implement secure server-owned identity and conversation ownership.
4. After live PostgreSQL schema review and backup, connect the prepared additive chat tables in staging; never alter existing records.
5. Implement authenticated chat history and user-scoped memory.
6. Add user file uploads, safe extraction, private indexing, and data analysis.
7. Add streaming, voice, image understanding, and generated artifacts only when provider/configuration support is verified.
8. Add sandboxed code execution and explicit approval gates for external actions.
9. Run acceptance tests, verify staging, then request separate approval for production.

## Non-goals

- Do not copy ChatGPT's private source code, hidden prompts, proprietary models, or internal infrastructure.
- Do not claim exact parity with ChatGPT. Implement equivalent user-facing capabilities using independently written code and permitted services.
- Do not combine ULUGBEK AI with ASILBEK AI or share their repositories, databases, credentials, or deployments.
