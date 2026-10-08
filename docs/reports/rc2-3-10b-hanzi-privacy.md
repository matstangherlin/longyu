# RC2.3.10B - Hanzi privacy (static proof: stroke path is not persisted unnecessarily)

**Result: `PASS`.** The pointer path a learner draws exists only in memory while the character is being written. What is stored is counters and flags. Evidence: `docs/launch/rc2-3-10b-static-proofs.json` (`HANZI_STROKE_PATH_NOT_PERSISTED`, checks H1-H9). Re-run: `npm run proofs:rc2-3-10b-static`; verify: `npm run validate:rc2-3-10b-static`.

## Data flow

| Stage | Where | Holds |
|---|---|---|
| Capture | `HanziWritingCanvas.tsx` pointer handlers | `inkRef` (current stroke) and `committedRef` (finished strokes): `Point2D[]` in refs of the component |
| Evaluation | `HanziWritingExercise.tsx` | `attempts: StrokeAttemptSample[]` in React state, passed to `evaluateStrokeAttempt` / `evaluateCharacterAttempt` (`geometry.ts`) which return a verdict |
| Persist (device only) | `lib/hanziWriting/evidence.ts` | `HanziFormEvidence` counters per character (attempts, correct, help/undo/replay counts, stage, state) and a 200-event ring buffer of `HanziWritingTelemetryEvent` (ids, stage, counts, booleans, `strokeCount`, timestamp) |
| Cloud | `progressSnapshot.ts` | only `hanziBuilderProgressByChar` (attempts, correct, firstTry, lastLevelCompleted, mastered) as part of the account state |

The persisted shapes carry `strokeCount: number` and booleans such as `orderIssue`/`shapeIssue`. Nothing in them can hold a coordinate: no `points`, `path`, `samples` or `Point2D`. The code comment in `appendWritingTelemetry` states the rule ("never store stroke coordinates") and the check pins it.

## Checks (all PASS)

| Id | Claim |
|---|---|
| H1 | No file under `src/features/hanzi/`, `src/lib/hanziWriting/`, `ToneTrace.tsx` or the QA panel writes to `localStorage`, `sessionStorage`, IndexedDB, `writeScoped` or Cache Storage, except `evidence.ts` |
| H2 | No file in those paths calls `fetch`, `sendBeacon`, `XMLHttpRequest`, `WebSocket`, `FormData`, upload, Storage, `rpc`, `functions.invoke` or Supabase |
| H3 | `HanziFormEvidence` and `HanziWritingTelemetryEvent` have no geometry field (`points`, `path`, `Point2D`, `coords`, `samples`, `strokes`, `x`/`y`) |
| H4 | `evidence.ts` has exactly two `writeScoped` calls (counter map, telemetry ring of 200) |
| H5 | The call sites that persist writing results (`recordFormEvidence`, `appendWritingTelemetry` in `HanziWritingExercise.tsx`) pass `samples.length` and flags, never `samples` or points |
| H6 | The optional live-ink callback `onInkChange` has no consumer anywhere in `src/` |
| H7 | Ink lives in canvas refs and exercise state; there is no module-level ink variable |
| H8 | `LearningAccount` (104 fields, all spread into the cloud snapshot) has no geometry/media typed field or stroke/ink name; its only hanzi field is `hanziBuilderProgressByChar`, whose per-character type is four numbers and a boolean; `progressSnapshot.ts` never references the writing-evidence keys |
| H9 | The anonymous-to-account evidence move (`evidenceClaim.ts`) merges hanzi counters by maximum on the device and never touches points |

H8 exists because the snapshot builder is not an allowlist (it spreads every account field), so a name check on the builder alone would prove nothing; the audit is on the account type.

## What is intentionally kept

Counters and flags are needed: `HanziFormEvidence` drives `writingStrength`, review preference (`prefersWritingReview`) and the Learner Evidence Record. They are account-scoped on the device (`longyu:hanzi-form-evidence-v1`, `longyu:hanzi-writing-telemetry-v1`) and are not part of `user_progress.client_snapshot`.

## Not covered

- Runtime memory: refs and state are released when the component unmounts, but no heap inspection or device test was run. A device or screen-recording tool outside the app could see the drawing; that is the OS, not Longyu.
- The telemetry ring buffer stores timing (`at`) and per-attempt flags per character, which is behavioural data. It is device-local and capped, not stroke geometry; if the privacy policy lists "writing activity", this is what it refers to.
- `ToneTrace.tsx` (tone contour tracing) was included in H1/H2 and has no persistence or network call; its drawing is not stored.
- No installed APK was unpacked; the Capacitor `dist/` build was scanned (the `HanziWritingExercise` chunk has no network API, recorded under `artifactScans.localBuild`).

## Mutations

`npm run test:rc2-3-10b-static` adds `localStorage.setItem(..., points)` and a `fetch` in a hanzi file, a `points` field in the telemetry type, `points: samples` in the telemetry call, an `onInkChange` consumer, a snapshot import of the writing evidence, an ink field and a `Blob` field in the account state, and a `path` field in the builder progress type. Each flips its check to `FAIL`.
