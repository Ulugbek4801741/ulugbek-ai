# ULUGBEK AI voice module: implementation status

## Implemented in this branch
- `public/voice-core.js`: browser-compatible shared helper for language tags, transcript normalization, an allow-listed set of Uzbek commands, capability reporting, and explicit online/offline routing decisions.
- `public/index.html`: voice mode selector (Auto / Online / Offline) and script loading.
- `public/app.js`: saves the selected mode, uses the shared command classifier, and asks for confirmation before browser speech recognition that may send audio remotely.
- `tests/voice-core.test.js`: seven unit tests for normalization, command allow-list, language tags, no silent online fallback, and engine selection.

## Not yet implemented (important)
- No offline speech model is bundled or downloaded. Choosing Offline correctly reports that no model is installed; it does not transcribe speech offline yet.
- The five language entries are a starter registry, not proof of complete recognition or speech synthesis for five languages. Actual support depends on browser/device voices and recognition engines.
- No 200+ language model, speech model training pipeline, YouTube ingestion, server transcription endpoint, native Android/iOS plugin, or Windows-specific offline engine is connected yet.
- The UI uses browser SpeechRecognition as an online/compatibility engine where available. Browser support and remote processing behavior vary.

## Verification
- The seven voice-core tests were run locally against a temporary copy of the module: 7 passed.
- GitHub Actions CI and test workflows were triggered for this branch; check the PR checks for their final result before merging.
- These unit tests do not validate microphone permission behavior, browser compatibility, real audio accuracy, mobile-native integrations, or offline model performance.

## Next engineering steps
1. Review final CI/test results and fix failures.
2. Add a native/on-device SpeechEngine adapter using a selected runtime such as sherpa-onnx, after benchmarking supported model packs on target devices.
3. Add signed model manifests, download size/hash checks, deletion and rollback.
4. Add API endpoints only if online server transcription is needed; audio must require consent, authentication, strict size/duration limits, and no raw-audio logs.
5. Add per-language benchmark datasets with appropriate licenses and report word/character error rates before claiming support.
6. Test on a real Android phone, iPhone, Windows device, and supported browsers before release.