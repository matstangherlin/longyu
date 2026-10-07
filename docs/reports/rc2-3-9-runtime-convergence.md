# RC2.3.9: Runtime convergence, feature flags and hidden skips

This is a read-only audit at base `dbb6f11` (branch `cursor/rc2-3-9-stack-convergence`). It made no changes to source code.

Machine-readable outputs:
- `docs/release/runtime-authorities.json`: one canonical authority per domain.
- `docs/release/feature-flags.json`: 50 flags.
- `docs/release/skip-allowlist.json`: 57 pattern occurrences.

Method: the import graph covers `src/`, `e2e/` and `scripts/`. It resolves relative imports, `@/` imports and `import()`. A module counts as a "dead adapter" only when it has no importer **and** grep finds no textual reference from `src/`, `scripts/` or `e2e/`. Modules reached only by gates through `tsRequire` or `readFileSync` are marked `gateOnly` and are not counted as dead.

## A. Runtime authorities

| Domain | Canonical | Status | Notes |
|---|---|---|---|
| audio | `src/lib/audioPlayback.ts` | CONVERGED | All Mandarin playback goes through `playMandarinAudio`, under `audioArbiter` (one owner at a time). |
| speech (TTS / ASR / recording) | `src/lib/speech.ts`, `src/lib/tts.ts` | **DUPLICATE** | `FreeAnswerField.tsx` starts recognition without the arbiter. |
| guidance | `src/lib/guidanceOrchestrator.ts` | CONVERGED | `GuidanceHost` is mounted once (AppShell). Journey and Revisão use only `GuidanceInlineSlot`. |
| haptics | `src/lib/haptics.ts` | CONVERGED | `navigator.vibrate` and Capacitor calls appear only in `platform/nativeHaptics.ts`. |
| soundEffects | `src/lib/soundFx.ts` | CONVERGED | One shared AudioContext. It yields to `audioOwnerState`. |
| pedagogyPlanning | `features/lesson/lessonTasks.ts` + `lib/pedagogyV6/applyPedagogyV6.ts` | ACCEPTED_SHIM | Single pipeline in `LessonPlayer.runPlanner`. |
| visualResolver | `lib/visualFirst/resolveCurriculumVisual.ts` | ACCEPTED_SHIM | The `EARLY_VISUAL_CONCRETE` deprecated map is reachable only by an audit. |
| everydayScenarios | `lib/everydayMandarin/applyEverydayMandarin.ts` | CONVERGED | Called only from applyPedagogyV6. |
| culturePlayer | `features/lesson/LessonPlayer.tsx` | CONVERGED | `/cultura/:id` redirects to LessonPlayer. `CultureMissionPlayer` is dead. |
| hanzi | `HanziBuilderExercise.tsx`, `HanziWritingExercise.tsx`, `hanziWriting/applyWriting.ts` | ACCEPTED_SHIM | The form-evidence channel log forwards to the recorder. |
| masteryEvidence | `src/lib/mastery/recorder.ts` | ACCEPTED_SHIM | The only `recordLearningEvidence`. Channel logs forward to it. |
| auth | `src/lib/supabaseClient.ts` | ACCEPTED_SHIM | Includes the transient PKCE client in oauthService. |
| **account** (auth state) | `src/lib/supabaseClient.ts` | ACCEPTED_SHIM | The store `accounts/currentAccountId` is a projection, written only from AuthBootstrap and cloudSyncCoordinator. |
| progressStorage | `src/lib/store.ts` + `src/services/cloudSyncCoordinator.ts` | ACCEPTED_SHIM | Legacy dead exports in `syncService.ts`. |
| entitlements | `src/lib/proAccess.ts` (over `lib/entitlements.ts#effectivePremium`) | CONVERGED | `commercial/entitlements.ts` is used only by gates. |

### Audio (gate: exactly one canonical)

The canonical module is `src/lib/audioPlayback.ts`. It owns `playMandarinAudio`, the engine decision (`audio/audioEnginePolicy.ts`), the fixed-content rule "asset → native player → DEGRADED, never silent TTS", and the arbiter claims (`claimAudio("CANONICAL_MEDIA"|"TTS")`).

