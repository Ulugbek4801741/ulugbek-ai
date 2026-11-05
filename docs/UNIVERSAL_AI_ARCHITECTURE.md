# ULUGBEK AI — universal assistant architecture

ULUGBEK AI uses one user-facing assistant with capability modules. This is an original integration architecture; it does not copy private source code, model weights, prompts, or internal systems from ChatGPT, Gemini, Claude, DeepSeek, or Replit.

## Current capability boundaries

- The chat server has a single-agent path and a local fallback.
- Without a configured language model, the fallback is deterministic and cannot reliably answer arbitrary open-ended requests or write production-quality code.
- Public web research can search and read accessible pages. A background worker collects a limited set of public knowledge candidates; approved knowledge is separated from unreviewed material.
- Video generation already has a ComfyUI adapter, but it is unavailable until a real ComfyUI server, compatible video workflow, and sufficient GPU resources are configured.
- A successful unit test does not prove a live provider, model, video GPU, or production deployment works.

## Provider adapter

The provider router supports:
- `openai-compatible`: local OpenAI-compatible servers and compatible hosted endpoints (for example, a compatible DeepSeek endpoint when its current endpoint/model are configured).
- `gemini`: Google's Gemini generateContent API.
- `anthropic`: Claude Messages API.

Hosted provider access requires a valid provider token and may incur charges. Keep tokens only in Render environment variables; never put them in GitHub or browser code. Replit Agent is a coding product/environment, not assumed to be a stable general-purpose inference API; do not configure it as a model endpoint unless Replit documents a compatible API for the account.

### Environment variables

Local OpenAI-compatible model:
- `ULUGBEK_LOCAL_MODEL_URL=http://127.0.0.1:11434/v1/chat/completions`
- `ULUGBEK_LOCAL_MODEL_NAME=<installed-model-name>`

Generic OpenAI-compatible provider:
- `ULUGBEK_AI_PROVIDER=openai-compatible`
- `ULUGBEK_AI_BASE_URL=<provider-chat-completions-endpoint>`
- `ULUGBEK_AI_MODEL=<model-id>`
- `ULUGBEK_AI_TOKEN=<secret-if-required>`

Gemini:
- `ULUGBEK_AI_PROVIDER=gemini`
- `ULUGBEK_AI_MODEL=<Gemini-model-id>`
- `ULUGBEK_AI_TOKEN=<Gemini-API-key>`

Claude:
- `ULUGBEK_AI_PROVIDER=anthropic`
- `ULUGBEK_AI_MODEL=<Claude-model-id>`
- `ULUGBEK_AI_TOKEN=<Anthropic-API-key>`

The local model configuration remains supported. Do not set a provider until the corresponding model and credentials are actually available.

## Learning lifecycle

1. Discover public sources and fetch pages under rate, size, and network safety limits.
2. Record source URL, retrieval time, language, and content fingerprint.
3. Mark content as a candidate, not a verified fact.
4. Check provenance, recency, duplicate content, and corroboration.
5. Require review for sensitive or high-impact knowledge.
6. Only approved evidence is supplied to chat; source text is data, never executable instructions.
7. Capture failures and user feedback; use reviewed corrections to add regression tests.
8. Model-weight fine-tuning is a separate training job requiring a suitable dataset, compute, evaluation, and rollback. It is not performed by simply browsing web pages.

## Video generation

The existing ComfyUI adapter requires:
- `VIDEO_COMFYUI_URL`
- `VIDEO_COMFYUI_WORKFLOW` pointing to a real ComfyUI API-format workflow file
- optional `VIDEO_PROMPT_NODE_ID` and `VIDEO_PROMPT_INPUT`

The server hosting ComfyUI needs a compatible video model/workflow and GPU memory. The Render web service does not become a video model merely by enabling the route. Never report a video as generated until the returned media bytes are validated and saved.

## Safe execution

- Research and code suggestions are read-only by default.
- Running code, editing production files, publishing, spending money, sending messages, or deploying requires explicit authorization and audit logs.
- Never execute code downloaded from the internet as part of learning.
