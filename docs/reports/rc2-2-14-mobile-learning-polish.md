# RC2.2.14 — Mobile focus, lesson reliability, Hànzì training, rewards & haptics

- Base: `origin/main` `0c5ad5ae` (#287). Branch: `claude/admiring-cray-4fx10i`. No PR opened, no merge (the owner opens the PR).
- Freeze: exception `RC2_2_14_MOBILE_LEARNING_POLISH_EXCEPTION`. Fingerprint `c48b008c9c1e` unchanged. Counts unchanged: 134 lessons, 113 topics, 30 CultureItems, 30 native, 20 nodes, 5 moments, 12 tone transfers, 52 scenes, 31 READY / 0 PARTIAL.
- Not touched: #273, the QA Supabase (longyu-preview), candidate/hashes/releaseCandidateSha, Supabase production. Username flag stays false.
- Physical device: **not run**. Every RC2.2.14 field in `docs/release/android-physical-qa.json` is `NOT_RUN`.

## 1. P0 / P1

| Id | Severity | Status | Summary |
|---|---|---|---|
| RC2214-P1-01 | P1 | **Fixed** | Lesson could stop advancing or skip a step: the session plan only locked if the adaptive planner finished while the learner was still on step 0. |
| RC2214-P1-02 | P1 | **Fixed** | Double tap on "Continuar" completed two steps (reproduced: cursor 3 → 5). |
| RC2214-P1-03 | P1 | **Fixed** | Same tap-through in Hànzì practice: the second tap of "Continuar treinando" answered the next round's first item. |
| RC2214-P1-04 | P1 | **Fixed** | Hànzì quizzes paid XP once per *distinct score* per day (`…:builder:${score}`), so up to 9 payouts a day (farming). |
| RC2214-P2-05 | P2 | **Fixed** | Two authored steps rendered the "exercício pulado" fallback because of `validateExercise` false positives (tone-sandhi choice in `p2-tons-nihao`; `fill_blank` with a question prompt in `p2-ma-primeiro-tom`). |
| RC2214-P2-06 | P2 | **Open — owner decision** | `l14-char-rev` mastery pass 1: 3 planner-generated `recognize` steps have no `charId`, so the learner sees 3 "exercício pulado" screens (Continuar works; nothing is stuck). The fix is in `lessonTasks.ts`, a CURRICULUM_SOURCE, which would move the frozen fingerprint. Listed as `KNOWN_BROKEN_PLANNED_STEPS`; any *new* broken step fails the gate. |

No P0 open.

## 2. Bug log — lesson not advancing (root cause)

1. **Plan lock race.** `LessonPlayer` renders the authored steps immediately, then swaps in the adaptive plan inside `startTransition`. The plan was only locked (`sessionPlanRef`) when that transition landed while `idx === 0`. On a slow phone the learner was already on step 1+, so the plan never locked. After that, every change to `learnedChars`, `learnedChunks`, `completedLessons` or `cultureKnowledgeById` rebuilt `authoredEnrichedSteps` mid-lesson. The same `idx:stepAttempt` key then pointed at different content (pairs remounted with new pairs), and removing the culture intro shifted indices. The result was a stuck or skipped step.
   **Fix:** lock the plan as soon as the authored plan is ready; never swap once `idx > 0` or the learner has touched the step (`stepInteractedRef`, traced as `plan_swap_skipped`).
2. **Weak identity.** The completion key and the StepRenderer key were `idx:stepAttempt` only. Both now include `stepIdentity(step)`, a content hash, so a different step at the same index never inherits the previous one's completion.
3. **Tap-through.** See P1-02 and P1-03. `useTapThroughGuard` drops a click that lands within 32px of the previous click and within 350ms of a new step/item mounting. A quick tap elsewhere still passes.
4. **Fail-safe.** If a step is still mounted 2s after `onDone`, StepRenderer re-offers the canonical "Continuar", re-sending the same completion. It never auto-skips. The DEV/E2E trace records `stalled` (0 occurrences in all runs).
5. **Trace.** `window.__longyuLessonTrace` exists only in DEV or fixture builds. It holds no PII and no answers: `lessonId, stepIndex, kind, attempt, event, at`.

## 3. StepKind advance contract

`src/lib/lessonStepContract.ts`: `STEP_ADVANCE_CONTRACT: Record<StepKind, …>` (a new StepKind without a contract does not compile). Each entry records `renderer`, `interaction`, `graded`, `completionSignal` and `retry`. The gate checks that the declared renderer is the one the StepRenderer switch uses for that kind.

## 4. StepKind progression matrix

| StepKind | renderer | interaction | graded | completion | retry | crawl | invalid | E2E correct | wrong | 2nd sample |
|---|---|---|---|---|---|---|---|---|---|---|
| intro | StepIntro | read | no | dialogue_complete | none | 271 | 0 | PASS | n/a | PASS |
| listen | StepListen | listen_speak | no | continue_button | none | 459 | 0 | PASS | n/a | PASS |
| tone | StepTone | tone_choice | yes | feedback_continue | player_modal | 159 | 0 | PASS | n/a | PASS |
| comprehend | StepComprehend | choice | yes | feedback_continue | player_modal | 422 | 0 | PASS | seen | PASS |
| produce | StepProduce | token_build | yes | feedback_continue | player_modal | 43 | 0 | PASS | seen | PASS |
| write | StepWrite | typing | yes | feedback_continue | player_modal | 42 | 0 | PASS | seen | PASS |
| recognize | StepRecognize | choice | yes | feedback_continue | player_modal | 152 | 3 | PASS | seen | PASS |
| decompose | StepDecompose | read | no | continue_button | none | 40 | 0 | PASS | n/a | PASS |
| flashcard | StepFlashcard | read | no | continue_button | none | 245 | 0 | PASS | n/a | PASS |
| microread | StepMicroread | read | no | continue_button | none | 6 | 0 | PASS | n/a | PASS |
| match_pairs | StepMatchPairs | pairs | yes | feedback_continue | player_modal | 100 | 0 | PASS | seen | PASS |
| listen_select | StepListenSelect | audio_choice | yes | feedback_continue | player_modal | 393 | 0 | PASS | seen | PASS |
| sentence_build | StepSentenceBuild | token_build | yes | feedback_continue | player_modal | 437 | 0 | PASS | seen | PASS |
| translation_build | StepTranslationBuild | token_build | yes | feedback_continue | player_modal | 11 | 0 | PASS | seen | PASS |
| fill_blank | StepFillBlank | choice | yes | feedback_continue | player_modal | 361 | 0 | PASS | seen | PASS |
| dialogue_choice | StepDialogueChoice | choice | yes | feedback_continue | player_modal | 471 | 0 | PASS | seen | PASS |
| conversation_scene | ConversationSceneStep | conversation | yes | scene_complete | in_component | 429 | 0 | PASS | seen (solve) | PASS |
| hanzi_evolution | StepHanziEvolution | read | no | continue_button | none | 1 | 0 | PASS | n/a | PASS |
| hanzi_build | StepHanziBuild | hanzi_build | yes | builder_correct | in_component | 137 | 0 | PASS | n/a | PASS |
| tone_pair | StepTonePair | pairs | yes | feedback_continue | player_modal | 11 | 0 | PASS | seen | PASS |
| image_choice | StepImageChoice | image_choice | yes | feedback_continue | player_modal | 335 | 0 | PASS | seen | PASS |
| compare_with_image | StepCompareWithImage | image_choice | yes | feedback_continue | player_modal | 9 | 0 | PASS | seen | PASS |
| audio_discrimination | StepAudioDiscrimination | audio_choice | yes | feedback_continue | player_modal | 34 | 0 | PASS | seen | PASS |
| dictation | StepDictation | token_build | yes | feedback_continue | player_modal | 35 | 0 | PASS | n/a | PASS |
| odd_one_out | StepOddOneOut | choice | yes | feedback_continue | player_modal | 29 | 0 | PASS | seen | PASS |
| spot_error | StepSpotError | choice | yes | feedback_continue | player_modal | 38 | 0 | PASS | seen | PASS |
| free_production | StepFreeProduction | speech_or_typing | yes | feedback_continue | player_modal | 307 | 0 | PASS | seen | PASS |
| transfer_task | StepFreeProduction | speech_or_typing | yes | feedback_continue | player_modal | 17 | 0 | PASS | seen | PASS |
| conversation_repair | StepConversationRepair | choice | yes | feedback_continue | player_modal | 89 | 0 | PASS | seen | PASS |
| contextual_choice | StepDialogueChoice | choice | yes | feedback_continue | player_modal | 135 | 0 | PASS | seen | PASS |
| audio_to_action | StepListenSelect | audio_choice | yes | feedback_continue | player_modal | 41 | 0 | PASS | seen | PASS |
| sentence_transform | StepSentenceBuild | token_build | yes | feedback_continue | player_modal | 30 | 0 | PASS | seen | PASS |
| substitution_drill | StepDialogueChoice|StepFillBlank | choice | yes | feedback_continue | player_modal | 19 | 0 | PASS | seen | PASS |
| dialogue_completion | StepDialogueChoice | choice | yes | feedback_continue | player_modal | 53 | 0 | PASS | seen | PASS |
| reverse_recall | StepFreeProduction | speech_or_typing | yes | feedback_continue | player_modal | 153 | 0 | PASS | seen | PASS |
| map_direction | StepMapDirection | map | yes | feedback_continue | player_modal | 17 | 0 | PASS | seen | PASS |
| place_label | StepDialogueChoice | choice | yes | feedback_continue | player_modal | 20 | 0 | PASS | seen | PASS |
| address_build | StepAddressBuild | token_build | yes | feedback_continue | player_modal | 4 | 0 | PASS | seen | PASS |
| city_context | StepDialogueChoice | choice | yes | feedback_continue | player_modal | 21 | 0 | PASS | seen | PASS |
| sign_reading | StepDialogueChoice | choice | yes | feedback_continue | player_modal | 14 | 0 | PASS | seen | PASS |
| menu_reading | StepDialogueChoice | choice | yes | feedback_continue | player_modal | 3 | 0 | PASS | seen | PASS |
| price_task | StepDialogueChoice | choice | yes | feedback_continue | player_modal | 7 | 0 | PASS | seen | PASS |
| route_sequence | StepAddressBuild | token_build | yes | feedback_continue | player_modal | 7 | 0 | PASS | seen | PASS |
| schedule_reading | StepDialogueChoice | choice | yes | feedback_continue | player_modal | 1 | 0 | PASS | seen | PASS |

Total: 44 StepKinds, 5608 steps crawled across 134 lessons, 3 invalid (the 3 known l14-char-rev steps; see P2-06). E2E: 44/44 correct path, 44/44 second sample.

Columns:
- **crawl**: steps in the 134 lessons, authored + every mastery pass (the plan the player receives).
- **invalid**: `validateExercise` failures after `materializeRuntimeStep`.
- **E2E correct**: the real StepRenderer completes on the correct path (`/qa/step-lab`).
- **wrong**: a deliberate wrong answer is recorded (`onMistake` or `onDone(false)`) and a remount answers again. `n/a` means the sample is not graded (reading/guided) or the kind corrects inside the component (builder, scene).
- **2nd sample**: two samples of the same kind in a row both complete (the completion latch does not leak).

## 5. Player-level E2E (`e2e/lesson-player-advance.spec.ts`)

- The first 4 lessons walk end to end. Each completion moves the cursor exactly +1, `completed` equals `advanced` + `finished`, and the trace has 0 `stalled`.
- Double tap on "Continuar": the cursor never advances twice. This test failed before the fix (3 → 5).
- Wrong answer → "Tentar de novo" remounts the same step, then it advances.
- Background/foreground keeps the cursor; reload opens a valid step that still has an exit.
- Font scale 100/130/150% at 360×740: no horizontal scroll, and the main action is reachable.

## 6. Mobile landing (A–I)

- The Android app always gets `MobileWelcome`; the web gets it below `lg`.
- Header: `--app-safe-top` and 🐉 Longyu. The first 2.2.14 commit had a "🌐 PT-BR" language sheet here. **RC2.2.14B removed it**: the interface now follows the system language, and the course is chosen on `/curso`. See `docs/reports/rc2-2-14b-locale-course-direction.md`.
- Order: dragon → short promise → **"Fazer teste guiado · 2 min"** → discreet "Já tenho uma conta".
- Out of the first fold: the 4 benefit cards, the long BetaNotice, the theme toggle (now in Settings › Aparência) and the footer. Legal links and the version stay below the fold.
- Desktop keeps the two-column landing and adds a guided-try link.
- E2E: 5 viewports (360×740, 360×800, 390×844, 412×915, 432×960) confirm the first fold holds everything above and none of the removed items, and that the landing has no language control (RC2.2.14B).

## 7. Guided Mandarin Try (J–P)

- `/teste-guiado` has 5 micro-steps built from Lesson 1 data (`chunkById.nihao`, `charById.ni/hao/nv/zi`): hear 你好 → 你 + 好 → question → pinyin/tones (nǐ hǎo → ní hǎo) → build 好 = 女 + 子.
- End screen: "O que você acabou de aprender" and "Criar conta e continuar" (→ `/comecar`).
- Since RC2.2.14B, `/teste-guiado` needs a chosen course; without one it redirects to `/curso`. Teaching copy follows the course, and the chrome follows the interface language.
- It is not Placement and writes nothing. The E2E checks `localStorage` before and after: no account, completion, XP, streak or SRS.
- Haptics: light on selection/piece, success on correct and finish (Android only).

## 8. Hànzì hub and training (AD–AV)

- `/ideogramas` is the hub: "Treinar agora" with the recommended mode (the first one not yet trained today) above the fold, then a 2-column grid of the six existing modes (the whole card is tappable), Atlas as a secondary row and the Pro lab at the bottom. When locked, the hub shows the real unlock reason (after `l5-rev`).
- `/hanzi?mode=…` is the training session: focus mode (AppShell hides TopBar and TabBar), rounds of at most 8, "1/8" progress, a compact builder (canvas `min(76vw, 260px)`, E2E-measured between 220 and 280px), pieces close to the canvas, Verificar docked above the safe area and no nested cards. "Continuar treinando" opens the next round.
- `/hanzi/atlas` is the Atlas.

## 9. Practice rewards — evidence (AW–BF, CQ–CS)

- XP goes only through the existing `addXp`, via `grantPracticeRoundXp(roundKey, 6)`.
- The key is `hanzi-practice:<account>:<mode>:<day>:<n>`, stored in `dailyTasks.practiceRewardKeys`.
- At most 3 paid rounds per mode per day. The 4th says "Treino extra … sem XP" and pays 0.
- E2E (`practice-reward-integrity.spec.ts`), meaning mode, all answers correct: rounds 1–3 → +6 XP each (+18 total, 3 keys); round 4 → `data-practice-xp=0` plus the capped notice. A double tap on "Continuar treinando" opens one round and answers nothing.
- Missions appear only if their progress moved during the round (before/after `buildMissionViews`).
- Pérolas appear only if a `PEARL_HANZI_MILESTONES` milestone was actually claimed. Practice does not change `learnedChars`, so in practice this is 0.
- SRS: "N respostas entraram na sua revisão espaçada", a real count.
- `RewardReveal` is reused (animation 320ms per item, staggered; off under reduced motion). No new currency, economy or reward engine.

## 10. Haptics — evidence (BG–DG)

| Event | Pattern | Where |
|---|---|---|
| selection / piecePlaced / pieceRemoved | impact Light | guided try, Hanzi builder |
| answerCorrect / lessonComplete / practiceComplete | notification Success | lesson player, Hànzì, guided try |
| answerWrong / blocked | notification Warning | lesson player, Hànzì, guided try |
| achievementReveal / streakMilestone / chestOpen | impact Medium | AchievementsWatcher (`hapticOnce` per id), StreakWatcher, ChestRewardModal |

- Single adapter `src/lib/platform/nativeHaptics.ts` (`@capacitor/haptics` 8.0.2); the plugin adds `VIBRATE`, which is on the allowlist.
- The web is a no-op (no `navigator.vibrate`); calls are fire-and-forget and swallow errors.
- Budget: one vibration per gesture (120ms window; only a strictly heavier event overrides).
- Never on buttons, navigation, scroll or audio (the gate forbids imports in primitives/TabBar/TopBar/nav/Sidebar/SpeakButton/tts/soundFx).
- Sound and haptics are independent.
- Preference `hapticsEnabled` (default on), toggled in Settings › Som e vibração › **Vibração** — "Feedback tátil em respostas e conquistas." — shown on Android only.
- Physical intensity: **NOT_RUN** (needs a device).

## 11. Mobile Settings (BS–CE)

- `/config` on phones is a 7-row index: Conta, Aprendizagem, Som e vibração, Notificações, Aparência, Privacidade, Avançado. Rows are ≥ 56px.
- Each row opens `/config/<categoria>` with a minimal header and SmartBack back to the index.
- Old anchors (`/config#sons`, …) redirect to their category.
- Desktop keeps the single page.
- The sound-test grid and diagnostics moved to Avançado.
- Same sections as before; no new Settings system.

## 12. Home / Journey / header (CF–CM)

- The primary learning card is above the fold (review lives inside that card; culture sits in the path).
- Header: 56px after the safe inset. Stat pills are now at least 48×48, and the Journey mission chip is 48px tall (it was 31px). Mobile side padding is 12px.

## 13. Lesson top bar (DJ–DN)

- The stage line shows only "Etapa X/Y" (the round summary and question counter are gone).
- Compact conversation cast: 44px avatars on mobile; the inactive speaker dims only the avatar, and the name uses `text-ink-soft` (it had 45% opacity on the whole block).
- Font scale is covered in §5.

## 14. Validators (7 pairs) and gate

`npm run gate:rc2-2-14-mobile-learning-polish` is part of `validate:beta`, `android-build.yml` and `android-release.yml`.

| Pair | Mutations |
|---|---|
| mobile-landing-focus | DY1–DY9 (9) |
| guided-learning-try | DZ9–DZ15 (7) |
| lesson-step-progression (crawler over 134 lessons × passes) | EA16–EA30 (15) |
| hanzi-mobile-focus | EB26–EB35 (10) |
| practice-reward-integrity | EC36–EC42 (7) |
| native-haptics | ED41–ED48 (8) |
| mobile-settings-density | ED49–ED55 (7) |
| **Total** | **63** |

## 15. E2E added

- `lesson-step-progression.spec.ts` (44 kinds)
- `lesson-player-advance.spec.ts`
- `mobile-landing-focus.spec.ts`
- `guided-learning-try.spec.ts`
- `hanzi-mobile-focus.spec.ts`
- `practice-reward-integrity.spec.ts`
- `mobile-settings-density.spec.ts`
- `rc2-2-14-screenshots.spec.ts` (screenshot pack, `SHOT_PACK=1`)

The QA-only page `/qa/step-lab` (behind `QaFastPathGate`) renders the real StepRenderer per kind.

## 16. Existing tests updated (intended behaviour change)

- `smoke.spec.ts` (mobile 360): the mobile landing's primary CTA is now the guided try.
- `mobile-device.spec.ts`: a tap on the guided try opens `/teste-guiado`.
- `rc2-2-13-gates.mjs`: Settings may render `NativeSettingsSections` per category (`parts`), provided permissions, notifications and audio are all still present.

## 17. Screenshots (before = `0c5ad5ae`, after = this branch)

`docs/reports/rc2-2-14-screenshots/{before,after}/`:
- landing, hanzi-hub, settings and hanzi-builder at the 5 viewports;
- lesson-stage at 390×844;
- guided-try at 390×844 (after only).

## 18. Physical QA manifest

- Added fields, all `NOT_RUN`: `hapticsEnabled`, `hapticSelection`, `hapticCorrect`, `hapticWrong`, `hapticCompletion`, `hapticAchievement`, `landingMobile`, `guidedTry`, `lessonProgression`, `hanziHub`, `hanziBuilder`, `mobileSettings`, `haptics`, `practiceRewards`.
- New risk `ANDROID_HAPTICS_UNVERIFIED`.
- `formalPass` stays false.

## 19. Freeze and invariants

- No new lessons, topics, CultureItems, StepKind, SRS/mastery rule, currency, economy, reward engine, Hànzì engine or Settings system.
- The TabBar still has 5 items and Culture stays in it.
- No Firebase and no exact alarms.

## 20. Global regression

<!-- REGRESSION -->

## 21. Android

`npx cap sync android` ran with `@capacitor/haptics` (it appears in `capacitor.settings.gradle` / `capacitor.build.gradle`). The last sync on this branch produced no Android diff. `android-build.yml` runs on PR, on push to `main` and on `workflow_dispatch`. It now also runs `gate:rc2-2-14-mobile-learning-polish`, and it will run when the owner opens the PR.

## 22. Honest blockers

- Physical device QA (haptic intensity, safe-area on real notches, landing on the Android app) is **NOT_RUN**.
- P2-06 (`l14-char-rev` pass 1) needs an owner decision because it moves the fingerprint.
- Cloud (#273) is untouched and still deferred.

## 23. Not done / out of scope

- No haptic on generic taps, navigation, scroll or audio (by design).
- No XP for the guided try.
- No new achievements.
- No change to the Journey order beyond touch targets: the primary card was already first above the fold.

## 24. How to reproduce

```
npm run gate:rc2-2-14-mobile-learning-polish
VITE_APP_ENV=preview VITE_USE_TEST_FIXTURES=true VITE_ALLOW_PRO_PREVIEW=true VITE_DEV_ALLOW_LOCAL_AUTH=1 npm run build
npx vite preview --host 127.0.0.1 --port 4173 &
npx playwright test e2e/lesson-step-progression.spec.ts e2e/lesson-player-advance.spec.ts \
  e2e/mobile-landing-focus.spec.ts e2e/guided-learning-try.spec.ts e2e/hanzi-mobile-focus.spec.ts \
  e2e/practice-reward-integrity.spec.ts e2e/mobile-settings-density.spec.ts --project=chromium
```

## 25. Files

- **Contract, trace and guard:** `src/lib/lessonStepContract.ts`, `lessonStepTrace.ts`, `useTapThroughGuard.ts`.
- **Haptics:** `src/lib/haptics.ts`, `src/lib/platform/nativeHaptics.ts`.
- **Hànzì rounds and layout hook:** `src/lib/hanziPracticeRounds.ts`, `src/lib/useWideLayout.ts`.
- **Landing:** `src/features/landing/{MobileWelcome,GuidedTryPage}.tsx`.
- **Hànzì:** `src/features/hanzi/{HanziTrainingSession.tsx,hanziTrainingModes.ts}`, `src/components/hanzi/PracticeCompletion.tsx`.
- **Settings:** `src/features/settings/settingsCategories.ts`.
- **QA:** `src/features/qa/QaStepLabPage.tsx`.
- **Gates:** `scripts/lib/rc2-2-14-{gates,step-crawl}.mjs`, `scripts/rc2-2-14-mobile-learning-polish.mjs`.
