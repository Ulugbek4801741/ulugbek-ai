# ULUGBEK AI — Legal and Responsible Deployment Baseline

## Important scope statement

This document is an engineering checklist, not legal advice, a legal opinion, or proof of compliance. No single checklist can make a product compliant with every country's laws. Requirements depend on the countries where the service is offered, the people affected, the data processed, the business model, and the integrations enabled. Before public launch in a country, obtain qualified local legal/privacy/security review and document the decision.

## Current release gate

Until the relevant review is complete, ULUGBEK AI must not claim that it is legally compliant worldwide. Keep high-impact and external-effect actions disabled unless the required safeguards are implemented, tested, and explicitly configured.

## Minimum checks before enabling a country or feature

- [ ] Identify the service operator, target countries, intended users, age limits, and responsible contact.
- [ ] Map personal data: what is collected, purpose, lawful basis, access, recipients, storage location, retention period, deletion/export process, and breach response.
- [ ] Publish understandable privacy notice, terms, AI-use disclosure, complaint/contact route, and cookie/analytics notice where applicable.
- [ ] Obtain and record any consent that is actually required; do not treat consent as the universal lawful basis.
- [ ] Minimize data collection; avoid collecting sensitive data unless necessary and specifically reviewed.
- [ ] Set retention and deletion rules; local JSON files are prototype storage and are not sufficient evidence of production-grade privacy, access control, backups, or deletion.
- [ ] Review copyright, database rights, licences, website terms, robots/access policies, and source attribution before collecting or redistributing content. Publicly accessible does not automatically mean freely reusable.
- [ ] For AI-generated output, communicate uncertainty and provenance where relevant; provide correction/reporting routes and human review for consequential decisions.
- [ ] Keep human approval for messages, publication, file deletion/upload, payments, purchases, financial trades, production deployments, permission changes, and other consequential external effects.
- [ ] Do not make medical diagnosis/treatment, legal determinations, credit/employment/housing eligibility, or other high-impact decisions autonomously. Add domain-specific safeguards and qualified human oversight where lawful.
- [ ] Protect accounts and secrets: secure authentication, least privilege, CSRF/session protections where relevant, rate limits, input/output validation, dependency updates, audit logs, and incident response.
- [ ] Verify hosting location, cross-border transfers, subprocessors, vendor terms, and security controls.
- [ ] Test accessibility, security, abuse cases, language-specific behaviour, data export/deletion, and failure recovery.
- [ ] Record reviewer, country/region, feature version, evidence, open issues, and next review date. Re-review when laws, features, vendors, or data flows change.

## AI, copyright and open-web research

ULUGBEK AI's current research/learning prototype saves source-linked candidate notes; it does not retrain model weights. Each source should be checked for accuracy, licence/terms, privacy implications, and permitted reuse before a note is approved or shown as authoritative. Do not bypass authentication, paywalls, technical restrictions, or rate limits. Respect takedown and correction requests through a documented process.

## Release evidence required

A release should not be marked compliant or production-ready based only on passing unit tests. Keep separate evidence for:
1. automated tests and build;
2. security review and dependency scan;
3. privacy/data-flow review;
4. country/feature legal review;
5. real-device and accessibility testing;
6. incident response and operational monitoring.

Any unchecked item is an open risk, not a claim of compliance.