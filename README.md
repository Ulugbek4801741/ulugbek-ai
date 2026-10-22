# ULUGBEK AI — Agent Planning MVP

ULUGBEK AI is an early web/Android MVP for an Uzbek-first AI assistant, agent task planner, and future No-Code app-building platform.

## What is implemented now

- Responsive dashboard interface for mobile and desktop.
- Agent task planner that splits a request into steps and assigns suggested agent roles.
- Rule-based local fallback so the planning demo can still work on GitHub Pages/offline.
- Express backend endpoints: `GET /api/health`, `POST /api/chat`, and `POST /api/agent/plan`.
- Optional OpenAI-compatible model integration through server environment variables.
- Helmet security headers, request rate limiting, input length checks, and model request timeout.
- PWA shell, manifest, service worker, and existing Capacitor Android wrapper.

## Run locally

Requires Node.js 20 or newer.

```bash
npm install
npm test
npm start
```

Open `http://localhost:3000`.

## Connect an AI model (optional)

Set these on the **server hosting environment**, not in browser JavaScript or GitHub Pages:

- `OPENAI_API_KEY` — private API key.
- `OPENAI_BASE_URL` — optional, defaults to `https://api.openai.com/v1`.
- `OPENAI_MODEL` — optional, defaults to `gpt-4o-mini`.

Then restart the server. The chat and planner use the configured OpenAI-compatible `/chat/completions` API. API usage may cost money depending on provider and model. Never commit a key to this repository.

Without a server and key, GitHub Pages runs only the local planning demo. GitHub Pages cannot run this Express backend, so real model responses require a separate backend host.

## What “autonomous” means in this MVP

The planner can select a task category, create a step-by-step plan, and suggest agent roles. If a model is configured, it can use the model to generate a more tailored plan. It does **not** yet run persistent background agents, freely browse the internet, edit/deploy code, operate user accounts, or complete real-world actions. Those require separately implemented tools, permissions, durable job storage, logging, and human approval for risky actions.

The global goal of serving billions of people is a long-term product vision, not a current capacity guarantee. Before a public production launch, implement user authentication, database persistence, authorization, privacy controls, monitoring, abuse protection, and a security review.

## Android

Use **Actions → Build Android APK → Run workflow** in GitHub. Download the artifact after a successful run. This is a test/debug APK, not a signed Play Store release.

## Roadmap

1. Verify current UI and API tests.
2. Add authentication and persistent database.
3. Build a permission-controlled tool registry for agent execution.
4. Add a real No-Code visual workflow/app builder.
5. Add background jobs, observability, and human approval gates.
6. Run a security review and staged user testing before production.
