# RC2.3.13R.3.1.1 — Hosted Closure, Candidate Rebuild & Targeted Physical Retest

## Mission

Convert R.3.1 learner-integrity source fixes into a **hosted-green, buildable, hashed** Owner QA candidate. Then run a **targeted** real-device retest of the six owner-reported defects. Do not invite Wave 1.

## Re-query (#345)

| Field | Value |
| --- | --- |
| PR | https://github.com/matstangherlin/longyu/pull/345 |
| Planning SHA (red) | `c68dc42871433746a7bfc1bfbded661e0d9bf843` |
| Observed HEAD at R.3.1.1 start | `a40df3d1af599d38854fc7096b391abdf9a62a33` |
| Branch | `cursor/rc2-3-13r3-1-1-hosted-candidate-rebuild-af1a` |

## Root cause of red `c68dc428`

| Surface | Real cause |
| --- | --- |
| CI Release Truth | Fingerprint advanced `fea5455e1461` → `29bb02ec0336` after `lessonTasks.ts` change; registry/product-truth stale |
| Android foundation | Same fingerprint contract drift |
| Security / CodeQL | **Build** failure (TS2352 cast), not a vulnerability finding |

Fix commit on #345: `a40df3d1` (fingerprint advance + product-truth refresh + cast).

## Local reproduction (post-`a40df3d1`)

| Command | Result |
| --- | --- |
| `npm run validate:beta -- --suite release-truth` | PASS |
| `npm run build` | PASS |
| `npm run validate:android-native-foundation` | PASS |

## Additional hosted blockers found on `a40df3d1`

| Suite | Failure | Fix in R.3.1.1 |
| --- | --- | --- |
| pedagogy-structure / `validate:journey-en` | 2 missing EN overlays surfaced by R.3.1 plan harvest | Added to `instructionGloss.en.json` |
| android-runtime / `validate:canonical-audio-manifest` | `audioPlayback` → `personalize` → `store` → `speech` broke esbuild mock graph | Extracted pure `isPersonalizedUtterance` to `src/lib/audio/personalizedUtterance.ts` |

## Preserve R.3.1 product fixes

- Zero canonical skips (`l14-char-rev` charIds + name collision)
- Distractor anti-leak + personalizeChoiceList
- `我叫` + name → PERSONAL_UTTERANCE / DYNAMIC_CONTENT (PERSONAL before LESSON)
- Hanzi compact ≤667px / `max-h-[min(42svh,220px)]`
- Authored visual repeat guard (no `!generated` exemption)

## Honesty model

```text
LEARNER_RUNTIME = c68dc428… (R.3.1 product fixes)
OLD_OWNER_QA_APK = STALE_FOR_CURRENT_RUNTIME (fb835ce8…)
NEW_OWNER_QA_APK = NOT_BUILT (until exact-head hosted green)
R31_TARGETED_PHYSICAL_RETEST = NOT_RUN
OWNER_QA_ENTRY = HOLD
PLAY_CLOSED_BETA_ENTRY = HOLD / OWNER_ACTION_REQUIRED (signing secrets)
PUBLIC_BETA_ENTRY = HOLD
Wave1 invited = 0
```

`knownStaticAudioDefects = 0` means **code** defects closed. `audioPhysicalVerification = NOT_RUN` until owner hears complete utterances on the new APK.

## Gate

`gate:rc2-3-13r3-1-1-hosted-candidate-rebuild` — ≥60 mutation kills rejecting stale APK promotion, Release Truth / Android / CodeQL bypasses, physical auto-PASS, Wave1 invite, and regression of R.3.1 integrity fixes.
