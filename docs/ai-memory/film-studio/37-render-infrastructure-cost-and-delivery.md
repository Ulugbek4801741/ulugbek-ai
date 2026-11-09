# Render infrastructure, cost and delivery engineering

## Workload reality
Long-form AI video is compute- and storage-intensive. A 60–120 minute film may require hundreds or thousands of generated shots, intermediate files and repeated QC. A small free web server is suitable for orchestration/API prototypes, not reliable high-volume GPU generation or large media storage.

## Split control plane and data plane
Control plane: API, authentication, project metadata, queue, scheduler, approvals, cost ledger and status.
Data plane: isolated CPU/GPU workers, media conversion, object storage, preview generation and final rendering. Workers should be replaceable and horizontally scalable.

## Storage
Use private object storage with lifecycle policies, multipart uploads, checksums, resumable transfer, encryption and signed expiring links. Separate originals, references, generated clips, audio stems, proxies and final exports. Avoid keeping large media blobs in relational DB or ephemeral container disk.

## Render pipeline
Probe media metadata → normalize color/timebase/audio → generate proxy → assemble timeline → render preview → QC → render final → checksum → publish private download link. Use FFmpeg or another appropriately licensed media engine in a restricted worker. Pin versions and record exact commands/settings.

## Cost model
Estimate separately: generation seconds, retries, upscaling, speech synthesis, transcription, storage GB-month, egress, CPU/GPU worker time and provider minimums. Present a range and assumptions before paid work. Enforce per-user and per-project budgets, concurrency caps, quotas and circuit breakers. Never spend beyond explicit authorization.

## Reliability
Queue-backed jobs, worker leases, health checks, metrics, structured redacted logs, dead-letter queue, cancellation, retry policy, backups and disaster recovery. Test large files, interrupted uploads, worker crashes, duplicate webhooks and partial renders.

## Delivery
Validate duration, resolution, frame rate, codec/container, audio sync, subtitle integrity and playback. Produce MP4 or requested format, optional subtitle files, thumbnail, project manifest and expiring download URL. Confirm file existence and checksum before reporting success.

## Degraded mode
If GPU/model access is absent, the agent may still produce script, shot list, storyboard, animatic from stills, and a costed production plan. Label these accurately; do not call them a completed generated film.
