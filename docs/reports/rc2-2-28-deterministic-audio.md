# RC2.2.28 — Deterministic Audio Pipeline

Wave stacked on RC2.2.27 / #300 (`RC2_2_28_BASE_SHA=920310c18f5e77d044754885bd0319d183db6d45`).

## Architecture

Fixed learning audio is **canonical asset first**:

1. Canonical asset (manifest `audioId`)
2. Native Media3 / ExoPlayer (`LongyuMedia`) or web `HTMLAudioElement`
3. TTS fallback (dynamic / QA / missing asset only)
4. Textual fallback

TTS is convenience — not critical infrastructure for Guided Try, authored conversations, Tone, Review, Culture, Immersion.

## Delivered

- `src/data/audioManifest.generated.ts` + core pack under `public/audio/core/` and `assets/audio/core/`
- `LongyuMediaPlugin` (Media3 ExoPlayer) + web canonical player
- `audioEnginePolicy` / `audioGate` (HEARD | DEGRADED enables CTA)
- Pure `conversationReducer` — audio is side-effect after DOM
- Dual SHA provenance (`sourceHeadSha` / `workflowSha`)
- LessonPlayer wires `completionKind` + `unlockLabel` via `computeCompletionDeltas`
- Expanded no-scroll E2E (Lesson / Review / Pinyin / Tone)
- Gate `gate:rc2-2-28-deterministic-audio` with mandatory mutations

## Physical truth

APK tests remain `NOT_RUN` until owner confirmation on device. Matrix: `docs/release/rc2-2-28-physical-matrix.json`.

## Not Closed Beta

RC2.2.28 eliminates the blocking dependency. Next: RC2.2.29 — Closed Beta Entry.
