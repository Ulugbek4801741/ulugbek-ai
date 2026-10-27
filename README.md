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

## Safe workflow planning API

- `GET /api/modules` returns the capability catalogue and clearly labels planned integrations.
- `POST /api/lab/search` searches the public web without a model API key; results must be checked against their sources.
- `POST /api/lab/learn` searches Wikipedia's public API and stores up to three sourced summaries as `pending-review` knowledge candidates without a model API key. It is retrieval/knowledge-base growth, **not** model-weight training or unrestricted crawling.
- `GET /api/lab/knowledge` lists locally stored knowledge candidates. The current JSON store is intended for a prototype, not multi-instance production use.
- `GET /api/workflows/policy` returns the required review stages and high-impact actions that need human approval.
- `POST /api/workflows` accepts JSON such as `{"task":"Prepare a report","action":"send_message"}` and returns a workflow plan. It does **not** execute external actions. Workflow approval alone never enables execution; a separately configured, permission-scoped adapter is required.
- `npm test` includes workflow safety and module catalogue tests. GitHub Actions runs the test suite on Node.js 20 and 22.

These are planning and safety controls, not a claim that phone/computer automation, real quantum hardware, medical procedures, or autonomous production deployment are implemented.

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
- `GEMINI_API_KEY` — optional Gemini key; store only in the backend host's secret settings.
- `GEMINI_MODEL` — optional, defaults to `gemini-flash-latest`.
- `GEMINI_ALLOW_CHAT_CONTENT` — defaults to `false`; set to `true` only after explicitly accepting that the current chat message is sent to Google.

Gemini privacy mode is single-turn: only the current message and a fixed system prompt are sent. Local chat history, agent memory, routing output, and other agent responses are not sent to Gemini. This reduces data sharing but does not guarantee zero third-party disclosure. If the consent flag is false, Gemini requests are blocked.

Then restart the server. The planner uses the configured OpenAI-compatible `/chat/completions` API. Chat uses that provider by default; if `GEMINI_API_KEY` is present, Gemini chat remains blocked until `GEMINI_ALLOW_CHAT_CONTENT=true` is explicitly set. API usage may cost money depending on provider and model. Never commit a key to this repository.

Without a server and key, GitHub Pages runs only the local planning demo. GitHub Pages cannot run this Express backend, so real model responses require a separate backend host.

### Connect GitHub Pages to the backend

1. Deploy this repository's Express service using the included `render.yaml` blueprint (or another Node.js host).
2. In the backend host, set `FRONTEND_ORIGIN=https://ulugbek4801741.github.io`. This enables the intended GitHub Pages origin in both CORS and the Content Security Policy. Other frontend origins must be configured explicitly.
3. Set `OPENAI_API_KEY` on the backend only, or configure an OpenAI-compatible `OPENAI_BASE_URL` and `OPENAI_MODEL`. Never add a provider secret to browser files.
4. Copy the deployed backend's HTTPS origin into `public/config.js` as `window.ULUGBEK_API_BASE_URL = "https://YOUR-BACKEND-HOST";` (replace the example with the actual host, no trailing slash), then commit and wait for the Pages deployment to succeed.
5. Open the website and check the connection label. A green-looking UI alone is not proof: verify `/api/health`, send a real chat prompt, and inspect the GitHub Actions test run.

The repository does not know the real backend hostname until you deploy it, so the public config intentionally remains empty rather than guessing a URL. The chat's `A4801741_a` shortcut opens the admin page after two entries; it does **not** grant administrator access. Server-side Google sign-in and the allowlisted administrator email are still required.


## API-key-free virtual laboratory (early MVP)

A separate page is available at `/lab.html`. It includes:

- `POST /api/lab/search`: public web search through DuckDuckGo HTML results; no model-provider API key is required for this search path.
- `GET /api/lab/knowledge` and `POST /api/lab/knowledge`: view and save reviewed knowledge entries.
- `GET /api/lab/memory/:agent` and `POST /api/lab/memory/:agent`: store separate notes for each named agent.
- `GET /api/lab/status`: show the current lab status and saved-entry counts.

Knowledge and agent notes are stored as JSON files in the server's `data/` directory. For durable production storage, deploy on a host with persistent disk or replace this storage layer with a database. GitHub Pages is static hosting and cannot run these API routes; the lab UI requires the Express backend. Search snippets are not verified facts: users should open the source and review it before saving. This MVP does not retrain a language model, run an always-on autonomous agent, or connect to proprietary ChatGPT/Gemini/Claude/DeepSeek models without their supported access method. Automated tests cover the status route, input validation, and page delivery; live search depends on the external search service and still needs deployment-level verification.

## Google administrator sign-in

The chat page has no admin button. Open `/admin.html` on the deployed Express server and choose **Google hisob bilan kirish**. The server accepts only the exact, verified email configured in `ADMIN_GOOGLE_EMAIL`; it does not grant admin access to every Google account.

Set these server-only environment variables in the hosting dashboard:
- `PUBLIC_BASE_URL`: the full HTTPS origin of the Express app, with no trailing slash.
- `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`: OAuth web-client credentials from Google Cloud Console.
- `ADMIN_GOOGLE_EMAIL`: the one allowed Google account email.
- `ADMIN_SESSION_SECRET`: a long random secret (at least 32 random bytes).

In Google Cloud Console, configure the OAuth consent screen and add the exact redirect URI `PUBLIC_BASE_URL/api/auth/google/callback` to the OAuth client. Do not put OAuth secrets in the repository or browser JavaScript. The Google account owner must approve/sign in themselves. GitHub Pages cannot host the backend routes; deploy this Express app and use the admin page on that same HTTPS host. A Render blueprint is included as a deployment starting point, but it does not create Google credentials or approve account access.

## Security configuration

Never put an administrator access code or model API key in HTML, browser JavaScript, public repository files, screenshots, or commit messages. Store secrets only in the backend hosting provider’s secret/environment settings. Use HTTPS in production, short-lived secure sessions, rate limiting, audit logging, least privilege, and automated tests for every authorization route. GitHub Pages is static hosting and cannot protect server-only secrets or run the Express API. The admin page shell currently added to `public/admin.html` is **not an enabled admin system** until server-side authentication and authorization routes have been implemented and tested; do not enter real credentials on a static-only deployment.

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


## ULUGBEK AI 0.1 — self-hosted model support

The backend now supports an OpenAI-compatible model endpoint without sending an API key when `OPENAI_API_KEY` is empty and `OPENAI_BASE_URL` points to a self-hosted or otherwise keyless compatible server. Chat and agent planning use the same configured endpoint.

- Set `OPENAI_BASE_URL` to the model server's API base URL (the server must be reachable from the backend host).
- Set `OPENAI_MODEL` to the exact model name served by that endpoint.
- Keep `OPENAI_API_KEY` empty only if that endpoint does not require authentication. If it requires a token, configure it privately in the hosting environment.
- Do not put real keys or private server credentials in GitHub.
- Without a model endpoint, the app still uses demo chat and rule-based planning; it is not an autonomous AI model.

The automated test suite includes a local mock OpenAI-compatible endpoint test for chat and planning without an API key. This verifies the integration contract, not the performance of a real model or production deployment.
