# RC2.3.9 — Owner Acceptance Convergence

Machine-readable: [`../release/owner-acceptance.json`](../release/owner-acceptance.json) · owner actions: [`../release/owner-actions.json`](../release/owner-actions.json)

Statuses: PASS · CODE_READY · ACCOUNT_VERIFIED · CONFIG_REQUIRED · OWNER_ACTION_REQUIRED · NOT_RUN · BLOCKED · PAID_PLAN_REQUIRED.

## What changed

From RC2.2.12 to RC2.3.8, every wave wrote its own owner/physical checklist. They repeat each other. For example, "Guided Try audio on a cold start" appears in eight matrices. Nearly all of them are still `NOT_RUN`. RC2.3.9 replaces them with **one device matrix**. Each flow appears once and lists every checklist it replaces. Historical files are kept unchanged as evidence; none was edited.

| | Before | After |
|---|---|---|
| Owner/physical checklists | **27** (+4 RC2.3.8 contract docs referenced, no checkbox items) | **1** (`owner-acceptance.json` → `deviceMatrix`) |
| Checklist items | **588** | **28** unique flows |
| Areas | one per wave (pedagogy, visual, everyday, culture, Hànzì, speech, mastery, UX, auth, Android…) | 5: `audio`, `hanzi`, `ux`, `auth`, `android` |
| Viewports | repeated per wave | each flow: 360×640 · 375×667 · 390×844 (web/emulation). Real device always `OWNER_ACTION_REQUIRED` |
| Owner action lists | `rc2-2-20-owner-actions.json` (20) + `rc2-3-8-owner-actions.md` (6 sections) + scattered "next action" cells | `owner-actions.json` — **31** actions |

How items were counted: markdown `- [ ]` boxes, numbered device-checklist steps, torture-matrix rows, owner-script rows, `ownerChecklist` arrays, and physical checks still `NOT_RUN`/`FAIL` in the JSON matrices. `CODE_READY` rows in matrices are not counted. RC2.2.29 and RC2.2.30 carry the same 28 inherited checks, and both copies are counted. That duplication is exactly what this wave removes.

## Truth carried over (not promoted)

- **Owner physical acceptance: `NOT_RUN` for every area and every flow.** No report from RC2.2.20 to RC2.3.8 shows the owner running a checklist on the current build.
- The owner *did* run earlier APKs, and those runs **failed**: Guided Try audio, conversation continue and sequential audio on PR #303/#305 builds, and `ANDROID_TTS_HEARD_BUT_UI_NOT_ACKNOWLEDGED` reproduced in RC2.2.26/27. Logout discoverability also failed in RC2.2.25. These are kept as `priorOwnerObservation` on DM-06/DM-07. The RC2.2.31B–D code fixes were never re-run by the owner.
- Web/E2E PASS, emulator PASS and "APK generated" never promote `realDevice` or `ownerPhysical`.
- Social sign-in flows (DM-19, DM-20) are `CONFIG_REQUIRED`: Google/Apple/Microsoft are disabled in Supabase. Play install (DM-27) is `BLOCKED` on the upload key and Play identity owner actions.

## Area status

| Area | Status | Owner physical | Flows |
|---|---|---|---|
| audio | OWNER_ACTION_REQUIRED | NOT_RUN | DM-06, DM-07, DM-08, DM-09, DM-10 |
| hanzi | OWNER_ACTION_REQUIRED | NOT_RUN | DM-11 |
| ux | OWNER_ACTION_REQUIRED | NOT_RUN | DM-02, DM-03, DM-04, DM-05, DM-12, DM-13, DM-14, DM-15, DM-16, DM-17, DM-25, DM-26 |
| auth | CONFIG_REQUIRED | NOT_RUN | DM-18, DM-19, DM-20, DM-21 |
| android | OWNER_ACTION_REQUIRED | NOT_RUN | DM-01, DM-22, DM-23, DM-24, DM-27, DM-28 |

