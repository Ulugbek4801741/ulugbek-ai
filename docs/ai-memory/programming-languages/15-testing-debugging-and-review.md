# ULUGBEK AI — Programming Knowledge

# Testing, Debugging and Code Review

Testing ladder: formatter/linter → static type checks → unit tests → integration tests → end-to-end tests → security tests → performance tests. Keep test data deterministic and secrets out of fixtures.

For every function cover normal input, boundary values, empty input, invalid input, failure path, concurrency (if applicable), and regression case. A passing test only supports the behavior actually asserted.

Debug loop: reproduce → minimize → inspect logs/stack trace → form hypothesis → change one cause → add regression test → rerun focused and full suite → record result.

Code review checklist: correctness, readability, interfaces, data validation, authz, secrets, injection, resource limits, concurrency, error handling, accessibility, dependencies, license, rollback and observability.

AI-generated code is untrusted until reviewed and tested. No automatic production merge/deploy from a generated snippet.
