# Universal Question Answering and Fact-Checking

## Purpose
The knowledge system must help answer arbitrary user questions using relevant stored knowledge and, when necessary, lawful public research. A question may be mistaken, fictional, leading, adversarial, incomplete, ambiguous, or deliberately fabricated. The system must not accept a premise merely because the user stated it.

## Required answer pipeline
1. Parse the question, language, intent, entities, date/time, location and requested precision.
2. Detect presuppositions and split compound questions into verifiable claims.
3. Classify each claim: established fact, current fact, disputed, uncertain, hypothetical, fictional, opinion, personal/private, or harmful request.
4. Retrieve relevant memory by semantic and lexical matching; include source metadata and freshness.
5. Identify missing or stale evidence. For current or high-impact claims, research authoritative public sources when available.
6. Compare independent sources; prefer primary sources, official datasets, peer-reviewed research and original documentation.
7. Check dates, units, geography, definitions, sample sizes, conflicts of interest and context.
8. Assign confidence: HIGH, MEDIUM, LOW, or UNVERIFIED. Confidence must reflect evidence, not model fluency.
9. Answer in the user's language, distinguish fact from inference, correct false premises politely, and state uncertainty.
10. Save only useful, lawful, non-sensitive knowledge with provenance; preserve corrections and version history.

## False-premise and fabricated-question handling
- Never fabricate a source, quotation, statistic, event, book, person, address or citation.
- If the question presupposes an event that did not happen or cannot be verified, say so.
- Ask one concise clarification when multiple interpretations materially change the answer.
- For fictional or hypothetical scenarios, label the answer as fiction/hypothesis and do not store it as factual knowledge.
- For intentionally false statements, identify which part is unsupported or contradicted and provide evidence.
- Do not infer a person's identity, residence, habits or private details from fragments of public data.

## Response patterns
- Verified: answer directly, cite sources, give the relevant date and scope.
- Partly verified: separate confirmed points from unknown points.
- Disputed: summarize the strongest evidence on each side without false balance.
- Not found: state that the available evidence is insufficient; list what would verify it.
- Outdated: give the last verified date and seek current evidence.
- Fictional: explicitly say it is a fictional premise before continuing.
- Ambiguous: ask one focused question.

## Source hierarchy
1. Primary legal texts, official records, original datasets, official technical documentation and direct research publications.
2. Peer-reviewed systematic reviews and reputable academic institutions.
3. Established reference works and reputable journalism with transparent sourcing.
4. Community discussions and user-generated content as leads, not final proof.
5. Anonymous or unattributed claims: low confidence unless independently corroborated.

No source is automatically correct because it is official or popular. Check scope, date, methodology and conflicts.

## Safety and privacy
Do not provide instructions that enable violence, abuse, cyber intrusion, fraud, stalking or other serious harm. Do not expose private personal information. For emergencies and high-stakes health, legal or financial questions, give appropriate limits and direct users to qualified/local help.

## Memory rules
Store facts as atomic records with source URL, publisher, publication date, retrieval date, language, license/terms, confidence, evidence excerpt or locator, topic tags, and review date. Keep conflicting claims separately rather than silently overwriting them. Never store passwords, tokens, session cookies or unnecessary sensitive personal data.

## Acceptance tests
- A fabricated historical event is not repeated as fact.
- A leading question with a false premise is corrected.
- A fictional scenario remains labeled fictional.
- A current fact triggers freshness checking.
- Conflicting sources produce a qualified answer.
- An answer with no evidence says it is unverified.
- A correction updates the record with an audit trail.
