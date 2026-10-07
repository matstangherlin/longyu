# RC2.3.7 — Sensory Audit (sound · haptic · motion)

The sensory matrix (`sensoryFeedbackMatrix.ts`) documented intent; RC2.3.7 makes it operational: one pure policy, applied by the two players and executed by the gate.

## One sensory policy

| File | Role |
|---|---|
| `src/lib/hapticPolicy.ts` | closed map event → pattern, weights, per-gesture window (120 ms), **result-settle window (700 ms)** |
| `src/lib/sfxPolicy.ts` | SFX decision: setting OFF, **yield to Mandarin audio/recording**, duplicate collapse (180 ms), success fatigue |
| `src/lib/audioOwnerState.ts` | dependency-free "who owns the audio now" (written by the arbiter, read by SFX) |
| `src/lib/sensoryLog.ts` | in-memory log of played/suppressed decisions (QA panel only) |

## Findings → changes

| # | Finding | Change |
|---|---|---|
| S1 | Course confirmation fired `answerCorrect` haptic (CoursePicker, settings) | now `selection` (light) |
| S2 | Answer that completes a lesson = `answerCorrect` + `lessonComplete` vibrations (> 120 ms apart → both fired) | completion inside 700 ms of a result is dropped: one vibration per moment |
| S3 | SFX could start over the Mandarin model, self-playback or into a recording | SFX dropped while `RECORDING`, `RECOGNITION`, `CANONICAL_MEDIA`, `TTS`, `SELF_PLAYBACK` own the audio |
| S4 | Same SFX twice from one gesture | second dropped within 180 ms |
| S5 | 20 correct answers = 20 identical success sounds | after 5 in 2 min the success sound softens (−8 % each, floor 60 %); visual feedback unchanged |
| S6 | `tap` SFX on removing a piece (matrix: `pieceRemoved` has no sound) ×2 and on "Tentar de novo" (decoration) | removed; the removed piece still speaks in Mandarin |
| S7 | Guidance feature-unlock vibrates `achievementReveal` once | kept (meaningful milestone, `hapticOnce`) |

## Haptic meaning (closed list)

Light = selection / piece · Success = answer correct · Warning = wrong / blocked · Medium = milestone, chest, achievement · **Never**: navigation, scroll, open screen, play audio (gate SG1/SG2 + existing rc2-2-14 checks).

## Preferences — OFF is OFF

`soundEffects=false` → `sfxDecision` returns `setting_off` before anything else (also checked against the stored setting, not only the caller flag). `hapticsEnabled=false` → `hapticDecision` never fires. Theme (`longyu_classic`/`soft`/`game`) and volume (`soundFxVolume`) are exposed in Settings and multiply the gain; no new theme.

## Motion & reduced motion

Durations in use: micro 80–150 ms (guide text swap 80 ms, bubble settle 100 ms, reduced-motion fade 150 ms), ceremony ≤ 500 ms per stage, full completion reveal ≤ 2.5 s with Continuar free from the start.
`prefers-reduced-motion`: CSS disables shake, bloom, chest, streak burst, dragon, victory-in and guide animations (fade only for guidance); `completionSchedule(…, true)` reveals everything at 0 ms; `LessonVictory` passes `animated={false}` to the mascot. Functional feedback (state, text, icon) stays.

## Fatigue simulations (gate SG18 + policy)

- 20 correct answers: every answer keeps its sound; gain monotonically non-increasing to 0.6.
- 10 wrong answers: copy "Quase" + explanation; warning haptic (short), no long vibration, `error` SFX deduped per gesture.
- Answer + completion: one vibration.
