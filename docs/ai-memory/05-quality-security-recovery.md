# ULUGBEK AI — Quality, Security and Recovery

## Quality gates
Every generated software change should have: stated requirement, bounded diff, tests, lint/static checks where available, dependency review, security review, regression checks and a human-readable summary. A passing test suite is evidence, not proof of zero defects.

## Change lifecycle
Issue → plan → isolated branch → backup/checkpoint → implementation → tests → review → pull request → owner approval → protected merge/deploy → health check → monitor → rollback if required.

## Recovery
- Persist task state and checkpoints so interrupted work can resume safely.
- Use bounded retries with exponential backoff and a maximum attempt count.
- Detect stale locks and duplicate jobs.
- Keep backups separate from the primary data store and periodically test restoration.
- On uncertain deployment health, stop further rollout and report evidence.

## Security baseline
Threat-model inputs, dependencies, file uploads, webhooks, model output and generated code as untrusted. Use sandboxing, resource/time/network limits, output validation, secret scanning, authentication, authorization, rate limits and audit logs. Do not execute arbitrary generated code on the production host.
