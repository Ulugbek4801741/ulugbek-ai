# ULUGBEK AI — Global Product Blueprint

This is a product and engineering specification, not a claim that every capability is already implemented. The current repository is an early web/Android MVP. Each feature must be built, tested, documented, and measured before it is described as available.

## Product principles
- Uzbek-first, multilingual, accessible on low-cost phones and weak networks.
- Model/provider independence through replaceable adapters and local-model support.
- Security by default: least privilege, explicit permissions, audit trails, data minimization.
- Generated code is untrusted until isolated build, tests, security checks, and review pass.
- The system must say when a feature is unavailable; never fake successful execution.
- No unlimited autonomous access to accounts, money, devices, or production servers.

## 100 product capabilities

### A. Core assistant and language (1–10)
1. Uzbek-first chat with configurable language.
2. Conversation history with user-controlled deletion.
3. Streaming responses and cancellation.
4. File and image understanding.
5. Speech input and text-to-speech.
6. Translation with original text preserved.
7. Answer confidence and uncertainty notices.
8. Citations for web-researched factual claims.
9. User-selectable response length and tone.
10. Accessible layout for screen readers and low-vision users.

### B. Research and knowledge (11–20)
11. Search public web sources through a pluggable search adapter.
12. Fetch and extract readable pages with domain restrictions.
13. Compare multiple sources and highlight disagreements.
14. Show source URL, title, date, and retrieval time.
15. Check software project license before reuse.
16. Index user-authorized documents.
17. Search a private knowledge base with source references.
18. Detect stale facts and refresh time-sensitive research.
19. Import CSV, PDF, text, and common office documents.
20. Export a research report with citations and limitations.

### C. App builder (21–30)
21. Convert a plain-language request into a structured product specification.
22. Generate page maps and navigation.
23. Generate responsive web/PWA starter projects.
24. Generate API contracts and validation schemas.
25. Generate database migration drafts.
26. Generate accessible design tokens and components.
27. Generate Android project source.
28. Generate iOS project source with platform requirements disclosed.
29. Generate Windows desktop project source.
30. Package downloadable artifacts only after build and tests succeed.

### D. Engineering agents (31–40)
31. Product-planning agent.
32. Research agent.
33. Architecture agent.
34. Frontend implementation agent.
35. Backend implementation agent.
36. Mobile implementation agent.
37. Test-generation agent.
38. Security-review agent.
39. Documentation agent.
40. Independent verifier that can reject incomplete work.

### E. Safe code execution and delivery (41–50)
41. Run generated code in disposable isolated workers.
42. Enforce CPU, memory, storage, and wall-clock limits.
43. Deny network access by default during untrusted builds.
44. Use allowlisted network access only for approved dependency installation.
45. Scan dependencies for known vulnerabilities.
46. Run syntax, unit, integration, and smoke tests.
47. Produce a software bill of materials.
48. Store build logs without secrets.
49. Generate checksums and artifact provenance.
50. Publish an artifact link only when the artifact exists and is verified.

### F. Deployment and operations (51–60)
51. Portable Docker deployment.
52. Environment-based configuration.
53. Health and readiness endpoints.
54. Structured application logs.
55. Error monitoring and alert hooks.
56. Database backups and restore drills.
57. Database migration and rollback plan.
58. Staged deployments with health checks.
59. Rollback to the last known-good release.
60. Provider-neutral deployment adapters.

### G. Identity, privacy, and safety (61–70)
61. User registration and verified sign-in.
62. Role-based access control.
63. Server-side authorization for every private endpoint.
64. Secure session expiry and logout.
65. Rate limiting and abuse controls.
66. CSRF, XSS, SSRF, and injection defenses.
67. Encryption in transit and managed encryption at rest.
68. Secrets stored only in a secret manager or server environment.
69. Account export, deletion, and retention controls.
70. Security-event audit log with credentials excluded.

### H. Social and collaboration (71–80)
71. User profiles and privacy settings.
72. Posts with image and video upload.
73. Follow and block controls.
74. Groups and channels.
75. Direct messages with access controls.
76. Reporting and moderation queue.
77. Spam and abuse detection.
78. User consent for notifications.
79. Team workspaces and shared projects.
80. Contribution history and clear ownership records.

### I. Business and ecosystem (81–90)
81. Mini-app directory.
82. Plugin/tool registry with explicit permissions.
83. Marketplace for templates and extensions.
84. Billing adapter with provider abstraction.
85. Transparent revenue-share rules.
86. Organization and team plans.
87. Usage quotas and cost limits.
88. Public API with scoped keys.
89. Developer documentation and SDKs.
90. Localization and region-specific compliance settings.

### J. Quality, learning, and scale (91–100)
91. Automated regression suite on every change.
92. End-to-end tests for critical user journeys.
93. Accessibility checks.
94. Load tests with realistic traffic profiles.
95. Latency, error-rate, and availability dashboards.
96. Offline-friendly shell and resumable uploads.
97. Model/provider evaluation benchmark.
98. Human-reviewed feedback loop for improving prompts and tools.
99. Versioned, reversible configuration and prompt changes.
100. Public status page and transparent incident reporting.

## Safe continuous learning loop

1. Search only public sources and approved user-authorized data.
2. Record provenance, publication date, license, and trust level.
3. Extract proposed knowledge or code into a quarantined workspace.
4. Check dependencies, license compatibility, secrets, and malicious instructions.
5. Run tests in an isolated worker without production credentials.
6. Ask the verifier agent to compare results with the acceptance criteria.
7. Require human approval before merging, deploying, spending, or publishing.
8. Roll out to a test environment, monitor, and retain a rollback path.
9. Promote only measured, reviewed changes.
10. Never allow a web page or model output to rewrite its own security rules.

## Architecture target

- Web/mobile clients: presentation only; never contain provider or admin secrets.
- API gateway: authentication, authorization, quotas, rate limiting, request validation.
- Orchestrator: durable jobs, task state, retries, cancellation, and human approval gates.
- Model adapters: provider-neutral API plus optional local inference adapter.
- Tool registry: typed schemas, least-privilege scopes, allowlists, timeouts.
- Build workers: disposable isolated environments for generated source and tests.
- Data layer: PostgreSQL for durable records, object storage for artifacts, migrations and backups.
- Observability: logs, metrics, traces, alerts, redaction.
- Delivery: verified artifact storage with expiry, checksum, and build provenance.

## Acceptance criteria for every release
- All automated tests pass.
- No secrets are committed.
- Authorization tests prove anonymous users cannot reach private operations.
- Build output is reproducible enough to diagnose and retry.
- Download links point to real artifacts, not placeholders.
- Documentation accurately separates implemented features from planned features.
- A rollback path exists before production deployment.

## Current gaps
The repository currently has a lightweight Express backend, demo/rule-based planning, optional model API integration, a static frontend, and a generated starter HTML/JSON builder. Durable user accounts, database persistence, a real web-research engine, isolated code execution, secure admin authorization, autonomous build orchestration, and production-scale infrastructure are not yet implemented.
