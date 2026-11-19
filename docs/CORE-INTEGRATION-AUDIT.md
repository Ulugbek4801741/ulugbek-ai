# ULUGBEK AI Core — Integration Audit

Date: 2026-11-19
Target repository: `Ulugbek4801741/ulugbek-ai`
Base branch: `main`
Work branch: `core/independent-learning-audit`

## Safety boundary

This work is additive and isolated on a feature branch. Do not edit the production branch directly. Agent-generated code may be proposed and tested in an isolated workspace, but merge, production deployment, secrets access, destructive actions, and external side effects require explicit administrator approval.

## Existing foundation verified from the repository

The current application is a Node.js / Express service (Node >= 20) with an existing modular architecture. It already contains several components that overlap with the proposed Core:

- `modules/universal-agent-core.js`: task classification, risk assessment, planning, and human-approval gates.
- `modules/independent-model.js`: provider-free answers using approved local knowledge and symbolic reasoning. It explicitly is not a large neural model.
- `modules/language-learning-worker.js`: periodic synchronization of open language sources and local language-cognition updates.
- `modules/knowledge-store.js`: append-only JSONL knowledge storage, chunking, lexical BM25 retrieval, and optional vector search.
- `modules/public-web-reader.js`: bounded HTTPS public-page reader with network-address checks and request limits.
- `agent-permissions.js`: capability permissions; repository writes, PR creation, and automated tests default to disabled. Main-branch writes, production deploys, secret access, and user-data deletion are locked.
- `developer-agent.js`: repository audit / developer-agent workflow (needs full review before enabling write capabilities).
- `agent-runtime.js`: sequential task worker; queued/running tasks are failed closed on restart and outputs are proposals, not source writes or shell execution.
- `admin-autopilot.js`: bounded health watchdog; its documented role is monitoring/recovery, not code generation or deployment.

The app's `package.json` uses Node.js >=20, Express 5, and `node --test`. The Dockerfile uses Node 22. Render health path is `/api/health`.

## External ZIP candidate review (initial source-level pass)

| Candidate | Repository license checked | Initial fit | Decision |
|---|---|---|---|
| LangGraph | MIT | Stateful workflow orchestration; Python implementation, with a separate JS/TS project available | Study design; do not add Python runtime to the current Node service yet |
| Hugging Face smolagents | Apache-2.0 | Compact tool-using agent framework, Python | Useful reference; optional isolated worker only if later justified |
| Crawl4AI | Apache-2.0 | Browser-backed crawling/extraction; resource-heavy compared with the existing bounded HTTPS reader | Defer; first improve/reuse existing reader and public-search pipeline |
| Mem0 | Apache-2.0 | Memory layer overlaps with existing knowledge store and conversation memory | Compare design only; do not duplicate storage before measuring current gaps |
| OpenHands | Not verified in this pass | Full coding-agent environment; requires a strong execution sandbox | Defer until a separate sandbox is available; never run with production secrets |

This is an initial README/LICENSE inspection, not a full ZIP inventory, security audit, dependency review, or compatibility test. Exact archive commits, checksums, dependency licenses, advisories, and runtime footprint remain to be verified before adoption.

## Main engineering conclusion

Do not introduce a second competing orchestrator or duplicate memory store. Extend the existing Core through small adapters and preserve the current single-agent / provider-free fallback. Keep optional frameworks behind adapters so the production app does not become dependent on a large Python stack or paid API.

## Proposed integration stages

1. **Baseline and inventory**
   - Capture current main commit, health response, existing routes, module exports, and test baseline.
   - Inventory the exact source ZIPs and licenses; record commit/tag and archive checksum.
2. **Research adapter**
   - Connect public search and the existing public web reader.
   - Respect robots policies, source terms, rate limits, HTTPS-only policy, SSRF protections, and source attribution.
   - Save new material as pending-review candidates; never auto-promote untrusted pages to approved knowledge.
3. **Knowledge and memory adapter**
   - Reuse the current knowledge store and approved-knowledge bridge.
   - Add deduplication, provenance, language, timestamps, content hashes, review status, and retention limits where missing.
   - Keep conversation memory separate from verified reference knowledge.
4. **Agent orchestration**
   - Reuse `universal-agent-core` and `agent-runtime`.
   - Use one supervisor and bounded specialist tasks; do not spawn an unbounded agent fleet.
   - Treat page contents, repository files, and model outputs as untrusted data, never as instructions that can override policy.
5. **Coding sandbox**
   - Generate patches only in a disposable workspace or isolated branch.
   - Run tests with time, memory, filesystem, network, and command allowlists.
   - Produce a diff, test report, dependency/license report, and rollback instructions.
6. **Administrator review**
   - Require explicit approval for repository writes, PR creation, permission changes, secrets, and production deployment.
   - Keep main-branch writes and production deployment disabled for agents.
7. **Release**
   - Merge only after review and passing tests.
   - Deploy to Render only after a separate administrator approval and a verified rollback plan.

## Acceptance criteria

- Existing `main` remains unchanged until administrator-approved merge.
- Existing health endpoint and current tests remain green.
- New research results are pending review and carry verifiable source URLs.
- Untrusted source content cannot trigger tool execution or change agent policy.
- Code generation cannot write to production or access secrets.
- Every proposed patch includes a diff and reproducible test evidence.
- Admin approval is required before merge and production deployment.
- Low-memory Render service remains usable; heavy model inference/crawling runs outside the web request process.

## Current status

This commit records the repository audit and initial candidate review only. It does not claim that external ZIPs have been fully imported, that a neural foundation model has been trained, that autonomous code execution is enabled, or that production has changed.
