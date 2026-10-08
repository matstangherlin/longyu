# RC2.3.10B - Speech privacy (static proof: raw recording is not uploaded)

**Result: `PASS` for raw audio (no recording leaves the device through Longyu code). Two things are stated honestly below: one open finding about dictated answer *text* (F-SPEECH-1) and one platform caveat that cannot be proven from this repository.** Evidence: `docs/launch/rc2-3-10b-static-proofs.json` (`SPEECH_RAW_AUDIO_NOT_UPLOADED`, checks S1-S12). Re-run: `npm run proofs:rc2-3-10b-static`; verify: `npm run validate:rc2-3-10b-static`.

## Where audio exists

| Surface | Captured by | Lives in | Ends |
|---|---|---|---|
| Web/PWA practice (`PronunciationPractice.tsx`, `SelfComparePractice.tsx`) | `MediaRecorder` on `getUserMedia` | `Blob[]` in a ref, then a local `blob:` object URL for playback | `URL.revokeObjectURL` on retry and unmount; tracks stopped |
| Android self-compare (`LongyuSpeechPlugin.java`) | Android `MediaRecorder` | one file, `cache/longyu-practice.m4a`, max 15 s | `discardPracticeRecording()` deletes it on every new start, failure, interruption and teardown |
| Recognition (browser `SpeechRecognition`, Android `SpeechRecognizer`) | the platform engine | the platform; Longyu receives only the transcript string | transcript used for scoring in memory, then dropped |

## Checks (all PASS)

| Id | Claim |
|---|---|
| S1 | The 8 speech/recording source files contain no `fetch`, `sendBeacon`, `XMLHttpRequest`, `WebSocket`, `FormData`, `.upload`, `.storage`, `.rpc`, `functions.invoke` or Supabase import |
| S2 | Nothing in client code reads a Blob back as data: no `FileReader`, `arrayBuffer()`, `readAsDataURL`, `toDataURL`, base64 helper |
| S3 | Both recorders pair `createObjectURL` with `revokeObjectURL` |
| S4 | The client never calls Storage or any upload API (the only `FormData` uses are the login and account forms) |
| S5 | Android Java has no `HttpURLConnection`, OkHttp, `java.net`, `WebSocket`, Retrofit, `DownloadManager` or Firebase Storage |
| S6 | The native recording is a single cache file; 2 `file.delete()` and 8 call sites of `discardPracticeRecording()` (9 matches including its definition) |
| S7 | The native plugin returns metadata keys only (`fileExists`, `fileBytes`, `peakAmplitude`, `durationMs`, `signalDetected`, `state`, `code`...); no `path`/`uri`/`data`/`base64`/`audio` key |
| S8 | The persisted `SpeechLearningEvidence` allowlist (13 fields) has no audio, URL, blob, transcript, score or pitch field; unknown keys are dropped by `normalizeSpeechEvidence` |
| S9 | The cloud snapshot is not an allowlist: `buildProgressSnapshot` spreads every `LearningAccount` field into `user_progress.client_snapshot`. So the account type was audited instead of the builder: of its 104 fields none has a media type (`Blob`, `ArrayBuffer`, `File`, `MediaStream`...) or a recording/voice/transcript/waveform/stroke/ink/pitch name. A change to the spread or the type fails the check |
| S10 | No Edge Function accepts `audio/*`, multipart bodies, `formData()` or `arrayBuffer()` |
| S11 | None of the 37 production tables has a column named like audio/recording/voice/transcript/stroke/ink/blob or a `bytea` type (read from `docs/launch/rc2-3-10b-schema-column-extract.json`) |
| S12 | The UI copy says Longyu does not store the recording and that recognition may be processed by the device's speech service (`speechPrivacy`, `selfComparePrivacy` in `src/locales/en.ts` and `pt-BR.ts`) |

Built artifacts: in the local build of this branch, the two chunks that contain `MediaRecorder` (`SelfComparePractice-*.js`, `steps-*.js`) contain no network API. The recorder-chunk scan was run on the local build only; the live production bundle was scanned for the Jev host, not for recorder behaviour.

