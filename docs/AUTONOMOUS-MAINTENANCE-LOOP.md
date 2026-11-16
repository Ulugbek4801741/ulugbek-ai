# ULUGBEK AI Autonomous Maintenance Loop

## What runs automatically

The public GitHub repository runs a scheduled workflow daily and can also be started manually. It:

1. Installs project dependencies without executing package lifecycle scripts.
2. Runs the complete Node.js test suite.
3. Audits production dependencies for high-severity vulnerabilities.
4. Reads metadata, latest release notes, declared license and a short README excerpt from a curated list of public upstream repositories.
5. Calls the deployed Render health endpoint and validates its JSON response.
6. Sends a real Uzbek population question to the deployed chat API and rejects unrelated replies (a safe "insufficient evidence" response is accepted).
7. Stores a time-limited workflow artifact with upstream research, health and chat reports.
8. Creates or updates one maintenance issue when a check fails.
9. Dependabot checks npm packages and GitHub Actions weekly, then opens update PRs that go through CI.

## Safety boundaries

- The workflow is read-only with respect to repository contents.
- It never runs code downloaded from an upstream repository.
- It never copies code, installs upstream projects, changes dependencies, edits model weights, pushes commits, merges pull requests, changes secrets, or deploys.
- An upstream repository is a research lead, not automatically trusted training data. Its license and security posture must be reviewed before any code reuse.
- Production deployment and paid infrastructure changes remain owner-approved.

## What "learning" means here

This first stage performs recurring source discovery and evidence collection. It does not train a foundation model or autonomously rewrite its own intelligence. Retrieved README/release information is an audit artifact, not permanent model memory. A later stage needs a persistent knowledge store and a configured code-reasoning provider or bounded deterministic repair rules to convert reviewed findings into tested pull requests.

## Scheduling

- Scheduled every 6 hours at minute 17 (Uzbekistan time: 05:17, 11:17, 17:17 and 23:17).
- Manual execution: GitHub Actions → ULUGBEK AI Autonomous Maintenance → Run workflow.
- The workflow uses standard GitHub-hosted runners for this public repository.

## Production deployment

The Render web service remains the production API. A free Render web service can sleep after inactivity; periodic health checks do not make it an always-on service. A continuously running worker or non-sleeping web plan has a separate compute cost and must not be enabled without explicit cost approval.