Every call to an audio-playback constructor in `src/` was verified:
- `src/lib/audio/canonicalPlayer.ts:170`: `new Audio()`. This is the Mandarin asset element. It is driven only by audioPlayback.ts, plus the QA forensics panel.
- `src/lib/soundFx.ts`: a shared `AudioContext` for UI sound effects only. It reads `audioOwnerState`.
- `src/features/lesson/SelfComparePractice.tsx:443`: `new Audio(webUrl)` plays back the learner's own recording, under `claimAudio("SELF_PLAYBACK")`.

`mandarinSpeech.ts` (request identity) and `useAutoSpeak.ts` are wrappers over the same function, not a second engine. Local `speak()` helpers in `MandarinToken.tsx` and `ToneContrastCard.tsx` call `playMandarinAudio`.

If the gate expects the canonical entry to be the module that owns the media element, that module is `src/lib/audio/canonicalPlayer.ts`. The JSON lists it under `playbackConstructors`.

### Speech: DUPLICATE (needs a fix)

- `src/features/lesson/FreeAnswerField.tsx:82` calls `recognizeOnce()` with **no** `claimAudio("RECOGNITION")`. Compare `PronunciationPractice.tsx:365`. This is on the learner path, so autoplay audio or sound effects can overlap an open microphone. The arbiter's single-owner contract is bypassed. The fix is to claim and release `RECOGNITION` the same way PronunciationPractice does.
- Accepted shims, outside the learner path: `SettingsPage.tsx:708` and `NativeSettingsSections.tsx:218` call `tts.speak()` directly to test the voice, and `NativeSettingsSections.tsx:121` runs a microphone test. These calls bypass the arbiter. It would be better to route them through `playMandarinAudio({source:"QA"})`.
- `speechPilot.ts` is used only by gates (`scripts/lib/speech-gates.mjs`).

### Auth / account

There are two `createClient(` calls, both verified:
- `src/lib/supabaseClient.ts:13` is the singleton session client. It persists and auto-refreshes the session.
- `src/services/oauthService.ts:41` is the RC2.3.8 PKCE exchange client: `storageKey: "longyu:oauth-pkce"`, `autoRefreshToken: false`, `detectSessionInUrl: false`. After the code exchange it hands the session to the main client with `main.auth.setSession` (`oauthService.ts:192`). This is an accepted shim; it never holds the long-lived session.

App-side auth state lives in the zustand store (`accounts`, `currentAccountId`, `activateCloudAccount`, `endCloudSession`). It is written from `AuthBootstrap.onAuthStateChange` and `cloudSyncCoordinator`. `entitlementStatus.ts` is a second, non-persisted zustand store. It holds only the transient `checking`/`detail` of the entitlement fetch, not auth state. There is no React auth context.

Several components and services call `auth.getUser()`/`getSession()` on the same singleton client. Those calls are reads, not a second auth state.

### Learner-path verification (one player, one mastery engine, one auth state, one audio engine)

| Surface | Player / renderer | Audio | Mastery evidence |
|---|---|---|---|
| Journey lesson | `LessonPlayer.tsx` + `steps.tsx` StepRenderer | playMandarinAudio, scheduleAutoSpeak | `recordLearningEvidence` (via `mastery/adapters.stepToEvidence`) |
| Culture item | redirects to LessonPlayer (`CultureItemPage.tsx` `<Navigate>`) | same | same + `store.ts:2737` culture → recorder |
| Culture review | `CultureReviewPage.tsx`, which uses the **same** StepRenderer | same | `reviewCultureMemory` → store → recorder |
| Review (Revisão) | `RevisaoPage.tsx`, its own exercise UI built by `reviewExerciseBuilder.ts` | scheduleAutoSpeak / SpeakButton | `recordLearningEvidence` (`srsReviewToEvidence`) + `buildPracticeSession` from personalMastery |
| Pinyin Lab | `PinyinLabPage.tsx` + `PronunciationContrastDrill.tsx` | playMandarinAudio / SpeakButton | `gradeSrs` + `speechEvidence` → recorder |
| Hànzì Lab | `HanziPage.tsx` → `HanziTrainingSession.tsx`, `HanziWritingLab.tsx` | SpeakButton | `gradeSrs` + `hanziWriting/evidence.recordFormEvidence` → recorder |
| Speech flows | `PronunciationPractice.tsx`, `SelfComparePractice.tsx` (inside steps) | arbiter-claimed | `recordSpeechEvidence` → recorder |

