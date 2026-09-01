# V4.8.8 — Course Language Switching + Mobile Lesson UX

Base: `f44de398d29a6754ed056bee97d8c2bfac38abb8` (`origin/main` after PR #217).

Scope: independent course language, one measured bottom-action region, simplified
phonetic discrimination, and focused friction review. No curriculum identity,
production backend, Stripe Live, XP, Qi, mastery, SRS, unlock, answer, hànzì,
pinyin, or audio identity was migrated.

## Scoreboard

| Gate | Result | Evidence |
| --- | --- | --- |
| COURSE_LANGUAGE_PT_READY | PASS | Portuguese (Brazil) → Mandarin selectable in onboarding and Settings |
| COURSE_LANGUAGE_EN_READY | PASS | English → Mandarin selectable in onboarding and Settings |
| COURSE_SWITCH_PROGRESS_INVARIANT | PASS | `test:course-language-switch` + Playwright storage snapshot |
| SRS_LOCALE_INVARIANT | PASS | SRS keys and payload unchanged across both independent switches |
| MOBILE_BOTTOM_ACTION_OVERLAP | PASS | semantic geometry at all four automated viewports |
| MOBILE_FEEDBACK_FULLY_READABLE | PASS | feedback ends at least 4 px above measured action region |
| ANDROID_VIEWPORT_AUTOMATED | PASS | Chromium emulation 360×800 and 390×844 |
| IPHONE_VIEWPORT_AUTOMATED | PASS | Chromium emulation 412×915 |
| AUDIO_DISCRIMINATION_AUDIT_COUNT | 420 | 113 topics × M1–M4 walked programmatically |
| AUDIO_DISCRIMINATION_SIMPLIFIED_COUNT | 136 | every `audio_discrimination` uses listening-only choice + post-answer reveal |
| FIRST_20_BLOCKERS_REMAINING | 0 automated | focused report: `v488-first-20-friction-audit.md` |
| AUTOMATED_VIEWPORT_PASS | PASS | 360×800, 390×844, 412×915, 1280×720 |
| PHYSICAL_DEVICE_PASS | NOT_PROMOTED | emulation/screenshots do not certify real hardware |

## Course-language model

`interfaceLocale` and `instructionLocale` are independent domains. A new user
initially follows the interface language; the first explicit course choice sets
a separate user-override marker. Later interface changes do not rewrite that
choice. The course language controls Journey/topic/lesson/Review instructional
display and course-direction copy. The interface language continues to control
application chrome. Billing market remains a third, unrelated domain.

Canonical learning identity is intentionally outside both locale stores:

- one Journey and one set of lesson/topic/target IDs;
- one progress, mastery, SRS, mistake, XP, Qi, and unlock state;
- stable hànzì, pinyin, canonical answers, and audio identity;
- locale changes only instruction, explanation, hint, feedback, translation,
  and course chrome.

Storage keys are separate: `longyu:interface-locale`,
`longyu:instruction-locale`, and
`longyu:instruction-locale-user-override`. `LONGYU_I18N_VERSION` is `v4.8.8`;
the pedagogical persist version and release-candidate identity were not bumped.

## Mobile bottom-action contract

All lesson CTAs publish one semantic `data-lesson-bottom-action` region. A
`ResizeObserver` measures its real height into
`--lesson-bottom-action-height`; every lesson scroller reserves that exact
height plus safe spacing. LessonPlayer, Engine feedback actions,
StepCompareWithImage, and HanziBuilder share this authority. Tests assert the
measured reserve, feedback/action geometry, interactive-control overlap, dense
Hànzì banks, and reduced visual viewport behavior.

## Phonetic-task audit

The computed audit found 420 listening-related tasks: 156 `GOOD`, 256
`TOO_COMPLEX`, and 8 `MIXES_UNRELATED_SKILLS`. The latter classifications apply
to broader `listen_select` tasks and remain documented for focused future
review; they were not bulk-rewritten. All 136 `audio_discrimination` tasks were
simplified to two auditory choices, explicit replay, no pre-answer hànzì/pinyin,
and written contrast only after feedback. Missing audio cues and poor legacy
copy both equal zero.

The deterministic QA visual fixture is behind the production-denied QA gate.
The fixture proves the shared component in PT/EN; the programmatic validator
proves that every generated Journey instance receives the same contract.

## Validation

- Required npm gates: PASS, including typecheck, i18n, Journey EN, EN core,
  exercise feasibility, topic fidelity/depth, pinyin, Hanzi builder, plans,
  V4.8.6 commercial regression, course switch, audio quality, stable IDs, and
  production build.
- Chromium Playwright: 31/31 PASS across the three new specs and Journey,
  LessonPlayer, Review, Settings/course controls, and EN core regressions.
- Local Firefox/WebKit: NOT_RUN (runner executables are not installed on this
  workstation), classified as test-environment unavailability rather than a
  product or test failure. GitHub cross-engine checks remain authoritative.
- Journey EN: 113/113 READY; core EN real UI leaks: 0.
- Stable pedagogy: 20,323 IDs; 2,816 unique PT source strings.
- Screenshots: nine required images under `docs/reports/v488-screenshots/`.

## Release boundary

`MANDARIMPROJECT_WRITES = 0`

`STRIPE_LIVE_WRITES = 0`

`PHYSICAL_QA_READY = NOT_PROMOTED`

`READY_FOR_PUBLIC_BETA = NOT_PROMOTED`
