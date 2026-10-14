# Known issues — Final Pre-Beta RC2.3.13-RC1

## R2-PLAY-SIGNING-BLOCKED

**ID:** R2-PLAY-SIGNING-BLOCKED  
**Severity:** P1  
**Surface:** Play Closed Testing distribution  
**Reproducibility:** always until secrets configured  
**Workaround:** Owner QA sideload APK for physical certification  
**Beta blocker:** yes for `PLAY_CLOSED_BETA_ENTRY`  
**Status:** OPEN  
**Notes:** `BLOCKED_SIGNING_SECRETS`. See `PLAY_SIGNING_HANDOFF.md`. Debug AAB must not be uploaded as Play release.

## R2-PHYSICAL-QA-NOT-RUN

**ID:** R2-PHYSICAL-QA-NOT-RUN  
**Severity:** P1  
**Surface:** physical device  
**Reproducibility:** n/a  
**Workaround:** `OWNER_FINAL_PRE_BETA_RC_TEST.md` bound to APK SHA256  
**Beta blocker:** yes for `OWNER_QA_ENTRY=GO`  
**Status:** OPEN  

## R2-SENTRY-NOT-RUN

**ID:** R2-SENTRY-NOT-RUN  
**Severity:** P1  
**Surface:** observability  
**Beta blocker:** yes for GO  
**Status:** OPEN  

## R2-ROLLBACK-NOT-RUN

**ID:** R2-ROLLBACK-NOT-RUN  
**Severity:** P1  
**Surface:** Netlify  
**Beta blocker:** yes for GO  
**Status:** OPEN  

## R2-CLOUD-SMOKE-NOT-RUN

**ID:** R2-CLOUD-SMOKE-NOT-RUN  
**Severity:** P1  
**Surface:** cloud  
**Beta blocker:** yes for GO  
**Status:** OPEN  
**Notes:** Requires QA credentials / production URL; agent must not invent PASS.

## R2-ANDROID-OAUTH-NOT-RUN

**ID:** R2-ANDROID-OAUTH-NOT-RUN  
**Severity:** P1  
**Surface:** Android OAuth  
**Beta blocker:** yes for GO  
**Status:** OPEN  

## R2-E2E-IN-PROGRESS

**ID:** R2-E2E-IN-PROGRESS  
**Severity:** P2  
**Surface:** hosted CI  
**Beta blocker:** yes for full hosted closure  
**Status:** OPEN  
**Notes:** Chromium + cross-engine pending on CI run 37995329933 at reconciliation time. Do not mark PASS while IN_PROGRESS.

## R2-VIEWPORT-HOSTED-PENDING

**ID:** R2-VIEWPORT-HOSTED-PENDING  
**Severity:** P2  
**Surface:** 360/375/390 + large font hosted  
**Beta blocker:** yes for full typography hosted closure  
**Status:** OPEN

## R21-ANDROID-FOUNDATION-PEM-FIXTURE (REPAIRED)

**ID:** R21-ANDROID-FOUNDATION-PEM-FIXTURE  
**Severity:** P1 (was)  
**Surface:** hosted Android foundation / release-safety  
**Beta blocker:** no (fixed in R.2.1)  
**Status:** REPAIRED  
**Notes:** R.2 mutation fixture embedded contiguous PEM header; `validate:android-release-safety` correctly failed with SERVICE_ACCOUNT_COMMITTED. Fixture now built from fragments. Safety gate unchanged.

## R21-CONVERGENCE-OR-TRUE-FIXTURE (REPAIRED)

**ID:** R21-CONVERGENCE-OR-TRUE-FIXTURE  
**Severity:** P1 (was)  
**Surface:** CI release-truth / stack-convergence  
**Beta blocker:** no (fixed in R.2.1 follow-on)  
**Status:** REPAIRED  
**Notes:** R.2.1 `GATE_OR_TRUE` kill embedded contiguous shell-or-true; `CONVERGENCE_HIDDEN_SKIP`. Markers now joined from fragments. Convergence gate unchanged.

## R3-HOSTED-E2E-IN-PROGRESS