## Unique flows (after)

| Flow | Area | Sources replaced | Protects | Status |
|---|---|---|---|---|
| DM-01-CLEAN-INSTALL | android | 11 | ACCOUNT_ISOLATION, LESSON_PROGRESSION_NON_BLOCKING | OWNER_ACTION_REQUIRED |
| DM-02-ONBOARDING | ux | 2 | LESSON_PROGRESSION_NON_BLOCKING, TEACH_BEFORE_TEST | OWNER_ACTION_REQUIRED |
| DM-03-FIRST-LESSON | ux | 5 | TEACH_BEFORE_TEST, LESSON_PROGRESSION_NON_BLOCKING, CURRICULUM_LEAK | OWNER_ACTION_REQUIRED |
| DM-04-PEDAGOGY-ROUNDS | ux | 3 | TEACH_BEFORE_TEST, CURRICULUM_LEAK | OWNER_ACTION_REQUIRED |
| DM-05-VISUAL-FIRST | ux | 2 | TEACH_BEFORE_TEST, FIXED_SPEECH_CANONICAL_VOICE | OWNER_ACTION_REQUIRED |
| DM-06-CANONICAL-AUDIO | audio | 15 | FIXED_SPEECH_CANONICAL_VOICE, LESSON_PROGRESSION_NON_BLOCKING | OWNER_ACTION_REQUIRED |
| DM-07-CONVERSATION | audio | 13 | LESSON_PROGRESSION_NON_BLOCKING, FIXED_SPEECH_CANONICAL_VOICE | OWNER_ACTION_REQUIRED |
| DM-08-CONTRAST-LISTENING | audio | 2 | FIXED_SPEECH_CANONICAL_VOICE, TEACH_BEFORE_TEST | OWNER_ACTION_REQUIRED |
| DM-09-SPEECH-RECORD-COMPARE | audio | 15 | SPEECH_TECHNICAL_FAILURE_NON_PENALTY, FIXED_SPEECH_CANONICAL_VOICE, LESSON_PROGRESSION_NON_BLOCKING, PERSONAL_MASTERY_EVIDENCE_SEMANTICS | OWNER_ACTION_REQUIRED |
| DM-10-PRACTICE-SURFACES | audio | 8 | FIXED_SPEECH_CANONICAL_VOICE, LESSON_PROGRESSION_NON_BLOCKING | OWNER_ACTION_REQUIRED |
| DM-11-HANZI-WRITING | hanzi | 6 | HANZI_WRITING_ELIGIBILITY, CURRICULUM_LEAK, TEACH_BEFORE_TEST, PERSONAL_MASTERY_EVIDENCE_SEMANTICS | OWNER_ACTION_REQUIRED |
| DM-12-CULTURE | ux | 7 | CURRICULUM_LEAK, FIXED_SPEECH_CANONICAL_VOICE, LESSON_PROGRESSION_NON_BLOCKING | OWNER_ACTION_REQUIRED |
| DM-13-REVIEW | ux | 7 | CURRICULUM_LEAK | OWNER_ACTION_REQUIRED |
| DM-14-PERSONAL-MASTERY (Seu Domínio) | ux | 2 | PERSONAL_MASTERY_EVIDENCE_SEMANTICS, CURRICULUM_LEAK, SPEECH_TECHNICAL_FAILURE_NON_PENALTY, LESSON_PROGRESSION_NON_BLOCKING | OWNER_ACTION_REQUIRED |
| DM-15-ANSWER-FEEDBACK-SENSORY | ux | 6 | FIXED_SPEECH_CANONICAL_VOICE | OWNER_ACTION_REQUIRED |
| DM-16-GUIDANCE | ux | 10 | LESSON_PROGRESSION_NON_BLOCKING | OWNER_ACTION_REQUIRED |
| DM-17-LESSON-COMPLETION | ux | 10 | LESSON_PROGRESSION_NON_BLOCKING, PERSONAL_MASTERY_EVIDENCE_SEMANTICS | OWNER_ACTION_REQUIRED |
| DM-18-EMAIL-AUTH-LOGOUT-LOGIN | auth | 10 | ACCOUNT_ISOLATION, ENTITLEMENT_SERVER_AUTHORITY | OWNER_ACTION_REQUIRED |
| DM-19-SOCIAL-SIGN-IN | auth | 3 | OAUTH_REDIRECT_SAFETY, ACCOUNT_ISOLATION | CONFIG_REQUIRED |
| DM-20-ANDROID-OAUTH-DEEP-LINK | auth | 3 | OAUTH_REDIRECT_SAFETY, ACCOUNT_ISOLATION | CONFIG_REQUIRED |
| DM-21-PROGRESS-CLAIM | auth | 2 | PROGRESS_CLAIM_LOSSLESS, ACCOUNT_ISOLATION, ENTITLEMENT_SERVER_AUTHORITY, PERSONAL_MASTERY_EVIDENCE_SEMANTICS | OWNER_ACTION_REQUIRED |
| DM-22-ANDROID-BACK | android | 5 | LESSON_PROGRESSION_NON_BLOCKING, OAUTH_REDIRECT_SAFETY | OWNER_ACTION_REQUIRED |
| DM-23-OFFLINE | android | 7 | LESSON_PROGRESSION_NON_BLOCKING, PROGRESS_CLAIM_LOSSLESS, SPEECH_TECHNICAL_FAILURE_NON_PENALTY | OWNER_ACTION_REQUIRED |
| DM-24-RESUME-LIFECYCLE | android | 5 | LESSON_PROGRESSION_NON_BLOCKING, SPEECH_TECHNICAL_FAILURE_NON_PENALTY, PROGRESS_CLAIM_LOSSLESS | OWNER_ACTION_REQUIRED |
| DM-25-LAYOUT-A11Y | ux | 13 | LESSON_PROGRESSION_NON_BLOCKING | OWNER_ACTION_REQUIRED |
| DM-26-FREE-USE-ENTITLEMENT | ux | 5 | ENTITLEMENT_SERVER_AUTHORITY, LESSON_PROGRESSION_NON_BLOCKING | OWNER_ACTION_REQUIRED |
| DM-27-PLAY-INSTALL-UPDATE | android | 3 | PROGRESS_CLAIM_LOSSLESS, ACCOUNT_ISOLATION | BLOCKED |
| DM-28-NOTIFICATIONS | android | 1 | LESSON_PROGRESSION_NON_BLOCKING | OWNER_ACTION_REQUIRED |

