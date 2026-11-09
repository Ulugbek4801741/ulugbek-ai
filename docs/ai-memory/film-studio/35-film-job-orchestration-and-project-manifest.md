# Film job orchestration and project manifest

## Job graph
A film is a durable directed acyclic graph of tasks: intake → rights review → script → continuity bible → breakdown → storyboard → shot generation → shot QC → regeneration/review → edit assembly → audio/music → captions/localization → final QC → export. Dependencies are explicit; independent shots may run in parallel within quotas.

## Durable state
Every task has: project_id, task_id, type, status, input_hash, dependency_ids, attempt_count, idempotency_key, started_at, updated_at, checkpoint, output_asset_ids, error_code, estimated_cost, actual_cost and policy decision. States: queued, planned, awaiting_approval, running, retry_wait, needs_review, succeeded, failed, cancelled. State changes are audited.

## Resume and recovery
Persist checkpoints after each successful stage. On worker restart, reclaim expired leases and resume from the last verified output. Use bounded retries with exponential backoff and jitter for transient failures only. Never retry policy denials, invalid inputs or confirmed cost-limit failures automatically. Deduplicate jobs and billing with idempotency keys.

## Canonical project manifest
The manifest records project settings, script and bible versions, shot order, source asset provenance, consent records, provider/model versions, prompt hashes, generated outputs, edit timeline, audio/subtitle tracks, rights basis, cost ledger, QC results, retention expiry and export checksums. Store content separately from metadata; version every change.

## Timeline representation
Use a standard internal edit decision list: clip ID, source asset ID, source in/out, timeline start/end, track, transform/crop, transition, speed, color treatment, text overlay, audio gain/fade, subtitle cue references and render profile. Validate no negative durations, invalid ranges, missing assets, unintended gaps or overlapping exclusive tracks.

## User-facing progress
Show stage, percent only when calculable, completed/remaining shots, estimated remaining time as a range, spend so far, blockers and next action. Do not invent ETA. Allow pause/cancel and preserve completed work. Notify the user only when configured.

## Approval gates
Automatic: script drafts, storyboard, sandbox generations within approved budget, QC and private preview.
Approval required: paid provider spend beyond pre-authorized cap, publication/sharing, licensing purchase, use of another person's likeness, major scope changes and deletion of source assets.
