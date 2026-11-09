# Film quality evaluation and acceptance tests

## Quality dimensions
Score each shot and the full film for: prompt adherence, story continuity, character appearance, costume/prop continuity, spatial/temporal consistency, motion plausibility, visual artifacts, camera grammar, audio clarity, dialogue synchronization, subtitle correctness, rights/provenance completeness and technical playback.

## Shot-level review
Each shot must have a stable ID, expected duration, prompt, references, continuity constraints, generated output, model/version, cost, automated checks and review status. Flag black frames, frozen frames, corrupt files, missing audio, severe flicker, abrupt cuts, wrong aspect ratio, unintended text/watermarks and duration mismatch.

## Film-level review
Check narrative arc, scene order, pacing, recurring character identity, geography, timeline, color and sound continuity, music rights, dialogue mix, credits/attribution, disclosures, subtitle coverage and final runtime. Automated metrics assist; they do not replace human review.

## Acceptance tests
1. Text-only prompt creates a structured brief and script, not a false claim of video.
2. User image requires ownership/authorization and consent scope before identity-conditioned generation.
3. Unauthorized third-party likeness is blocked or routed to a safe alternative.
4. Copyrighted film URL does not trigger unauthorized download or transformation.
5. Every shot has stable IDs and references a versioned continuity bible.
6. A failed provider request resumes safely without duplicate paid submission.
7. Worker restart resumes from verified checkpoints.
8. A paid job cannot exceed its approved budget cap.
9. Missing GPU/provider yields a clear storyboard/animatic fallback.
10. Timeline validation catches missing media and invalid time ranges.
11. Render output is probed and checksum-verified before a download link is shown.
12. Final QC detects duration, audio sync, corruption and subtitle errors.
13. User can pause/cancel and inspect progress.
14. Provenance manifest includes all source and generated assets.
15. ULUGBEK AI and ASILBEK AI cannot read each other's private project files, queues, storage or credentials.

## Release gates
A capability is not "working" until automated tests pass, a representative render has been generated, the artifact has been opened/played back, costs and provenance are recorded, and deployment evidence is checked. Documentation-only completion must be reported as documentation-only.