**ID:** R3-HOSTED-E2E-IN-PROGRESS  
**Severity:** P1  
**Surface:** #343 CI Chromium (+ WebKit/Firefox)  
**Beta blocker:** yes for starting physical certification  
**Status:** OPEN  
**Notes:** Exact HEAD `8811deca` run `38003599459`. Chromium **FAIL** — 120 failed / 951 passed. Clusters: (1) dual h1 on `/jornada` TEST_CONTRACT_STALE; (2) culture `N/30` vs path `N de M` TEST_CONTRACT_STALE; (3) multiple `aria-current=step` CURRENT nodes — likely PRODUCT_RUNTIME_REGRESSION; (4) conversation `Verificar` timeouts — PRODUCT_RUNTIME_REGRESSION or contract. Physical NOT started.

## R3-PHYSICAL-NOT-RUN

**ID:** R3-PHYSICAL-NOT-RUN  
**Severity:** P1  
**Surface:** real device  
**Beta blocker:** yes for `OWNER_QA_ENTRY=GO`  
**Status:** OPEN  

## R3-OPS-CREDENTIALS-UNSET

**ID:** R3-OPS-CREDENTIALS-UNSET  
**Severity:** P1  
**Surface:** Sentry / Netlify / cloud smoke  
**Beta blocker:** yes for `PLAY_CLOSED_BETA_ENTRY=GO`  
**Status:** OPEN  
**Notes:** Agent environment has no SENTRY_*/NETLIFY_*/SUPABASE_* credentials. Keep NOT_RUN until real evidence.

## R31-CANONICAL-EXERCISE-SKIP

**ID:** R31-CANONICAL-EXERCISE-SKIP  
**Severity:** P1  
**Surface:** lesson player / review mastery  
**Reproducibility:** always on `l14-char-rev` Recall recognize without `charId`; also name-collision substitution for learners named Ana  
**Workaround:** none — shows `EXERCÍCIO PULADO`  
**Beta blocker:** yes for Owner QA GO  
**Status:** CODE_FIXED_PENDING_PHYSICAL  
**Notes:** Fallback preserved; root cause fixed via charId + personalizeChoiceList. Zero-skip gate: `validate:canonical-activity-integrity`. Do not CLOSE until physical verification on new APK.

## R31-AUDIO-TRUNCATION

**ID:** R31-AUDIO-TRUNCATION  
**Severity:** P1  
**Surface:** dialogue / word / phrase audio  
**Beta blocker:** yes until physical Audio×20 on new APK  
**Status:** CODE_FIXED_PENDING_PHYSICAL  
**Notes:** Personalized mixed CJK+Latin was FIXED_CONTENT without asset → silent/degraded. Now PERSONAL_UTTERANCE → DYNAMIC TTS. `knownStaticAudioDefects=0` is code-only; `audioPhysicalVerification=NOT_RUN`.

## R31-PERSONALIZED-UTTERANCE-CUT

**ID:** R31-PERSONALIZED-UTTERANCE-CUT  
**Severity:** P1  
**Surface:** `我叫` + learnerName speech  
**Beta blocker:** yes  
**Status:** CODE_FIXED_PENDING_PHYSICAL  

## R31-VISUAL-REPETITION

**ID:** R31-VISUAL-REPETITION  
**Severity:** P2  
**Surface:** image_choice / compare_with_image  
**Beta blocker:** no for entry; must fix before Wave 1 when systematic  
**Status:** CODE_FIXED_PENDING_PHYSICAL  
**Notes:** `violatesImageRepeat` now covers authored + generated conceptIds.

## R31-DISTRACTOR-ANSWER-LEAKAGE

**ID:** R31-DISTRACTOR-ANSWER-LEAKAGE  
**Severity:** P2  
**Surface:** personalized MCQ (`我叫` + name unique among options)  
**Beta blocker:** no for entry; must fix before Wave 1 when systematic  
**Status:** CODE_FIXED_PENDING_PHYSICAL  
**Notes:** `repairNameOnlyAnswerLeak` + `nameCarryingDistractors` at personalize time.

## R31-MOBILE-ACTIVITY-FIT

**ID:** R31-MOBILE-ACTIVITY-FIT  
**Severity:** P1  
**Surface:** HanziBuilder @ 360×640  
**Beta blocker:** yes when required controls unreachable  
**Status:** CODE_FIXED_PENDING_PHYSICAL  
**Notes:** Compact canvas `max-h-[min(42svh,220px)]` + auto-compact ≤667px height.
