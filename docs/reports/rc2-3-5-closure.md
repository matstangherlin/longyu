# RC2.3.5 — Speech, Contrast Training & Non-Blocking Pronunciation — Closure

Parent: [matstangherlin/longyu#315](https://github.com/matstangherlin/longyu/pull/315) @ `0b3c85ec9b6954474c747f0ec3e852e0cd816604` · Branch `cursor/rc2-3-5-speech-contrast` · 2026-10-07

Statuses: PASS · CODE_READY · NOT_RUN · OWNER_ACTION_REQUIRED · BLOCKED.

| Area | Status | Evidence | Remaining |
|---|---|---|---|
| Parent #315 hosted truth | **CODE_READY** | backend-contract red → causal fix `0a14c41` → **success** (run 37563800394); CI then surfaced LON-001 → fix `0b3c85e`; all 430 `validate:beta` steps covered (hosted 1–244, local 245–430) — [`rc2-3-5-parent-hosted-truth.md`](rc2-3-5-parent-hosted-truth.md) | hosted CI on `0b3c85e` |
| Speech architecture | **PASS** | one architecture, modes mapped; no new recorder/player/recognizer — [`rc2-3-5-speech-system-truth.md`](rc2-3-5-speech-system-truth.md) | — |
| Canonical contrast | **PASS** | Library V2: 68 contrasts, 68/68 same canonical voice, 7 rejected with reason; seeds that changed two dimensions retired — [`rc2-3-5-contrast-library.md`](rc2-3-5-contrast-library.md) | new assets for missing families |
| Tone contrast | **PASS** | 46 pairs across 1×2…3×4; neutral tone excluded by design | — |
| Initial contrast | **CODE_READY** | 17 pairs (sh×x, s×sh, l×n, j×q, j×x, q×x, ch×q, ch×sh, g×k, c×z); 37 tone-confounded Journey "segment pairs" removed at source | b×p, d×t, r×l need canonical assets |
| Final contrast | **CODE_READY** | 5 pairs (ao×ou, ai×ei) | an×ang, en×eng, in×ing, ian×iang, u×ü need canonical assets |
| Self compare | **PASS** (web) | `SelfComparePractice` reused as the primary loop; evidence wired; open-settings on permanent denial; web capture stops on hidden tab | owner device |
| ASR fallback | **PASS** (code + web) | every failure category ends in "continue without speaking"; no-service/no-zh/network → record & compare; bounded retry — gate G4 + mutations 3, 11 | owner device |
| Android audio arbitration | **CODE_READY** | RECORDING/SELF_PLAYBACK/CANONICAL_MEDIA owners asserted (gate G8, mutation 12) | owner torture test |
| Speech evidence | **PASS** | `speechEvidence.ts` local contract; no audio/transcript/score fields (mutations 6, 15) — [`rc2-3-5-speech-evidence-contract.md`](rc2-3-5-speech-evidence-contract.md) | RC2.3.6 consumes it |
| Privacy | **PASS** | no network path in speech files (gate G5, mutation 5); recordings revoked/deleted on leave/re-record; nothing uploaded | — |
| Mobile | **PASS** (web) | `e2e/rc2-3-5-speech-contrast.spec.ts` 6/6 at 360×640, 375×667, 390×844 (no horizontal overflow) | owner device |
| CI | **CODE_READY** | `gate:rc2-3-5-speech` (16/16 mutations) in `validate:beta`; 56 minimal-pair-dependent gates + 45 RC2.2.x/RC2.3.4A gates pass locally; typecheck + build OK | hosted run on this PR |
| Android build | **NOT_RUN** (this head) | parent `0a14c41` Android foundation success (run 37563800406) | this PR's Android run |
| APK | **NOT_RUN** | — | install from this PR's artifact |
| Owner device acceptance | **OWNER_ACTION_REQUIRED** | checklist + torture matrix — [`rc2-3-5-device-acceptance.md`](rc2-3-5-device-acceptance.md) | `OWNER_AUDIO_ACCEPTANCE` |

## What a learner notices

Before: Pinyin Lab contrasts played one side and stayed silent on the other (13 of 14), then asked "which did you hear?" anyway; Journey "sh × x" drills also changed the tone; two seed pairs did the same.
After: every contrast that plays uses the same canonical voice on both sides and changes one thing; contrasts without audio say so and do not grade; record → hear yourself → compare → retry/continue always has an exit; recognition never blocks and never claims a tone score.

## Pedagogy V6 integration

No new Journey placement this wave (pilot first). Speech enters through surfaces that already exist: Journey `audio_discrimination` (perception), `listen` steps → `PronunciationPractice` → `SelfComparePractice` (production), conversation free answer (transfer), Pinyin Lab contrast drill (discovery → perception → compare → production). Expansion to more lessons waits for owner acceptance of the 8-item pilot.

## Not regressed

Hànzì eligibility gate, fingerprint chain (`5a64821d0b7d` unchanged), free-tier guardrails, `JEV_RUNTIME_ENABLED=false`, no paid resources, no sibling-project pause/delete, no production cloud migration, no secrets in reports, offline learning, entitlement integrity, RC2.3.x gates.

## Hand-off to RC2.3.6

Stable, separate evidence channels: listening (`modelHeard`), perception (`perceptionTrials/Correct` on confirmed audio), production (`recordingCaptured`, `selfPlaybackHeard`), recognition (`recognitionAttempted/Succeeded` — text only), retry (`retryCount`), completion. No personalization implemented here.