All 11 invariants are covered by at least one flow. `sourceItems` in the JSON lists the original check ids and checklist lines folded into each flow.

## Mapping: historical checklist → flows

| Source checklist | Items (before) | Now covered by |
|---|---|---|
| `docs/release/android-physical-qa.json` (RC2.2.12) | 98 | DM-01, 02, 03, 04, 06, 07, 09, 10, 11, 12, 15, 16, 17, 18, 20, 22, 23, 24, 25, 27, 28 |
| `docs/release/rc2-2-20-device-matrix.json` | 12 | DM-07, 09, 10, 13, 16, 18 |
| `docs/release/rc2-2-21-device-qa.json` | 23 | DM-06, 09, 16, 17, 18, 22, 23, 24, 25 |
| `docs/release/rc2-2-22-device-qa.json` | 40 | DM-01, 06, 09, 15, 16, 17, 18, 22, 23, 24, 25, 27 |
| `docs/release/rc2-2-25-owner-human-script.md` | 23 | DM-01, 03, 06, 07, 09, 10, 12, 13, 17, 18 |
| `docs/release/rc2-2-26-physical-matrix.json` | 27 | DM-01, 06, 07, 09, 10, 13, 16, 17, 18, 26 |
| `docs/release/rc2-2-27-physical-matrix.json` | 45 | DM-01, 06, 07, 09, 10, 13, 16, 17, 18, 25, 26 |
| `docs/release/rc2-2-28-physical-matrix.json` | 14 | DM-06, 07, 09, 10, 13, 25 |
| `docs/release/rc2-2-29-physical-matrix.json` | 28 | DM-01, 06, 07, 09, 10, 12, 16, 17, 18, 25, 26 |
| `docs/release/rc2-2-30-physical-matrix.json` | 28 | same as RC2.2.29 (inherited verbatim) |
| `docs/release/rc2-2-30-play-internal.json` | 7 | DM-01, 27 |
| `docs/release/rc2-2-31-physical-matrix.json` | 8 (3 FAIL) | DM-06, 07 |
| `docs/release/rc2-2-31b-physical-matrix.json` | 7 | DM-06, 07 |
| `docs/release/rc2-2-31c-physical-matrix.json` | 7 | DM-06, 07 |
| `docs/release/rc2-2-31d-physical-matrix.json` | 6 | DM-06, 07 |
| `docs/release/rc2-2-32-physical-matrix.json` | 33 | DM-03, 06, 07, 09, 11, 12, 13, 15, 16, 17 |
| `docs/reports/rc2-2-32-sensory-feedback.md` | 4 | DM-11, 15 |
| `docs/reports/rc2-2-32-speech-experience.md` | 5 | DM-08, 09 |
| `docs/release/rc2-3-0-pedagogy-matrix.json` | 11 | DM-01, 03, 04, 05 |
| `docs/release/rc2-3-1-visual-matrix.json` | 7 | DM-01, 05, 23, 25 |
| `docs/release/rc2-3-2-human-everyday-matrix.json` | 7 | DM-04, 25 |
| `docs/reports/rc2-3-3-culture-human-validation.md` | 24 | DM-12, 25 |
| `docs/reports/rc2-3-4a-hanzi-physical-acceptance.md` | 17 | DM-11, 15, 24 |
| `docs/reports/rc2-3-5-device-acceptance.md` | 47 (31 boxes + 16 torture rows) | DM-08, 09, 23, 24, 25 |
| `docs/reports/rc2-3-6-personal-mastery-qa.md` | 20 | DM-01, 09, 11, 13, 14, 23, 25, 26 |
| `docs/reports/rc2-3-7-owner-ux-acceptance.md` | 30 | DM-02, 03, 06, 09, 11, 12, 14, 15, 16, 17, 22, 25 |
| `docs/reports/rc2-3-8-closure.md` (OWNER_AUTH_ACCEPTANCE) | 10 | DM-18, 19, 20, 21, 22, 23 |
| `docs/reports/rc2-3-8-{provider-matrix,identity-linking,deep-link,progress-claim}.md` | 0 (contracts) | DM-19, 20, 21 |
| **Total** | **588** across 27 checklists | **28 flows** |

Out of scope: `docs/release/RC1_MANUAL_RUNBOOK.md` (26) and `docs/release/public-beta-launch-day.md` (11) are RC1/public-beta operations runbooks, not RC2.2–RC2.3.8 owner acceptance. They are not folded in.

## How the owner runs it

1. Install the APK from the current stack head's "Android foundation" run.
2. Work through `deviceMatrix` by area. Per flow, record device model, Android version, APK artifact id and date. Never record e-mail, password, OTP, token or recordings.
3. Only an actual owner run moves `ownerPhysical` from `NOT_RUN`. Auth social rows wait for `OA-AUTH-*`, and DM-27 waits for `OA-PLAY-*`.

## Follow-ups (not done here)

- No gate reads `owner-acceptance.json` yet. Wiring one, and retiring the per-wave matrices as current-identity checks, is part of the Stack Convergence gate work (`scripts/` was out of scope for this document pass).