Speech evidence that is stored (device only, account-scoped `localStorage` key `longyu:speech-evidence-v1`, last 200 events) is counters and booleans such as `recordingCaptured`, `recognitionAttempted`, `perceptionCorrect`. The anonymous-to-account move (`evidenceClaim.ts`) merges those events by `(activityId, mode, at)` on the device; the speech-evidence file itself is not part of the account state and never goes through the cloud snapshot.

## Finding F-SPEECH-1 (open, MEDIUM): dictated answers are stored as text and ride the cloud snapshot

Not audio, but it contradicts the line "Not collected: transcription of personal speech" in `docs/reports/rc2-3-5-speech-evidence-contract.md` if that line is read as covering the whole app. It is true only of the speech-evidence record.

Flow (each link is a static check recorded under `findings[0].evidence`):

1. `FreeAnswerField.tsx`: the "Speak" button runs recognition and puts the transcript in the answer field (`onChange(transcript)` or a pending proposal the learner accepts).
2. A wrong write-step answer calls `onMistake?.(draft)` (`steps.tsx`).
3. `LessonPlayer.tsx` keeps the raw text: `selectedAnswer: ... rawSelected`, then `userAnswer: error.selectedAnswer` in `LessonMistakeRecord`.
4. `LessonMistakeRecord.userAnswer`, `ActivityErrorRecord.selectedAnswer` and `UnrecognizedProductionRecord.answer` (last 40) are fields of the account state.
5. `buildProgressSnapshot` spreads all account fields, so they are uploaded to the learner's own `user_progress.client_snapshot` row (RLS own-row).

A typed answer follows exactly the same path, so this is consistent handling of learner-written text rather than a speech-specific leak. It does not reach `beta_pedagogy_events`: `src/services/pedagogyEvents.ts` strips `answer`/`freeText` keys. What changes is the privacy statement: dictation makes the stored text a *transcription of the learner's voice*.

Decision for the owner (fold into `OA-PRIVACY-SNAPSHOT-EMAIL`): make the RC2.3.11 snapshot an allowlist that excludes mistake/answer text, or name free-text answers as stored data in the privacy policy and in the data export/deletion text. Account deletion already cascades from `profiles` to `user_progress` (FK `ON DELETE CASCADE`, extract constraint `user_progress_user_id_fkey`).

## Platform caveat (not provable here)

Recognition is delegated. The browser engine (`SpeechRecognition`/`webkitSpeechRecognition`) and the Android `SpeechRecognizer` service may stream audio to the vendor's speech service. Longyu never sees or forwards that audio and cannot control its retention. On Android 12+ the plugin uses `createOnDeviceSpeechRecognizer` when an on-device model is available and preferred; otherwise it uses the system service. The product copy already says "Recognition may be processed by the speech service configured on the device".

Nothing here tested what a given browser or Google's service retains. If the store listing or privacy policy needs a stronger statement, it must say "Longyu does not upload your recording; your device's speech service may process it", not "audio never leaves your device".

## Not covered

- An installed APK was not unpacked; the Java sources and the `dist/` build were scanned instead.
- Runtime traffic was not captured (no proxy, no device). `docs/reports/rc2-3-5-device-acceptance.md` and the physical-device steps remain the runtime evidence path.
- Crash/Sentry scrubbing is a separate control (`src/lib/observability/errorScrub.ts` already redacts `audio|recording|speech|transcript` keys); it was not re-tested here.

## Mutations

`npm run test:rc2-3-10b-static` adds a `fetch` to the self-compare file, a `FileReader.readAsDataURL`, a `storage.from(...).upload`, an `okhttp` import in Android, a `ret.put("path", ...)` in the plugin, a `transcript` field in the evidence schema, a `Blob` field and a `transcript` field in the account state, and a changed snapshot spread; it also removes the `onMistake?.(draft)` call to prove the finding flips to `FLOW_CHANGED_RE_AUDIT`. Each flips its check or finding.
