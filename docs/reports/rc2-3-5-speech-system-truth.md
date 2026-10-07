# RC2.3.5 — Speech System Truth Map

One speech architecture, several pedagogical modes. This wave added **no** new recorder, player or recognizer.

## Layers that exist (and stay the only ones)

| Layer | Implementation | Notes |
|---|---|---|
| Input — Android | `LongyuSpeechPlugin.java` (SpeechRecognizer for ASR; MediaRecorder to app cache for practice) via `src/lib/platform/nativeSpeech.ts` | recording deleted on leave / re-record / real background |
| Input — Web | `getUserMedia` + `MediaRecorder` (Blob in memory) in `SelfComparePractice`; Web Speech `SpeechRecognition` in `src/lib/speech.ts` | Blob URL revoked on leave/re-record; RC2.3.5 also stops capture when the tab is hidden |
| Output — model | `src/lib/audioPlayback.ts` → canonical asset (`audioManifest.generated.ts`, speaker `fixed-speech-xiaoxiao-v1`, 657 entries) → native media; FIXED content never falls back to TTS (`audioEnginePolicy.ts`) | |
| Output — self | native practice playback (PLAY_PREPARING → PLAYING → PLAYED) / `<audio>` `onplaying` on Web | "Reproduzindo…" only after confirmed PLAYING |
| Orchestration | `src/lib/audioArbiter.ts`: one owner at a time — `CANONICAL_MEDIA · TTS · SELF_PLAYBACK · RECORDING · RECOGNITION` | claiming RECORDING stops the model first |
| Failure policy | `src/lib/speechFailure.ts`: 10 categories → actions; every category ends in `continue_without_speaking`; `shouldLeaveRecognition` (no-service/no-zh → immediate, else 2 failures) | |
| Diagnostics | `speechDiagnostics.ts`, `/qa/device` (QA builds only) | codes never shown to learners |
| Evidence (new) | `src/lib/speechEvidence.ts` — local, minimal, no audio/transcript | see evidence contract report |

## Surfaces

| Surface | Input | Output | Recognition | Recording | Pedagogical purpose | Canonical? | Action |
|---|---|---|---|---|---|---|---|
| Journey `listen` steps → `PronunciationPractice` (`steps.tsx` StepListen/LegacyStepListen) | mic (ASR) | canonical model | Android SpeechRecognizer / Web Speech (optional) | Web desktop only (parallel to ASR) | `GUIDED_PRODUCTION` + `TEXT_RECOGNITION` | yes | keep; ASR evidence wired; copy already says "checks syllables, not the tone" |
| `PronunciationPractice` fallback → `SelfComparePractice` | mic (recorder) | model + self | none | yes | `SELF_COMPARE` | yes | **primary speech loop**; evidence wired |
| Journey `audio_discrimination` (`lessonTasks.ts` + `perceptionDrills.ts`) | tap | canonical A/B | none | no | `PERCEPTUAL_CONTRAST` | yes (99/99 → now 62 pairs all same voice) | **fixed**: 37 tone-confounded "segment pairs" removed |
| Journey `tone` / `tone_pair` steps, Tone Trainer, `toneMicrolesson.ts` | tap | canonical | none | no | `PERCEPTUAL_CONTRAST` (tones) | yes | unchanged |
| Pinyin Lab → `PronunciationContrastDrill` (see → hear A → hear B → compare → identify → produce) | tap + mic | canonical A/B + self | none | via SelfCompare | `MODEL_LISTENING` → `PERCEPTUAL_CONTRAST` → `SELF_COMPARE` | **was not** (13/14 comparisons had a silent side) | **fixed**: gated on common canonical voice; real canonical words for g×k, j×q×x, ch×sh, z×c; unheard rounds no longer graded; evidence wired |
| Conversation scenes → `FreeAnswerField` | mic (dictation) or keyboard | — | Web Speech / native | no | `CONVERSATIONAL_TRANSFER` (text input aid) | n/a | keep — keyboard is always the alternative, never blocking |
| `SpeakButton` / `useAutoSpeak` (Fala page, cards) | — | canonical model | none | no | `MODEL_LISTENING` | yes | keep |
| `/qa/device` speech panel | mic | — | diagnostics | yes | QA only | — | not shown in `production_beta` |

## Duplications found

| Duplication | Resolution |
|---|---|
| Four contrast sources (`audioContrastPairs` seeds, `pronunciationCoreBr`, `toneContrastSets`, `perceptionDrills` minimal pairs) | Contrast Library V2 aggregates them (no fifth source); seeds now validated by the same rules |
| Seeds and Journey pairs that changed two dimensions at once | rejected / filtered at source |
| Two recorders? | No — Web `MediaRecorder` path inside `PronunciationPractice` is desktop playback of the ASR attempt; the practice recorder is `SelfComparePractice` only. Kept, documented. |

## What did not change

Audio engine, arbiter, native plugin, manifest, recognizer, Journey curriculum sources (fingerprint `5a64821d0b7d`), lesson/topic counts.
