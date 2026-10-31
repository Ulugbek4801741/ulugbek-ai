# ULUGBEK AI — Agent Planning MVP

ULUGBEK AI is an early web/Android MVP for an Uzbek-first AI assistant, agent task planner, and future No-Code app-building platform.

## Windows and iPhone app builds

- **Windows desktop:** an Electron shell opens the hosted web app. It has Node.js integration disabled in the page, context isolation enabled, sandbox enabled, and same-origin navigation restrictions. It requires internet and is not a standalone/offline backend.
- **iPhone/iOS:** the existing Capacitor app can be generated and synced with `npm run ios:add` and `npm run ios:sync`. The iOS GitHub Actions workflow builds an **unsigned iOS Simulator app** for technical validation. It is not an installable iPhone IPA.
- GitHub Actions builds a Windows NSIS installer artifact. It is an unsigned development installer, not a signed commercial release.
- Installing on a real iPhone requires Apple signing/provisioning and usually an Apple Developer account. These steps must be configured separately; do not place Apple certificates or secrets in the repository.

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
5. The current `public/config.js` contains the backend hostname configured for this repository. Confirm that it matches the actual Render service URL in the Render Dashboard before relying on it. Verify the backend's `/api/health` endpoint, send a real chat prompt, and inspect the GitHub Actions test run. A successful GitHub Pages deployment alone does not prove that the backend is reachable. The admin page is intentionally not linked from the public chat menu. Open `/admin.html` on the deployed backend and use the server-only administrator PIN. A successful login creates a one-hour session; five incorrect attempts from the same client identifier trigger a one-hour lockout.

## API-key-free virtual laboratory (early MVP)

A separate page is available at `/lab.html`. It includes:

- `POST /api/lab/search`: public web search through DuckDuckGo HTML results; no model-provider API key is required for this search path.
- `GET /api/lab/knowledge` and `POST /api/lab/knowledge`: view and save reviewed knowledge entries.
- `GET /api/lab/memory/:agent` and `POST /api/lab/memory/:agent`: store separate notes for each named agent.
- `GET /api/lab/status`: show the current lab status and saved-entry counts.

Knowledge and agent notes are stored as JSON files in the server's `data/` directory. For durable production storage, deploy on a host with persistent disk or replace this storage layer with a database. GitHub Pages is static hosting and cannot run these API routes; the lab UI requires the Express backend. Search snippets are not verified facts: users should open the source and review it before saving. This MVP does not retrain a language model, run an always-on autonomous agent, or connect to proprietary ChatGPT/Gemini/Claude/DeepSeek models without their supported access method. Automated tests cover the status route, input validation, and page delivery; live search depends on the external search service and still needs deployment-level verification.

## Administrator PIN access

The public chat menu does not show an administrator link. Open `/admin.html` directly on the deployed Express backend. Google sign-in is not used.

Set these server-only environment variables in the hosting dashboard:
- `ADMIN_ACCESS_CODE`: a private administrator PIN/passphrase (at least 8 characters). Do not commit it or send it in chat.
- `ADMIN_SESSION_SECRET`: a unique random secret of at least 32 characters. Render can generate this value automatically.

Five incorrect PIN attempts from the same client identifier trigger a one-hour lockout. Successful authentication creates an HttpOnly, Secure, SameSite=Strict session cookie that expires after one hour. Lockout counters are stored in the persistent data directory. HTTPS is required in production. The PIN is checked only by the backend and is never placed in browser code.

## Security configuration

Never put an administrator access code or model API key in HTML, browser JavaScript, public repository files, screenshots, or commit messages. Store secrets only in the backend hosting provider’s secret/environment settings. Use HTTPS in production, short-lived secure sessions, rate limiting, persistent lockout state, least privilege, and automated tests for every authorization route. GitHub Pages is static hosting and cannot protect server-only secrets or run the Express API.

## What “autonomous” means in this MVP

The planner can select a task category, create a workflow plan, and return suggested agent roles. It does not mean agents are free to execute external actions, modify production, or learn model weights without limits and review.