Result:
- **Players.** Revisão is a distinct renderer, but it shares every authority: audio, recorder, SRS, `feedbackAudioPolicy`, `taskFlowMachine`, plus the parity contracts `reviewTaskParity` and `reviewHelpParity`. It is accepted as a separate session type, not a second player of lessons. `CultureMissionPlayer.tsx` is the only second "player" found. It is LEGACY, redirect-only and unreachable (no route, no importer).
- **Mastery.** There is one evidence recorder. `domainMastery.ts`/`engineIntelligence.ts` are a legacy read-only completion-percentage view (Account and Profile pages). They write nothing.
- **Auth state.** One.
- **Audio engines.** One for Mandarin audio. UI sound effects and self playback are separate, arbitrated channels.

### Dead adapters (no importer; verified by grep)

| Module | Notes |
|---|---|
| `src/features/culture/CultureMissionPlayer.tsx` | Read as text by `scripts/lib/v495a-runtime.mjs` |
| `src/features/culture/JourneyCultureBridge.tsx` | `JourneyCultureBridgePanel` has no references |
| `src/components/progress/DomainMasteryCard.tsx` | |
| `src/lib/visualFirst/index.ts`, `src/lib/everydayMandarin/index.ts`, `src/lib/cultureDeep/index.ts`, `src/lib/hanziWriting/index.ts` | Unused barrels. Runtime code imports the submodules directly. |
| `src/lib/subscription.ts` | One-line re-export. Its path is listed in `rc2-2-31c-gates.mjs`. |
| `src/services/syncService.ts` `importLocalProgress`, `requestCloudMigration`, `restoreProgressFromCloud` | Superseded by cloudSyncCoordinator. Only `fetchRemoteEntitlements` is live. |
| `src/commercial/entitlements.ts` | Gate-only server precedence model, not a runtime path. |

Other orphan modules that are out of scope for runtime authorities: `components/feedback/FeedbackLink.tsx`, `hooks/useKeyboardBottomInset.ts`, `hooks/useVisualViewportHeight.ts`, `features/dev/ContentDiagnosticsPage.tsx`, `locales/index.ts`, and the data modules `course.ts`, `phases.ts`, `foundationContentRegistry.ts`, `masteryPassSpacing.ts`, `questionAnswerPairs.ts`, `transferReview.ts` and `vocabularyImport.ts`, which have no script reference either. A number of `src/data/chinaSurvival*.ts` and validation modules are consumed only by scripts.

## B. Feature flags (50; full list in feature-flags.json)

Counts: ACTIVE_REQUIRED 17 · ROLLOUT 10 · QA_ONLY 20 · OBSOLETE 0 · **DANGEROUS 3**.

- **JEV_RUNTIME_ENABLED = `false`.** Defined at `supabase/functions/_shared/budgetPolicy.ts:16` (`COST_POLICY_DEFAULTS`) and read by `jev.ts#jevAllowed('LEARNER_RUNTIME')`. No caller passes LEARNER_RUNTIME; the only Jev caller, `triage-feedback`, uses `DEV_AUDIT`. Caveat: `resolveCostPolicy` lets the Edge env flip this value to true. Only `ALLOW_PAID_OVERAGE` and `FREE_TIER_FIRST` are pinned. Gates assert the literal `false`.
- **DANGEROUS: `VITE_DEVICE_QA`.** `isQaFastPathAllowed` (`appEnvironment.ts:128`) returns true before it checks for a production-like env. The QA fast path can then seed `serverIsPro:true`, and AuthBootstrap skips session restore. The only mitigation is workflow config: it is set in `android-build.yml` (diagnostic APK) and not in `android-release.yml`.
- **DANGEROUS: `VITE_USE_TEST_FIXTURES`.** `isTestFixturesAllowed` guards it, but these sites read the raw env with no production guard:
  - `ConversationSceneStep.tsx:763` puts the answer in `data-qa-expected`.
  - `HanziTrainingSession.tsx:364` marks `data-qa-correct`.
  - `LessonPlayer.tsx:2467` installs `window.__longyuLessonQa.jumpTo`.
  - `deviceQa.ts:264` enables device QA.
  The current mitigation is that `netlify.toml` pins `false`.
