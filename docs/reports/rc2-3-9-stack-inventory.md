# RC2.3.9 — Stack inventory (#308–#319)

Generated from `8a1b7633a79b48516b279529348deaedce0ac8cd` (= #319 head) at 2026-10-07T18:04:11Z. origin/main = `d6339330df5e19dddc8a8977015fc7cc8bb5620d`. Machine-readable twin: `docs/release/rc2-stack-chain.json`.

Method: GitHub REST pulls/{n} for refs/SHAs/state/bodies; git diff <base>..<head> per wave (for #314 the effective parent #313 head 6d6a410 is used); journey fingerprint recomputed per head from CURRICULUM_SOURCES (scripts/lib/report-meta.mjs algorithm) via git show; typed records parsed from src/lib/curriculumFreeze.ts at each head.

## Waves

| PR | Title | Branch | Base ref | Parent PR | Parent SHA (GitHub base) | Head SHA | State | Fingerprint (before -> after) |
|---|---|---|---|---|---|---|---|---|
| #308 | RC2.2.31D: corrigir preparo do teste Android em emulador | `codex/rc2-2-31d-android-ci-closure` | `main` | null | `3eb7df133f` | `6df59ebf1d` | merged | `c48b008c9c1e` -> `c48b008c9c1e` |
| #309 | RC2.2.32 — Canonical Voice, Speech UX, Guidance Delivery & Sensory Consistency | `cursor/rc2-2-32-voice-speech-guidance-25db` | `main` | null | `d6339330df` | `f8662ed784` | open (draft) | `c48b008c9c1e` -> `c48b008c9c1e` |
| #310 | RC2.3.0 — Pedagogy V6: Discovery, Progressive Mastery & Perceptual Variety | `cursor/rc2-3-0-pedagogy-v6-25db` | `cursor/rc2-2-32-voice-speech-guidance-25db` | #309 | `f8662ed784` | `ba00438c4b` | open (draft) | `c48b008c9c1e` -> `99cbc002710c` (advance: RC2_3_0_PEDAGOGY_V6_CONTENT_EXCEPTION) |
| #311 | RC2.3.1 — Visual First: Curriculum-Wide Visual Learning & Context Scenes | `cursor/rc2-3-1-visual-first-25db` | `cursor/rc2-3-0-pedagogy-v6-25db` | #310 | `ba00438c4b` | `26de55bfe4` | open (draft) | `99cbc002710c` -> `c3861b5fb65f` (advance: RC2_3_1_VISUAL_FIRST_CONTENT_EXCEPTION) |
| #312 | RC2.3.2 — Human & Everyday Mandarin: Real-Life Context, Conversation & Transfer | `cursor/rc2-3-2-human-everyday-mandarin-25db` | `cursor/rc2-3-1-visual-first-25db` | #311 | `26de55bfe4` | `6fdb661c84` | open (draft) | `c3861b5fb65f` -> `e566a250c5a6` (advance: RC2_3_2_HUMAN_EVERYDAY_CONTENT_EXCEPTION) |
| #313 | RC2.3.3 — Culture Deep Journey: Stories, Context, Decisions & Cultural Mastery | `cursor/rc2-3-3-culture-deep-journey-25db` | `cursor/rc2-3-2-human-everyday-mandarin-25db` | #312 | `6fdb661c84` | `6d6a4101b4` | open (draft) | `e566a250c5a6` -> `e566a250c5a6` |
| #314 | RC2.3.4 — Hànzì Progressive Writing: Components, Tracing & Memory Production | `cursor/rc2-3-4-hanzi-progressive-writing-25db` | `main` | null (expected #313) | `d6339330df` | `9819607ba9` | open (draft) | `e566a250c5a6` -> `5a64821d0b7d` (advance: RC2_3_4_CI_BUDGET_CORRECTION (plus no-advance RC2_3_4_HANZI_WRITING_CONTENT_EXCEPTION)) |
| #315 | RC2.3.4A — Hànzì Truth, Release Baseline & Free-Tier Launch Guardrails | `claude/quirky-sagan-vzpuaa` | `cursor/rc2-3-4-hanzi-progressive-writing-25db` | #314 | `9819607ba9` | `080dc63aba` | open (draft) | `5a64821d0b7d` -> `5a64821d0b7d` |
| #316 | RC2.3.5 — Speech, Contrast Training & Non-Blocking Pronunciation | `cursor/rc2-3-5-speech-contrast` | `claude/quirky-sagan-vzpuaa` | #315 | `080dc63aba` | `764325c667` | open (draft) | `5a64821d0b7d` -> `5a64821d0b7d` |
| #317 | RC2.3.6 — Learner Evidence Record, Personal Mastery & Knowledge Graph Foundation | `cursor/rc2-3-6-personal-mastery` | `cursor/rc2-3-5-speech-contrast` | #316 | `764325c667` | `8f43a9d481` | open (draft) | `5a64821d0b7d` -> `5a64821d0b7d` |
| #318 | RC2.3.7 — Sensory, Guidance & Completion Polish | `cursor/rc2-3-7-sensory-guidance-polish` | `cursor/rc2-3-6-personal-mastery` | #317 | `8f43a9d481` | `f31e4b782e` | open (draft) | `5a64821d0b7d` -> `5a64821d0b7d` |
| #319 | RC2.3.8 — Account Access, Social Identity & Progress Claim | `cursor/rc2-3-8-account-access-identity` | `cursor/rc2-3-7-sensory-guidance-polish` | #318 | `f31e4b782e` | `8a1b7633a7` | open (draft) | `5a64821d0b7d` -> `5a64821d0b7d` |

## Per-wave detail

### #308 — RC2.2.31D: corrigir preparo do teste Android em emulador

- **Domain:** Android CI closure for the merged RC2.2.20–RC2.2.31D Closed Beta stack (emulator test completes course selection before Guided Try proof).
- **Diff range used:** `3eb7df133f..6df59ebf1d`
- **New architecture:** RC2.2.20–RC2.2.31D Closed Beta stack (physical beta readiness, native stability, deterministic audio, Media3/LongyuMedia, conversation runtime, Android runtime proof); Emulator instrumented WebView tests (ANDROID_BUILD_PASS separated from ANDROID_EMULATOR_RUNTIME_PASS)
- **Canonical modules:** `UNKNOWN (2294-file squash; see docs/reports/rc2-2-31d-apk-runtime-proof.md)`
- **Gates introduced:** `gate:rc2-2-20-physical-beta-readiness`, `gate:rc2-2-21-mobile-native-stability`, `gate:rc2-2-22-closed-beta-candidate`, `gate:rc2-2-23-product-convergence`, `gate:rc2-2-24-android-learning-parity`, `gate:rc2-2-17b-guided-journey-parity`, `gate:rc2-2-25-product-experience-closure`, `gate:rc2-2-26-android-physical-closure`, `gate:rc2-2-27-android-tts-root-cause`, `gate:rc2-2-28-deterministic-audio`, `gate:rc2-2-29-launch-convergence`, `gate:rc2-2-30-closed-beta-entry`, `gate:rc2-2-31-android-runtime-closure`, `gate:rc2-2-31b-android-runtime-final`, `gate:rc2-2-31c-android-runtime-root-cause`, `gate:rc2-2-31d-apk-runtime-proof` — _gate:* only (validate:/test: omitted: very large squash range 3eb7df1..6df59eb)_
- **Reports introduced:** `docs/release/rc2-2-31d-android-runtime-bugs.json`, `docs/release/rc2-2-31d-base.json`, `docs/release/rc2-2-31d-physical-matrix.json`, `docs/reports/rc2-2-31d-apk-runtime-proof.md`, `(+95 other docs/reports|release files from RC2.2.20–RC2.2.31C squash)`
- **Fingerprint:** live at head `c48b008c9c1e` (declared `c48b008c9c1e`); advanced: NO. RC2_2_31D_APK_RUNTIME_PROOF_EXCEPTION carries literal fingerprint a91d31d0c0de without previousFingerprint (not a typed advance; live was c48b008c9c1e). Already listed as anomaly in docs/reports/rc2-3-4a-stack-truth.json.
- **Owner actions:** Owner physical proof NOT_RUN; Closed Beta release decision blocked until physical proof
- **Physical/device actions:** Owner device runtime proof of Guided Try / native player (NOT_RUN)
- **External configuration:** NONE stated
- **Superseded behavior:** Android emulator test that assumed Guided Try was visible before course selection

### #309 — RC2.2.32 — Canonical Voice, Speech UX, Guidance Delivery & Sensory Consistency

- **Domain:** RC2.2.32 canonical voice, speech UX, guidance delivery and sensory consistency.
- **Diff range used:** `d6339330df..f8662ed784`
- **New architecture:** FIXED_CONTENT audio order asset -> native player -> explicit DEGRADED (no silent TTS fallback); All learner surfaces routed through playMandarinAudio; Pedagogical inline tips outside the global popup budget; Event -> visual/sound/haptic sensory matrix; Conversation integrity inspector
- **Canonical modules:** `src/lib/audio/voiceConsistency.ts`, `src/lib/audioContrastPairs.ts`, `src/lib/conversationIntegrity.ts`, `src/lib/pedagogicalInlineGuidance.ts`, `src/lib/sensoryFeedbackMatrix.ts`, `src/components/guidance/PedagogicalInlineTip.tsx`
- **Gates introduced:** `validate:rc232-voice-consistency`, `test:rc232-voice-consistency`, `validate:rc232-speech-experience`, `test:rc232-speech-experience`, `validate:rc232-guidance-delivery`, `test:rc232-guidance-delivery`, `validate:rc232-sensory-feedback`, `test:rc232-sensory-feedback`, `validate:rc232-conversation-integrity`, `test:rc232-conversation-integrity`, `validate:rc232-physical-truth`, `test:rc232-physical-truth`, `test:rc232-unit`, `gate:rc2-2-32`
- **Reports introduced:** `docs/release/rc2-2-32-physical-matrix.json`, `docs/reports/rc2-2-32-closure.md`, `docs/reports/rc2-2-32-conversation-integrity.md`, `docs/reports/rc2-2-32-guidance-physical-contract.md`, `docs/reports/rc2-2-32-sensory-feedback.md`, `docs/reports/rc2-2-32-speech-experience.md`, `docs/reports/rc2-2-32-voice-consistency.md`
- **Fingerprint:** live at head `c48b008c9c1e` (declared `c48b008c9c1e`); advanced: NO
- **Owner actions:** Physical owner checklist docs/release/rc2-2-32-physical-matrix.json (PHYSICAL_OWNER_PASS NOT_RUN)
- **Physical/device actions:** Android APK run (NOT_RUN); All physical-matrix items (NOT_RUN)
- **External configuration:** NONE
- **Superseded behavior:** Silent FIXED_CONTENT fallback to Android/Web TTS; Raw speak() calls in Tone Trainer, Lesson steps, Immersion, Pinyin Lab, gloss, arcade, capsules; Inline pedagogical tips consuming the global popup budget; Technical recognition-failure copy for learners

### #310 — RC2.3.0 — Pedagogy V6: Discovery, Progressive Mastery & Perceptual Variety

- **Domain:** RC2.3.0 Pedagogy V6: discovery stage, progressive mastery budgets, perceptual variety.
- **Diff range used:** `f8662ed784..ba00438c4b`
- **New architecture:** Discovery stage + hasLearnerBeenTaught / TeachingMoment; Graded mastery pass budgets (P1 7-9, P2 8-11, P3 10-13, P4 12-15); Perceptual repetition saturation + diversifyPerceptualSession; Universal activity quality contract; Early visual pilot + VISUAL_SUPPORT_MISSING; Human-context classifier; Local no-PII pedagogy telemetry; applyPedagogyV6 orchestration in LessonPlayer
- **Canonical modules:** `src/lib/pedagogyV6/discovery.ts`, `src/lib/pedagogyV6/perceptualRepetition.ts`, `src/lib/pedagogyV6/activityContract.ts`, `src/lib/pedagogyV6/earlyVisual.ts`, `src/lib/pedagogyV6/humanContext.ts`, `src/lib/pedagogyV6/telemetry.ts`, `src/lib/pedagogyV6/applyPedagogyV6.ts`, `src/lib/pedagogyV6/index.ts`
- **Gates introduced:** `validate:rc230-discovery-stage`, `test:rc230-discovery-stage`, `validate:rc230-progressive-mastery`, `test:rc230-progressive-mastery`, `validate:rc230-perceptual-repetition`, `test:rc230-perceptual-repetition`, `validate:rc230-early-visual`, `test:rc230-early-visual`, `validate:rc230-human-context`, `test:rc230-human-context`, `validate:rc230-activity-contract`, `test:rc230-activity-contract`, `validate:rc230-first20-closure`, `test:rc230-first20-closure`, `gate:rc2-3-0-pedagogy-v6`
- **Reports introduced:** `docs/release/rc2-3-0-pedagogy-matrix.json`, `docs/reports/rc2-3-0-discovery-stage.md`, `docs/reports/rc2-3-0-early-visual-learning.md`, `docs/reports/rc2-3-0-first-20-v6.json`, `docs/reports/rc2-3-0-first-20-v6.md`, `docs/reports/rc2-3-0-human-context-pilot.md`, `docs/reports/rc2-3-0-pedagogy-v6-closure.md`, `docs/reports/rc2-3-0-perceptual-repetition.md`, `docs/reports/rc2-3-0-progressive-mastery.md`
- **Fingerprint:** live at head `99cbc002710c` (declared `99cbc002710c`); advanced: YES via `RC2_3_0_PEDAGOGY_V6_CONTENT_EXCEPTION`
- **Owner actions:** OWNER_PEDAGOGICAL_ACCEPTANCE (NOT_RUN)
- **Physical/device actions:** APK_PASS (NOT_RUN)
- **External configuration:** NONE
- **Superseded behavior:** Previous flat mastery pass budget (replaced by graded 7-15 budget); Edited docs/release/rc2-candidate.json (later restored to main freeze by #311)

### #311 — RC2.3.1 — Visual First: Curriculum-Wide Visual Learning & Context Scenes

- **Domain:** RC2.3.1 Visual First: curriculum-wide visual learning and pedagogical context scenes.
- **Diff range used:** `ba00438c4b..26de55bfe4`
- **New architecture:** resolveCurriculumVisual + applyVisualFirstToPlan; Mandatory first-exposure visual for concrete concepts; image_choice/distractor expansion per pass; 10 reusable pedagogical context scenes; Visual scaffold by mastery pass; Hanzi visual prep API; Device QA Visual First panel
- **Canonical modules:** `src/lib/visualFirst/resolveCurriculumVisual.ts`, `src/lib/visualFirst/applyVisualFirst.ts`, `src/lib/visualFirst/firstExposure.ts`, `src/lib/visualFirst/contextScenes.ts`, `src/lib/visualFirst/masteryVisualScaffold.ts`, `src/lib/visualFirst/hanziVisualPrep.ts`, `src/lib/visualFirst/classify.ts`, `src/lib/visualFirst/index.ts`, `src/features/qa/VisualFirstQaPanel.tsx`
- **Gates introduced:** `validate:rc231-visual-engine`, `test:rc231-visual-engine`, `validate:rc231-visual-audit`, `test:rc231-visual-audit`, `validate:rc231-visual-closure`, `test:rc231-visual-closure`, `gate:rc2-3-1-visual-first`
- **Reports introduced:** `docs/release/rc2-3-1-visual-matrix.json`, `docs/reports/rc2-3-1-first-20-visual.json`, `docs/reports/rc2-3-1-first-20-visual.md`, `docs/reports/rc2-3-1-full-visual-coverage.json`, `docs/reports/rc2-3-1-visual-curriculum-audit.json`, `docs/reports/rc2-3-1-visual-curriculum-audit.md`, `docs/reports/rc2-3-1-visual-first-closure.md`, `docs/reports/rc2-3-1-visual-performance.md`
- **Fingerprint:** live at head `c3861b5fb65f` (declared `c3861b5fb65f`); advanced: YES via `RC2_3_1_VISUAL_FIRST_CONTENT_EXCEPTION`
- **Owner actions:** OWNER_VISUAL_ACCEPTANCE (NOT_RUN)
- **Physical/device actions:** APK_PASS (NOT_RUN)
- **External configuration:** NONE
- **Superseded behavior:** EARLY_VISUAL_CONCRETE pilot set (9) replaced by curriculum resolver over visualVocabulary; #310 edit to docs/release/rc2-candidate.json reverted to main freeze hash (#273 NOT_TOUCHED)

### #312 — RC2.3.2 — Human & Everyday Mandarin: Real-Life Context, Conversation & Transfer

- **Domain:** RC2.3.2 Human & Everyday Mandarin: real-life situations, micro-dialogues, production/transfer per pass.
- **Diff range used:** `26de55bfe4..6fdb661c84`
- **New architecture:** EverydayIntent metadata on LessonStep; EVERYDAY_SCENARIOS bank (14) with per-pass evolution; applyEverydayMandarinToPlan (annotate/humanize/inject); TARGET vs CONTEXTUAL_REUSE in perceptual repetition; Invariant MATRIX_STATUS_MUST_MATCH_AUDIT; Device QA Everyday Mandarin panel
- **Canonical modules:** `src/lib/everydayMandarin/intents.ts`, `src/lib/everydayMandarin/scenarios.ts`, `src/lib/everydayMandarin/applyEverydayMandarin.ts`, `src/lib/everydayMandarin/quality.ts`, `src/lib/everydayMandarin/index.ts`, `src/features/qa/EverydayMandarinQaPanel.tsx`
- **Gates introduced:** `validate:rc232-everyday-engine`, `test:rc232-everyday-engine`, `validate:rc232-everyday-audit`, `test:rc232-everyday-audit`, `validate:rc232-everyday-closure`, `test:rc232-everyday-closure`, `gate:rc2-3-2-human-everyday`, `validate:culture-deep`, `test:culture-deep`, `test:culture-deep-flow`, `gate:rc2-3-3-culture-deep` — _culture-deep scripts (incl. gate:rc2-3-3-culture-deep) appear in #312's package.json diff, ahead of #313; package.json overrides also gains braces 3.0.3_
- **Reports introduced:** `docs/release/rc2-3-2-human-everyday-matrix.json`, `docs/release/security-audit-allowlist.json`, `docs/reports/rc2-3-2-communicative-outcomes.json`, `docs/reports/rc2-3-2-everyday-curriculum-map.json`, `docs/reports/rc2-3-2-everyday-curriculum-map.md`, `docs/reports/rc2-3-2-first-20-human.json`, `docs/reports/rc2-3-2-first-20-human.md`, `docs/reports/rc2-3-2-human-everyday-closure.md`
- **Fingerprint:** live at head `e566a250c5a6` (declared `e566a250c5a6`); advanced: YES via `RC2_3_2_HUMAN_EVERYDAY_CONTENT_EXCEPTION`
- **Owner actions:** OWNER_HUMAN_ACCEPTANCE (NOT_RUN)
- **Physical/device actions:** ANDROID_BUILD_PASS / APK_PASS (NOT_RUN)
- **External configuration:** NONE
- **Superseded behavior:** #311 first-exposure audit (covered=0/missing=19 while matrix said YES) corrected to covered=20/missing=0

### #313 — RC2.3.3 — Culture Deep Journey: Stories, Context, Decisions & Cultural Mastery

- **Domain:** RC2.3.3 Culture Deep Journey: deeper Culture Atlas (30 items) with stories, moment/deep modes and editorial gates.
- **Diff range used:** `6fdb661c84..6d6a4101b4`
- **New architecture:** CultureDeepContract + Moment/Deep modes; 9 FLAGSHIP_DEEP items; Editorial gates; EverydayIntent bridges to CultureItems; CultureVisualId registry; Device QA Culture Deep panel
- **Canonical modules:** `src/lib/cultureDeep/contract.ts`, `src/lib/cultureDeep/modes.ts`, `src/lib/cultureDeep/gates.ts`, `src/lib/cultureDeep/audit.ts`, `src/lib/cultureDeep/everydayBridge.ts`, `src/lib/cultureDeep/outcomes.ts`, `src/lib/cultureDeep/visuals.ts`, `src/lib/cultureDeep/index.ts`, `src/features/culture/CultureKindBadge.tsx`, `src/features/culture/CultureMayVary.tsx`, `src/features/culture/CultureWhyMore.tsx`, `src/features/qa/CultureDeepQaPanel.tsx`
- **Gates introduced:** NONE — _No package.json gate script added in 6fdb661..6d6a410 (culture-deep scripts were already added in #312's diff)_
- **Reports introduced:** `docs/release/rc2-3-3-culture-deep-matrix.json`, `docs/reports/rc2-3-3-culture-deep-closure.md`, `docs/reports/rc2-3-3-culture-depth-audit.json`, `docs/reports/rc2-3-3-culture-depth-audit.md`, `docs/reports/rc2-3-3-culture-editorial-audit.md`, `docs/reports/rc2-3-3-culture-gates.md`, `docs/reports/rc2-3-3-culture-human-validation.md`, `docs/reports/rc2-3-3-culture-journey-integration.md`, `docs/reports/rc2-3-3-source-integrity.md`
- **Fingerprint:** live at head `e566a250c5a6` (declared `e566a250c5a6`); advanced: NO; record: RC2_3_3_CULTURE_DEEP_CONTENT_EXCEPTION (no-advance record)
- **Owner actions:** OWNER_CULTURE_ACCEPTANCE (NOT_RUN)
- **Physical/device actions:** APK (NOT_RUN)
- **External configuration:** NONE
- **Superseded behavior:** Journey culture return now preserves from/gate/cultureDone (src=jornada -> /jornada contract kept)

### #314 — RC2.3.4 — Hànzì Progressive Writing: Components, Tracing & Memory Production

- **Domain:** RC2.3.4 Hanzi progressive writing: recognize -> components -> assemble -> complete -> trace -> memory write -> context use.
- **Diff range used:** `6d6a4101b4..9819607ba9`
- **New architecture:** HanziLearningStage + Pedagogy V6 pass mapping; Verified HandwritingReference set (11 chars), HANDWRITING_DATA_REQUIRED elsewhere; BUILDER_GEOMETRY_NOT_GRADING_SOURCE; Local trace engine + memory write canvas; Writing metadata as runtime overlay (LessonStepWithWriting); Form evidence channels separate from meaning; Mastery pass budget correction (bonus reservation); Merge restoring #308 stack ancestry (251f231, tree unchanged)
- **Canonical modules:** `src/lib/hanziWriting/*.ts (applyWriting, audit, booster, contract, curriculumLeak, evidence, gates, geometry, handwritingReference, references/verifiedWave1, reviewHints, stages, types, index)`, `src/features/hanzi/writing/HanziWritingCanvas.tsx`, `src/features/hanzi/writing/HanziWritingExercise.tsx`, `src/features/hanzi/writing/HanziWritingLab.tsx`, `src/features/qa/HanziWritingQaPanel.tsx`
- **Gates introduced:** `test:hanzi-writing-geometry`, `test:hanzi-writing-pointer`, `test:topic-mastery-depth` — _Computed vs #313 head 6d6a410 (GitHub base is main). validate:topic-mastery-depth modified. Freeze record cited gate:rc2-3-4-hanzi-writing, which did not exist at this head (created in #315)._
- **Reports introduced:** `docs/release/rc2-3-4-hanzi-writing-matrix.json`, `docs/reports/rc2-3-4-early-hanzi-progression.md`, `docs/reports/rc2-3-4-handwriting-coverage.json`, `docs/reports/rc2-3-4-handwriting-data.md`, `docs/reports/rc2-3-4-hanzi-progressive-writing-closure.md`, `docs/reports/rc2-3-4-hanzi-system-audit.json`, `docs/reports/rc2-3-4-hanzi-system-audit.md`
- **Fingerprint:** live at head `5a64821d0b7d` (declared `5a64821d0b7d`); advanced: YES via `RC2_3_4_CI_BUDGET_CORRECTION (plus no-advance RC2_3_4_HANZI_WRITING_CONTENT_EXCEPTION)`
- **Owner actions:** OWNER_HANZI_ACCEPTANCE (NOT_RUN)
- **Physical/device actions:** APK_PASS (NOT_RUN); Handwriting on real touch device
- **External configuration:** NONE
- **Superseded behavior:** Lab 'Em breve' for core writing; Previous mastery pass selection that did not reserve bonus / capability-closure steps

### #315 — RC2.3.4A — Hànzì Truth, Release Baseline & Free-Tier Launch Guardrails

- **Domain:** RC2.3.4A Hanzi truth, typed fingerprint chain, release baseline and free-tier launch guardrails.
- **Diff range used:** `9819607ba9..080dc63aba`
- **New architecture:** Hanzi pedagogical eligibility states NOT_INTRODUCED -> ... -> PRODUCTION_ELIGIBLE from canonical taught sources; Typed EXPECTED_FINGERPRINT_ADVANCE chain validator (scripts/lib/fingerprint-chain.mjs); Free-tier guardrails (70/85/95% thresholds, no paid overage from env, email dedup, Jev timeout/circuit breaker); CI job rc2-3-stack-gates running gate:rc2-3-0..rc2-3-3; Jev beta feedback triage (Supabase function triage-feedback + migration); Platform budget registry
- **Canonical modules:** `src/lib/hanziWriting/introductions.ts`, `src/lib/hanziWriting/curriculumLeak.ts (rewritten)`, `scripts/lib/fingerprint-chain.mjs`, `supabase/functions/_shared/budgetPolicy.ts`, `supabase/functions/_shared/jev.ts`, `supabase/functions/triage-feedback/index.ts`
- **Gates introduced:** `validate:hanzi-writing-eligibility`, `test:hanzi-writing-eligibility`, `test:fingerprint-chain`, `gate:rc2-3-4-hanzi-writing`, `test:free-tier-guardrails` — _validate:beta modified_
- **Reports introduced:** `docs/launch/ROADMAP.md`, `docs/launch/free-tier-guardrails.md`, `docs/launch/platform-budget-registry.json`, `docs/launch/platform-responsibility-map.md`, `docs/launch/rc2-3-4a-cloud-free-tier-audit.md`, `docs/reports/rc2-3-4a-closure.md`, `docs/reports/rc2-3-4a-hanzi-eligibility.md`, `docs/reports/rc2-3-4a-hanzi-physical-acceptance.md`, `docs/reports/rc2-3-4a-stack-truth.json`, `docs/reports/rc2-3-4a-stack-truth.md`
- **Fingerprint:** live at head `5a64821d0b7d` (declared `5a64821d0b7d`); advanced: NO
- **Owner actions:** OWNER_PHYSICAL_PASS for Hanzi (checklist in rc2-3-4a-hanzi-physical-acceptance.md); Resend: no domain (OWNER_ACTION_REQUIRED); Before first prod migration: reconcile migration history (35 prod vs 52 repo), schema diff, data export, telemetry retention; Paid-tier decision for 5,000+ MAU (deferred)
- **Physical/device actions:** OWNER_PHYSICAL_PASS (NOT_RUN); APK on device (parent build only)
- **External configuration:** Supabase Vault TYPESAFE_API_KEY (stored earlier in session); Netlify production deploys only on [release]/[deploy] commits; Sentry project/SDK absent (NOT_RUN); Stripe test mode only
- **Superseded behavior:** Fixed literal c48b008c9c1e in validate:release-candidate; Informal 木/人 writing allowlist; #314 CURRICULUM_LEAK_PASS: PASS claim; #314 rewrite of V4.11A.3 note in rc1-operational-checks.json (restored); Inherited RC2.3.0 E2E failures (teach-before-test fixes 8a06040, 080dc63)

### #316 — RC2.3.5 — Speech, Contrast Training & Non-Blocking Pronunciation

- **Domain:** RC2.3.5 speech, contrast training and non-blocking pronunciation.
- **Diff range used:** `080dc63aba..764325c667`
- **New architecture:** Single speech architecture, multiple modes (no new recorder/player/recognizer); 68 same-voice contrast pairs (46 tone / 17 initial / 5 final); ASR fallback ladder ending in 'continue without speaking'; Count-only speechEvidence (no audio/transcript/score); Speech pilot (8 items)
- **Canonical modules:** `src/lib/speechEvidence.ts`, `src/lib/speechPilot.ts`
- **Gates introduced:** `validate:rc2-3-5-speech`, `test:rc2-3-5-speech`, `gate:rc2-3-5-speech` — _validate:beta modified (gate added to it)_
- **Reports introduced:** `docs/reports/rc2-3-5-closure.md`, `docs/reports/rc2-3-5-contrast-library.json`, `docs/reports/rc2-3-5-contrast-library.md`, `docs/reports/rc2-3-5-device-acceptance.md`, `docs/reports/rc2-3-5-parent-hosted-truth.md`, `docs/reports/rc2-3-5-speech-evidence-contract.md`, `docs/reports/rc2-3-5-speech-system-truth.md`
- **Fingerprint:** live at head `5a64821d0b7d` (declared `5a64821d0b7d`); advanced: NO
- **Owner actions:** OWNER_AUDIO_ACCEPTANCE (NOT_RUN; checklist docs/reports/rc2-3-5-device-acceptance.md); Fixed-speech assets for missing families b/p, d/t, r/l, u/ü, an/ang, en/eng, in/ing, ian/iang
- **Physical/device actions:** Real-device mic/ASR/torture matrix; APK (NOT_RUN)
- **External configuration:** NONE
- **Superseded behavior:** Pinyin Lab comparisons with one silent side; Journey initial/final pairs that also changed tone (8 audio_discrimination steps removed, 136 -> 128); Two RC2.2.32 contrast seeds retired

### #317 — RC2.3.6 — Learner Evidence Record, Personal Mastery & Knowledge Graph Foundation

- **Domain:** RC2.3.6 Learner Evidence Record, Personal Mastery and knowledge graph foundation.
- **Diff range used:** `764325c667..8f43a9d481`
- **New architecture:** Local-first Learner Evidence Record (24 evidence kinds, idempotent ids); Evidence adapters for Journey/review/speech/Hanzi/culture; Deterministic knowledge graph (966 targets, 4048 relations); Competency + PersonalMastery API with explainTargetState; /dominio 'Seu Dominio' page + 'Praticar o que preciso' queue; Device QA Personal Mastery panel
- **Canonical modules:** `src/lib/mastery/evidence.ts`, `src/lib/mastery/adapters.ts`, `src/lib/mastery/recorder.ts`, `src/lib/mastery/knowledgeGraph.ts`, `src/lib/mastery/competency.ts`, `src/lib/mastery/personalMastery.ts`, `src/lib/mastery/practiceQueue.ts`, `src/features/dominio/DominioPage.tsx`, `src/features/dominio/useLearnerMastery.ts`, `src/features/qa/PersonalMasteryQaPanel.tsx`
- **Gates introduced:** `validate:rc2-3-6-personal-mastery`, `test:rc2-3-6-personal-mastery`, `gate:rc2-3-6-personal-mastery` — _validate:beta modified_
- **Reports introduced:** `docs/reports/rc2-3-6-closure.md`, `docs/reports/rc2-3-6-evidence-source-audit.json`, `docs/reports/rc2-3-6-evidence-source-audit.md`, `docs/reports/rc2-3-6-jev-evidence-audit.cache.json`, `docs/reports/rc2-3-6-jev-evidence-audit.json`, `docs/reports/rc2-3-6-jev-evidence-audit.plan.json`, `docs/reports/rc2-3-6-jev-integration.md`, `docs/reports/rc2-3-6-knowledge-graph-foundation.md`, `docs/reports/rc2-3-6-learner-evidence-record.md`, `docs/reports/rc2-3-6-parent-hosted-truth.md`, `docs/reports/rc2-3-6-personal-mastery-qa.md`, `docs/reports/rc2-3-6-personal-mastery.json`
- **Fingerprint:** live at head `5a64821d0b7d` (declared `5a64821d0b7d`); advanced: NO
- **Owner actions:** OWNER_MASTERY_ACCEPTANCE (OWNER_ACTION_REQUIRED, 20-item checklist rc2-3-6-personal-mastery-qa.md); Human review of 4 Jev DEV_AUDIT disagreements
- **Physical/device actions:** Android build on this head (NOT_RUN at PR time)
- **External configuration:** Jev LIVE server-side feedback triage (key in Supabase Vault); JEV_RUNTIME_ENABLED=false in learner runtime
- **Superseded behavior:** Lesson-end dimension update no longer used as evidence

### #318 — RC2.3.7 — Sensory, Guidance & Completion Polish

- **Domain:** RC2.3.7 sensory, guidance and completion polish.
- **Diff range used:** `8f43a9d481..f31e4b782e`
- **New architecture:** Pure hapticPolicy / sfxPolicy / sensoryPolicy applied by players; Audio owner state suppressing UI sounds during recording/model playback; Completion 'Voce aprendeu' on every lesson result + one-time Firme/Consolidado line; First-use tips for Seu Dominio / Praticar; Sensory QA panel
- **Canonical modules:** `src/lib/hapticPolicy.ts`, `src/lib/sfxPolicy.ts`, `src/lib/sensoryPolicy.ts`, `src/lib/sensoryLog.ts`, `src/lib/audioOwnerState.ts`, `src/features/qa/SensoryQaPanel.tsx`
- **Gates introduced:** `validate:rc2-3-7-sensory-guidance`, `test:rc2-3-7-sensory-guidance`, `gate:rc2-3-7-sensory-guidance` — _validate:beta modified_
- **Reports introduced:** `docs/reports/rc2-3-7-closure.md`, `docs/reports/rc2-3-7-copy-audit.md`, `docs/reports/rc2-3-7-guidance-audit.md`, `docs/reports/rc2-3-7-jev-copy-audit.cache.json`, `docs/reports/rc2-3-7-jev-copy-audit.json`, `docs/reports/rc2-3-7-jev-copy-audit.plan.json`, `docs/reports/rc2-3-7-owner-ux-acceptance.md`, `docs/reports/rc2-3-7-parent-hosted-truth.md`, `docs/reports/rc2-3-7-sensory-audit.md`, `docs/reports/rc2-3-7-surface-polish-audit.json`, `docs/reports/rc2-3-7-surface-polish-audit.md`
- **Fingerprint:** live at head `5a64821d0b7d` (declared `5a64821d0b7d`); advanced: NO
- **Owner actions:** OWNER_UX_ACCEPTANCE (OWNER_ACTION_REQUIRED, docs/reports/rc2-3-7-owner-ux-acceptance.md); Human review of 7 Jev copy REVIEW flags
- **Physical/device actions:** Haptics/sound on real device; Android build on this head (NOT_RUN at PR time)
- **External configuration:** NONE
- **Superseded behavior:** Stacked double vibration on lesson-ending answer; Decorative tap sounds (piece removal, 'Tentar de novo'); Course-confirm haptic as 'correct answer'; Wrong-answer label 'Errado' -> 'Quase'; Obsolete guidance surfaces /treino/tons and /tons (fixed in 5df0d1f per #319)

### #319 — RC2.3.8 — Account Access, Social Identity & Progress Claim

- **Domain:** RC2.3.8 account access, social identity (Google/Apple/Microsoft OAuth) and local progress claim.
- **Diff range used:** `f31e4b782e..8a1b7633a7`
- **New architecture:** Provider registry gated by VITE_AUTH_PROVIDERS; Single PKCE callback router /auth/callback with redirect allowlist + safeReturnTo; Single-flight + hashed code ledger, 20 s timeout watchdog; Android deep link longyu.noba.com://auth/callback (cold/warm start); Idempotent progress claim with per-field economy policy and evidence merge by stable id; Account-scoped storage namespaces local / cloud:<uid>; linkIdentity-based access methods; Typed AuthError + safe auth telemetry; Auth QA panel
- **Canonical modules:** `src/lib/auth/providers.ts`, `src/lib/auth/providerConfig.ts`, `src/lib/auth/oauthRedirect.ts`, `src/lib/auth/oauthState.ts`, `src/lib/auth/progressClaim.ts`, `src/lib/auth/evidenceClaim.ts`, `src/lib/auth/authError.ts`, `src/lib/accountStorage.ts`, `src/lib/accountStorageBinding.ts`, `src/lib/platform/nativeAuthBrowser.ts`, `src/services/oauthService.ts`, `src/features/auth/OAuthCallbackPage.tsx`, `src/components/auth/SocialAuthButtons.tsx`, `src/components/auth/AccessMethodsCard.tsx`, `src/features/qa/AuthQaPanel.tsx`
- **Gates introduced:** `validate:rc2-3-8-auth-identity`, `test:rc2-3-8-auth-identity`, `gate:rc2-3-8-auth-identity` — _validate:beta modified_
- **Reports introduced:** `docs/reports/rc2-3-8-auth-system-truth.md`, `docs/reports/rc2-3-8-closure.md`, `docs/reports/rc2-3-8-deep-link.md`, `docs/reports/rc2-3-8-identity-linking.md`, `docs/reports/rc2-3-8-owner-actions.md`, `docs/reports/rc2-3-8-parent-hosted-truth.md`, `docs/reports/rc2-3-8-progress-claim.md`, `docs/reports/rc2-3-8-provider-matrix.md`, `docs/reports/rc2-3-8-security.md`, `docs/reports/rc2-3-8-storage-isolation.md`, `docs/roadmap/lab-b-struggle-aware-guidance.md`
- **Fingerprint:** live at head `5a64821d0b7d` (declared `5a64821d0b7d`); advanced: NO
- **Owner actions:** OWNER_AUTH_ACCEPTANCE (checklist rc2-3-8-closure.md); Owner setup steps in rc2-3-8-owner-actions.md
- **Physical/device actions:** Android OAuth deep link cold/warm start on real device (not yet tested)
- **External configuration:** Google Cloud Console OAuth client; Apple Developer Sign in with Apple; Microsoft Entra app registration; Enable Google/Apple/Microsoft providers in Supabase Auth (all disabled at read-only check); Supabase redirect URL allowlist incl. longyu.noba.com://auth/callback; Supabase manual identity linking switch; Build env VITE_AUTH_PROVIDERS
- **Superseded behavior:** Unscoped legacy local storage keys (one-time migration to local / cloud:<uid>); E-mail as identity key (Supabase User ID canonical)

## Chain validation

| Check | Status | Detail |
|---|---|---|
| Cycle | PASS | Base-ref graph is linear: main <- 309 <- 310 <- 311 <- 312 <- 313; main <- 314 <- 315 <- 316 <- 317 <- 318 <- 319. #308 merged (squash d6339330 on main). |
| Missing parent | PASS | Every non-main baseRef resolves to the head branch of another PR in the set; every head SHA is fetchable. |
| Unexpected main fork | BLOCKED | #314 targets `main` but is stacked on #313. #314 head contains #313 head 6d6a410 (merge-base --is-ancestor OK); 121 commits over main vs 6 own commits + 1 ancestry merge (251f231) + #308 history over #313; its own body and docs/release/rc2-3-4-hanzi-writing-matrix.json name #313 / 6d6a410 as parent. |
| Unrecorded fingerprint advance | PASS | Live fingerprint per head: 309 c48b008c9c1e, 310 99cbc002710c, 311 c3861b5fb65f, 312-313 e566a250c5a6, 314-319 5a64821d0b7d; declared RC_BASE_FINGERPRINT equals live at every head; each advance has a typed record present at the head that introduced it (RC2_3_0, RC2_3_1, RC2_3_2, RC2_3_4_CI_BUDGET_CORRECTION); chain c48b->99cb->c386->e566->5a64 is linear. |
| Stale parents | PASS | NONE. For every child, GitHub base sha == parent's current head sha, and merge-base --is-ancestor <parentHead> <childHead> holds for all 10 edges (310..319, with #314 checked against #313 head). Parent SHAs cited in PR bodies (#316: 0b3c85e, #317: 37d547f, #318: 7c1e339, #319: 5df0d1f) are older but all are ancestors of the current parent head, so bodies are stale text only. |

**BLOCKED — #314 fork from main.** Impact: GitHub diff for #314 shows #309-#313 content; merging #314 first would land #309-#313 into main unreviewed as part of #314. Fix: Retarget #314 base to cursor/rc2-3-3-culture-deep-journey-25db (PATCH /repos/matstangherlin/longyu/pulls/314 base=...). No rebase needed: 6d6a410 is already an ancestor of 9819607.

Note: Non-advance record RC2_2_31D_APK_RUNTIME_PROOF_EXCEPTION carries literal a91d31d0c0de (inherited from main/#308; not a typed advance; already flagged in rc2-3-4a-stack-truth.json).

## Safe merge order (Prompt 45)

Preconditions:
- Retarget #314 base to cursor/rc2-3-3-culture-deep-journey-25db
- Mark each PR ready for review (all 11 open PRs are draft)
- Hosted CI green on each head before its merge

Already merged: #308 (squash `d6339330` = current origin/main).

Order: #309 -> #310 -> #311 -> #312 -> #313 -> #314 -> #315 -> #316 -> #317 -> #318 -> #319

Strategy: Merge bottom-up with merge commits (not squash) so each child keeps its parent ancestry. If squash is used, after each merge retarget the next PR to main and merge origin/main into its branch (the #308 squash already required an ancestry-restoring merge, 251f231).

## Cumulative diff truth vs origin/main (Prompt 46)

Final head `8a1b7633a79b48516b279529348deaedce0ac8cd` vs origin/main `d6339330df5e19dddc8a8977015fc7cc8bb5620d`.

Method: For each wave N (range base..head; #314 uses #313 head), every changed path was compared by blob id at the final #319 head with (a) origin/main and (b) the wave's own base: equal => change undone. Files added by a wave were checked for presence at final. For src/scripts/e2e/package.json/.github, added lines (>12 chars) were tested for survival in the final file (flag <60%), and flagged files were inspected with git log. Generated reports: 'Hash da Jornada' provenance and *fingerprint* fields in stack-touched docs JSON were compared to the live fingerprint 5a64821d0b7d.

| ID | Kind | Severity | Path(s) | Detail |
|---|---|---|---|---|
| CD1 | INTENTIONAL_RESTORE | INFO | docs/release/rc2-candidate.json | Changed by #310, restored to main's frozen blob 10f693e by #311 (#273 NOT_TOUCHED). Final equals main by design; not an accidental revert. |
| CD2 | ACCIDENTAL_REVERT | NONE | — | No other wave-changed path is equal to main or to its wave base at the final head; no file added by a wave is missing at the final head. |
| CD3 | SUPERSEDED_LITERAL | INFO | scripts/test-rc2-candidate-config.mjs | Fingerprint literal advanced by #310/#311/#312 and finally 5a64821d0b7d (d2f9319, #314). Expected follow-the-chain churn. |
| CD4 | INTENTIONAL_REWRITE | INFO | src/lib/hanziWriting/curriculumLeak.ts | 48% of #314 lines replaced by #315 (3cf7b53) eligibility contract, which superseded the informal 木/人 allowlist. |
| CD5 | PARENT_FIX_LOST_THEN_RESTORED | RESOLVED | docs/release/rc1-operational-checks.json | d2f9319 (#314) rewrote the V4.11A.3 history note; #315 (267cb5b) restored it with the historical fingerprint 516692632525. No lost parent fix remains. |
| CD6 | CONFLICTING_HISTORICAL_REPORT | LOW | docs/release/rc2-3-4-hanzi-writing-matrix.json | Still states CURRICULUM_LEAK_PASS: PASS with no superseded marker, while docs/reports/rc2-3-4a-stack-truth.md says that claim was not true (fixed by #315 eligibility). Suggest adding a supersededBy note. |
| CD7 | CONFLICTING_HISTORICAL_REPORT | LOW | docs/release/rc2-3-0-pedagogy-matrix.json, docs/release/rc2-3-1-visual-matrix.json, docs/release/rc2-3-2-human-everyday-matrix.json, docs/release/rc2-3-3-culture-deep-matrix.json | Per-wave matrices had curriculumFingerprint rewritten to the live 5a64821d0b7d by later waves, so they no longer record the wave's own result. rc2-3-1 matrix previousFingerprint was changed by #312 from 99cbc002710c to c3861b5fb65f, contradicting typed record RC2_3_1 (99cbc002710c -> c3861b5fb65f). |
| CD8 | STALE_GENERATED_FILE | NONE | — | All 6 provenance-stamped reports touched by the stack carry Hash da Jornada 5a64821d0b7d. 14 older stamped reports carry earlier hashes but are byte-identical to origin/main (pre-existing archival reports, not introduced by the stack). |
| CD9 | PR_BODY_STALE_PARENT_SHA | INFO | — | #316/#317/#318/#319 bodies cite earlier parent SHAs; all are ancestors of the current parent head (no code staleness). |

Summary: accidentally reverted files **NONE**; lost parent fixes **NONE** (one lost-then-restored, CD5); conflicting historical reports **2 (CD6, CD7, low severity)**; stale generated files introduced by the stack **NONE**.
