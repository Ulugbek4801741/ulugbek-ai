# ULUGBEK AI Autonomous Maintenance Loop

## What runs automatically

The public GitHub repository runs the workflow after every merge to `main`, every 6 hours, and on manual request. It:

1. Installs project dependencies without executing package lifecycle scripts.
2. Runs the complete Node.js test suite.
3. Audits production dependencies for high-severity vulnerabilities.
4. Reads metadata, latest release notes, declared license and a short README excerpt from a curated list of public upstream repositories.
5. Calls the deployed Render health endpoint and validates its JSON response.
6. Sends a current Uzbek population question to the deployed chat API and requires either a numeric estimate backed by a matching recent source or a safe insufficient-evidence response.
7. Stores a time-limited workflow artifact with upstream research, health and chat reports.
8. Persists the latest public-source report plus 30 days of snapshots on the separate `autonomous-research-memory` branch; it never writes these reports to `main`.
9. Creates or updates one maintenance issue when a check fails.
10. Dependabot checks npm packages and GitHub Actions weekly, then opens update PRs that go through CI.

## Safety boundaries

- The workflow does not edit application source code or the `main` branch. Its only write is a public, source-attributed research snapshot on `autonomous-research-memory` after all checks pass.
- It never runs code downloaded from an upstream repository.
- It never copies or executes upstream code, installs upstream projects, edits model weights, pushes commits to `main`, merges pull requests, or changes secrets. A production deploy is possible only through the separately configured deploy hook after the quality gate passes.
- Upstream README and release-note excerpts are limited to 100 words each (at most 200 words from one repository per run).
- An upstream repository is a research lead, not automatically trusted training data. Its license and security posture must be reviewed before any code reuse.
- Production deployment is triggered only after the main-branch quality checks pass, and only when the repository secret `RENDER_DEPLOY_HOOK_URL` is configured. The workflow then waits for the expected commit to appear on Render and re-tests chat.
- Paid infrastructure changes remain owner-approved.

## One-time Render deployment connection

1. In the Render Dashboard, open the `ulugbek-ai2` service and create a Deploy Hook in its Settings.
2. In GitHub, open Settings → Secrets and variables → Actions → New repository secret.
3. Set the secret name to `RENDER_DEPLOY_HOOK_URL` and paste the Deploy Hook URL as its value.
4. Never paste the hook URL into chat or commit it to the repository.

Until this secret exists, the workflow deliberately skips automatic production deployment and reports that it needs setup.

## What "learning" means here

This first stage performs recurring source discovery and evidence collection. It stores public research reports on a separate Git branch, but does not train a foundation model or autonomously rewrite its own intelligence. A later stage needs a configured code-reasoning provider or bounded deterministic repair rules to convert reviewed findings into tested pull requests.

## Scheduling

- Scheduled every 6 hours at minute 17 (Uzbekistan time: 05:17, 11:17, 17:17 and 23:17).
- Manual execution: GitHub Actions → ULUGBEK AI Autonomous Maintenance → Run workflow.
- The workflow uses standard GitHub-hosted runners for this public repository.

## Production deployment

The Render web service remains the production API. A free Render web service can sleep after inactivity; periodic health checks do not make it an always-on service. A continuously running worker or non-sleeping web plan has a separate compute cost and must not be enabled without explicit cost approval.
