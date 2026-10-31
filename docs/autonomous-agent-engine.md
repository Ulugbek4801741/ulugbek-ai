# Safe Autonomous Agent Orchestrator

The current MVP has a native rule-based planner and a read-only public-knowledge worker. It does not currently include a trained language model or general-purpose autonomous coding runtime.

`modules/autonomous-engine.js` composes those existing local components into a four-role report:
- Supervisor: organizes the result.
- Researcher: reads only approved local knowledge records.
- Builder: prepares a practical plan.
- Verifier: reports limits and risks.

## Deliberately disabled
- No DuckDuckGo HTML scraping or arbitrary web fetches.
- No hosted model calls and no API key assumptions.
- No shell execution.
- No source-file writes.
- No deploys, purchases, payments, or destructive operations.
- No claim that unrun tests or actions succeeded.

This is a safe orchestration foundation, not a self-learning neural model and not a replacement for ChatGPT/Claude/Gemini. To add model inference later, integrate a selected local or hosted model behind a separate provider adapter, with timeouts, output limits, privacy controls, rate limits, and explicit user configuration. Coding agents must work in isolated workspaces and submit reviewable diffs; production deploys and destructive data operations require separate authorization.
