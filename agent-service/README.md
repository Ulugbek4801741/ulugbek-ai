# ULUGBEK AI — OpenAI Agents SDK gateway

This is an optional, private Python service. It does not replace the existing Node.js API.
The Node server calls it only when both `AGENT_SDK_URL` and `AGENT_SDK_TOKEN` are configured.
If the service is unavailable, ULUGBEK AI falls back to its existing Node provider/native answer path.

## Deploy on Render

Create a separate **Private Service** or an internal web service from this repository:
- Root directory: `agent-service`
- Runtime: Docker
- Dockerfile path: `Dockerfile`
- Health check path: `/health`
- Persistent disk mount: `/var/data` (for SQLite conversation sessions)

Required environment variables:
- `AGENT_SDK_TOKEN`: random secret with at least 32 characters; same value must be set on the Node service as `AGENT_SDK_TOKEN`.
- `AGENT_MODEL_PROVIDER`: `gemini` or `openai`.
- For Gemini: `GEMINI_API_KEY` and optionally `GEMINI_MODEL` (default `gemini-flash-latest`).
- For OpenAI: `OPENAI_API_KEY` and optionally `OPENAI_MODEL` (default `gpt-4o-mini`).
- `AGENT_SDK_DATA_DIR`: `/var/data`.

On the existing Node service set:
- `AGENT_SDK_URL`: private service URL.
- `AGENT_SDK_TOKEN`: the same secret.

The service disables SDK tracing so prompts are not sent to an external tracing dashboard.
Never expose the service token in client-side code or chat responses. API-provider usage may incur charges and is subject to that provider's quotas.
