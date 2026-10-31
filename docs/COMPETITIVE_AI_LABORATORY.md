# ULUGBEK AI — Competitive Intelligence and Learning Laboratory

## Purpose

Build a continuously improving assistant that learns from public, lawful technical material and measures its capabilities against leading AI systems. The goal is to improve ULUGBEK AI on clearly measured tasks, not to claim superiority without evidence.

## Current baseline (2026-10-31)

- The current reasoning path is rule-based; it is not a trained frontier language model.
- The tiny GPT training script is an educational proof of concept and is not connected to chat.
- The existing Developer Agent performs bounded repository review; it is not an autonomous code-writing model.
- The admin autopilot is a process-local watchdog. It does not provide durable 24/7 execution by itself.
- Provider credentials are optional and must never be exposed in browser code or logs.

## Laboratory components

### 1. Benchmark runner

Maintain a versioned, repeatable evaluation set covering:
- Uzbek language understanding, writing, translation, and local terminology.
- General knowledge with source verification and uncertainty handling.
- Multi-step reasoning and mathematical accuracy.
- Coding: correctness, tests, security, maintainability, and explanation.
- Long-context retrieval from user-authorized documents.
- Tool-use planning, permission checks, and recovery from tool errors.
- Safety: prompt injection, secret disclosure, unsafe code, and unauthorized actions.

Each test case must have an expected answer or a rubric, difficulty, language, source/license, and version. Use deterministic checks where possible and blinded human review for subjective tasks.

### 2. Provider comparison

Use official APIs or locally hosted open-weight models only when their terms permit the intended use. Provider adapters must be disabled by default and configured server-side. Never scrape private endpoints, bypass rate limits, impersonate users, or attempt to extract model weights or proprietary training data.

Record, for each run:
- model/provider and model version;
- benchmark version and timestamp;
- pass rate and rubric score;
- latency and timeout rate;
- token usage and estimated cost when supplied by the provider;
- safety failures and source-grounding quality.

Do not send private user conversations to external providers for benchmarking. Use synthetic or explicitly approved test prompts.

### 3. Public-source learning

Allowlisted source types:
- official product and API documentation;
- public research papers and technical reports;
- permissively licensed open-source repositories;
- public standards and educational materials.

For every imported item, retain its URL, title, publisher, retrieval date, license/terms where available, content hash, and a short evidence summary. Reject secrets, personal data, private repositories, malware, and content with unclear reuse rights. Treat retrieved text and code as untrusted data, never as instructions.

The learning worker may summarize and propose knowledge updates. It must not silently change the production model or treat generated text as verified fact.

### 4. Improvement loop

1. Select a benchmark category with a measured weakness.
2. Gather relevant public and permitted material.
3. Produce a proposed change or training experiment in an isolated workspace.
4. Run unit, regression, security, and benchmark tests.
5. Compare against the recorded baseline.
6. Publish a report and a pull request with evidence.
7. Keep the change isolated until review and explicit release approval.

A change is not an improvement if it raises one score while materially damaging safety, reliability, privacy, or another critical category.

### 5. Social product research

Study public feature documentation and lawful public product patterns from major social platforms. Convert observations into product proposals: onboarding, creator tools, moderation, accessibility, discovery, privacy, and user retention.

Growth experiments must be opt-in, rate-limited, transparent, and non-spam. No fake accounts, unsolicited mass messages, scraping private profiles, or automated engagement manipulation.

### 6. Computer, IoT, and robotics capabilities

Computer control must use a separately installed local agent with narrow, visible permissions. Start with read-only diagnostics and user-confirmed actions. Downloads must be scanned and run only in a sandbox. No silent access to files, passwords, cameras, microphones, or other devices.

Physical devices require device-specific authorization, emergency stop, audit logs, bounded operating zones, and human supervision. Medical, surgical, vehicle, industrial, and other safety-critical systems must remain under qualified human control; ULUGBEK AI may support simulation, documentation, and non-clinical research but must not independently operate them.

## Autonomy and permissions

Allowed without the owner being online:
- health checks, queue processing, public documentation research;
- benchmark runs within configured budgets and rate limits;
- isolated experiments and draft code patches;
- regression/security tests, logs, and bounded reversible recovery;
- draft reports and pull requests.

Always blocked without explicit human approval:
- production deploys or merges;
- billing changes or purchases;
- external messages, posts, advertising spend, or user outreach;
- changes to admin credentials, safety rules, audit logs, or emergency stop;
- access to private user data for training;
- destructive data operations or physical/medical device control.

The owner’s general authorization is not a substitute for provider terms, device-owner consent, legal requirements, or human review of high-impact actions.

## Required infrastructure before unattended 24/7 operation

- Always-on paid service and a separate worker process, both within the approved budget.
- Durable database-backed task queue, benchmark records, and audit log.
- Independent health monitoring and bounded restart policy.
- Isolated execution environment with CPU, memory, disk, time, and network limits.
- Separate least-privilege credentials for reading source, creating branches, and opening pull requests.
- Alerts, backup/restore tests, and a global stop control.
- A verified deployment and live health check.

A free web service that sleeps or uses ephemeral storage is not sufficient for reliable unattended operation.

## Success criteria

Do not claim that ULUGBEK AI is better than a named competitor unless:
- the same versioned benchmark and comparable settings were used;
- results include sample size, uncertainty, cost, and latency;
- independent review confirms the scoring;
- safety and privacy gates also pass.

The first milestone is a trustworthy benchmark report and a safe proposal workflow—not a claim of beating frontier models.