- **DANGEROUS: `TURNSTILE_ALLOW_SKIP`** (Edge env). When no Turnstile secret is resolvable, create-account and submit-business-lead skip the captcha. It is meant for CI only and has no environment guard.
- Preview and local-auth loosening are correctly hard-guarded:
  - `VITE_ALLOW_PRO_PREVIEW` is ignored in production-like envs.
  - `VITE_DEV_ALLOW_LOCAL_AUTH` throws in production-like envs.
  - The e2e `localStorage` overrides take effect only through `allowSeededLocalSession()`.
- Exception: `longyu_lesson_perf` has no guard. It only enables perf marks, so it is harmless.
- `VITE_GUIDED_JOURNEY_SHELL` is ignored in production_beta. It is a candidate for OBSOLETE.

## C. Hidden skips (57 occurrences; skip-allowlist.json)

Scope and pattern names follow the gate contract: `test.skip`, `continue-on-error`, `|| true`, `|| :`, over `e2e/**/*.ts`, `scripts/**/*.mjs`, `.github/workflows/*.yml` and `package.json`. The two stack-convergence gate files are excluded.

Counts: **LEGIT 41 · HIDDEN_SKIP 16**. There are no `|| :` hits and none in `package.json`.

LEGIT occurrences:
- Engine or project-conditional skips (Chromium-only heavy walks, WebKit-only contract, touch-only projects, no service worker).
- On-demand screenshot and golden packs (`SHOT_PACK`, `RC2225_GOLDENS`).
- Mutation-test data inside gate scripts.
- `|| true` in CI cleanup or diagnostics (`supabase stop`, `ls /dev/kvm`).
- A `ci.yml` comment that documents the removal of `continue-on-error`.

HIDDEN_SKIP occurrences. In each case the precondition is guaranteed by the seed or by the Playwright env (`VITE_USE_TEST_FIXTURES=true`), so the skip can only hide a regression:
- `e2e/missions-responsive.spec.ts:170`, `e2e/rc2-2-8-learning-gamification.spec.ts:179`: the economy banner hook is always installed under fixtures.
- `e2e/qa-screenshot-pack.spec.ts:38`, `e2e/sticky-actions-overlap.spec.ts:47`: a seeded builder lesson that never reaches the builder.
- `e2e/sticky-actions-overlap.spec.ts:76`: `/revisao` is opened with **no seed**, so this test may skip on every run.
- `e2e/rc1-1-learning-loop.spec.ts:308`, `:356`: due SRS items are seeded, yet the test skips when the queue is empty.
- `e2e/rc1-3-learning-integrity.spec.ts:424`, `:458`, `e2e/rc2-2-27-android-tts-root-cause.spec.ts:206`: "did not reach Victory" on a deterministic l2 seed.
- `e2e/rc2-2-28-deterministic-audio.spec.ts:39`, `:84`: Guided Try has no course-direction seed, and `count()` is read without waiting, so the audio-gate contract can always skip.
- `e2e/review-continue-iphone.spec.ts:29`, `:106`, `:124`: a shared helper skips the whole file if the seeded item is a builder or has no options.
- `e2e/mobile-device.spec.ts:213`: if the service worker does not take control, the test skips even on Chromium.

Findings outside the four pattern names (listed under `nonPatternFindings`):
- **HIDDEN_SKIP: `scripts/validate-mastery-network-growth.mjs:66`.** A compile error is caught, the script prints "SKIP" and calls `process.exit(0)`. The validator is chained in `validate:beta`, so a broken compile passes. It should exit 1.
- LEGIT:
  - `test-create-account-hardening.mjs` is a manual live smoke that is not part of any chain.
  - The `release-artifacts` existence check in `rc2-2-16-gates.mjs` is conditional by design.
  - `set +e` in `android-build.yml` is used to assert exit 4.
  - `android-emulator-runtime.sh` uses `|| true` when collecting evidence.
- All `main().catch` handlers in `scripts/` exit non-zero.
