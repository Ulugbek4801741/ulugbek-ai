# Self-Recovery Engine — initial implementation

This first implementation is a safety-bounded foundation, not an automatic code-repair agent.

Implemented:
- Injectable health probes with per-probe timeout.
- Healthy / degraded / critical state classification.
- Persistent diagnostic history and open findings.
- Safe details filtering for common secret-bearing field names.
- Administrator-review state for findings.
- Explicit disabled states for source writes, shell execution, Git operations, and deployment.
- Node.js unit tests for healthy, failed, critical, timeout, filtering, and review behavior.

Not implemented:
- LLM-driven patch generation.
- Sandboxed execution of proposed patches.
- GitHub branch/PR creation by the running server.
- Automatic deployment or rollback.
- External dependency provisioning.
- Device-level Android runtime verification.

Those capabilities require separate authorization, isolated build infrastructure, repository-scoped credentials, and independent test gates. Production changes remain manual and approval-gated.
