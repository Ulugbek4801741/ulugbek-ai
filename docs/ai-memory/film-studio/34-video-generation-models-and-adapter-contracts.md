# Video generation models and adapter contracts

## Architecture principle
The director/orchestrator must not depend on one video vendor. Define capability-based adapters and select a provider per shot based on rights, quality, duration, aspect ratio, reference-image support, audio support, latency, geographic availability and cost.

## Adapter capability declaration
Each adapter reports: provider/model/version; text-to-video, image-to-video and video-to-video support; accepted image/video/audio formats; max input and output duration; resolution; frame rate; aspect ratios; reference image/character controls; camera controls; audio generation; negative prompts; seed/reproducibility; commercial-use terms; retention/training policy; regions; price unit; rate limits; asynchronous job support.

## Normalized operation
Input: prompt, shot ID, duration, aspect ratio, resolution, frame rate, reference asset IDs, continuity bible version, safety classification and cost ceiling.
Output: provider job ID, status, generated asset URI, actual duration, dimensions, codec, model/version, cost, timestamps, moderation result, failure code and provenance record.

## Provider-neutral lifecycle
Validate request → rights/safety check → estimate cost → submit job → poll/webhook → fetch result through authorized API → verify media → store in private object storage → record provenance. Use idempotency keys and bounded retries. Never retry a paid request blindly if provider status is uncertain.

## Selection and fallback
Rank only adapters that meet required capabilities and policy. Prefer local/open-weight tools when the hardware, license and quality are adequate; otherwise use a user-approved external service. If none is available, produce the storyboard/animatic or explain the blocker. Do not pretend a prompt-only plan is a rendered clip.

## Model evaluation
Benchmark representative Uzbek dialogue, faces, motion, hands, scene transitions, camera movement, lighting, subtitles and multilingual prompts. Record reproducible test prompts and human-rated results. Recheck model terms before commercial deployment; open weights do not automatically mean unrestricted commercial rights.

## Security
Keep provider credentials in environment-backed secrets storage. Redact logs. Enforce outbound network allowlists, file size and MIME validation, download timeouts, malware scanning and SSRF protection. Treat model outputs and provider metadata as untrusted data.
