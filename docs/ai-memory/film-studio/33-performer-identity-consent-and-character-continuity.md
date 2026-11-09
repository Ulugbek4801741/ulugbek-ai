# Performer identity, consent and character continuity

## Identity rights
A user may submit their own image/video and request a fictionalized on-screen role. Record an affirmative, informed permission event for the intended processing and retention. The user must have rights to submit the asset. For another identifiable person, require that person's valid authorization or a clearly applicable lawful basis reviewed by the service; a user's claim alone is not sufficient for high-risk impersonation.

## Allowed continuity workflow
- Create a private character reference pack from user-authorized source images.
- Extract non-sensitive visual continuity attributes needed for the task: hairstyle, clothing, silhouette, accessories and general visual appearance.
- Store source asset IDs and consent scope, not public identity guesses.
- Generate consistent fictional scenes using approved references and model features.
- Allow the user to preview, revise or delete project assets subject to retention and legal requirements.
- Preserve original uploads; transformations operate on derived copies.

## Prohibited or restricted use
Do not generate non-consensual sexual imagery, deceptive impersonation, forged evidence, fraud, harassment, identity-based targeting or content intended to make viewers believe a real person did something they did not do. Apply stricter review to public figures, minors, intimate contexts, political persuasion and high-impact claims. Never infer a person's identity from an image.

## Consistency techniques
Use stable character IDs, reference images, fixed prompt fragments, wardrobe/location locks, seed/model/version tracking where supported, shot-to-shot reference frames and human review. Do not promise perfect face preservation: models can drift. Score identity similarity only against authorized reference assets and with privacy-preserving handling.

## Disclosure and provenance
For realistic synthetic media, provide an AI-generated/AI-altered disclosure in the export or metadata where supported. Do not strip watermarks or provenance signals. Keep a manifest linking source assets, consent scope, generated clips, model/provider version and edits.

## Retention and security
Encrypt uploads and derived references at rest and in transit; use per-project access control; signed, expiring download links; deletion lifecycle; no public bucket listing; no face templates in general-purpose logs or knowledge memory. Never store passwords, API keys, cookies or access tokens in project memory.
