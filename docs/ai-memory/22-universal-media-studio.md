# Universal media and document studio

## User experience
A single intent router accepts natural-language requests such as: create an illustration, edit an uploaded photo, make a short video, animate a permitted still image, summarize a PDF, prepare a presentation, transcribe audio, translate subtitles, or assemble a social-media-ready edit. The router identifies the input assets, desired output, format, audience, language, rights and constraints; it asks only for essential missing information.

## Capability adapters
Use replaceable adapters rather than one monolithic feature:
- Image: prompt-to-image, crop/resize, background removal, restoration and user-authorized edits.
- Video: storyboard, shot list, timeline, transitions, titles, captions, audio alignment, rendering and export.
- Animation: animate user-owned/licensed stills with explicit motion instructions; preserve subject consistency and avoid misleading impersonation.
- Audio: speech-to-text, text-to-speech, noise cleanup and subtitle timing.
- Documents: PDF/DOCX/PPTX/XLSX/CSV/TXT/Markdown extraction, classification, summarization, conversion and generation.
- Layout/design: posters, flyers, thumbnails, presentations and templates.
- Publishing preparation: aspect ratios, codecs, captions, metadata and platform-specific export presets.

## Pipeline
Intent → asset inventory → rights/access check → task plan → tool/model selection → storyboard or document outline → sandboxed processing → quality checks → preview → export → provenance manifest.
Keep intermediate assets, task checkpoints and reproducible settings. Use bounded retries and resume from the last valid checkpoint.

## Video editing
A valid editing workflow must create an actual timeline/EDL or equivalent project representation, with source in/out points, ordering, transitions, text, audio, aspect ratio, frame rate and output codec. Render through an available, licensed media engine. A written edit plan alone is not a rendered video.

## Safety and integrity
- Do not fabricate that a render, upload or export succeeded.
- Keep original files immutable; work on copies and preserve undo/rollback.
- Scan uploads, enforce file-size/duration limits and sandbox parsers/renderers.
- Do not create non-consensual sexual imagery, deceptive impersonations, forged evidence or harmful manipulated media.
- For realistic synthetic media, retain provenance/AI-generated disclosure metadata where supported.
- Ask before publishing, sending, purchasing stock assets, or using paid APIs.
- Respect privacy, copyright, licenses, publicity/personality rights and platform terms.

## Resource governance
Estimate CPU/GPU, storage, duration and external API cost before expensive jobs. Prefer local/open-source tools when feasible; degrade gracefully on low-power servers. Enforce quotas, cleanup policies and user-visible progress.

## Acceptance tests
- The router correctly classifies image, video, document, audio and mixed-media requests.
- Unsupported formats receive a clear explanation and supported alternative.
- A video task produces a preview/render artifact before claiming completion.
- Original assets remain unchanged.
- Jobs can resume after worker restart without duplicate billing or corrupted output.
- User can inspect and download/export the final artifact.
