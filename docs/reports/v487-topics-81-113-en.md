# V4.8.7 — Complete English Journey topics 81–113

Frontend-only instruction/display overlay for the final 33 teaching topics.
Canonical Chinese pedagogy and stored learner identity are unchanged.

Programmatic identity:

`ALL_LESSONS.filter(isTopicMasteryLesson).slice(80, 113)`

validated against `TOPICS_81_113_TEACHING_TOPIC_IDS`. One topic is one
`lesson.id`; M1–M4 are mastery passes, not duplicated lessons.

## Computed inventory

| Metric | Value |
| --- | ---: |
| teachingTopicCount | 113 |
| localizedTopics (new slice) | 33 |
| localizedPasses (33 × M1–M4) | 132 |
| newGlossKeys | 1623 |
| totalGlossKeys | 4628 |
| stableLocIds (topics 21–113) | 20309 |
| uniqueStrings (Journey 1–113 walk) | 4799 |
| uniqueStrings (81–113 authoring harvest) | 2014 |
| missingCount | 0 |
| leakCount | 0 |
| fingerprintDrift | 0 |
| walkIssueCount | 0 |

The generated manifest is
`docs/localization/topics-81-113-manifest.json`. Stable IDs retain the form
`p.{topicId}.m{pass}.s{nn}.{field}` and extend the prior catalog without
renaming earlier IDs.

## Copy classification

| Kind | New strings |
| --- | ---: |
| DIRECT_TRANSLATION | 636 |
| NATURAL_REWRITE | 983 |
| SOURCE_LANGUAGE_ADAPTATION | 4 |

Source-language adaptations remove Portuguese-specific phonetic/word-order
assumptions. Brazilian nationality in characters such as Matheus remains
narrative identity, not locale inference.

## Locale invariants

- SRS keys remain `type:itemId` (for example `char:ren`), never locale-prefixed.
- Review localization changes display only.
- Answer equivalence maps EN labels back to canonical PT identity.
- Lesson/topic IDs, hanzi, pinyin, audio, target lexical IDs, mastery, XP, Qi,
  unlocks, progress, mistakes, and transfer eligibility do not include locale.
- Shared natural EN labels are compared through the overlay while the stored
  canonical answer stays unchanged.

## Scoreboard

| Gate | Result |
| --- | --- |
| TOPICS_81_113_EN_READY | PASS |
| TOPICS_1_113_EN_COVERAGE | PASS |
| TOPICS_1_113_NO_PT_LEAK | PASS |
| M1_1_113_EN_READY | PASS |
| M2_1_113_EN_READY | PASS |
| M3_1_113_EN_READY | PASS |
| M4_1_113_EN_READY | PASS |
| REVIEW_1_113_EN_READY | PASS |
| PROGRESS_LOCALE_PARITY_READY | PASS |
| SRS_LOCALE_PARITY_READY | PASS |
| MISTAKE_LOCALE_PARITY_READY | PASS |
| CANONICAL_CHINESE_UNCHANGED | PASS |
| EN_CORE_SURFACE_REGRESSION_READY | PASS |
| PUBLIC_EN_CORE_FLOW_READY | PASS |
| PWA_I18N_VERSION_READY | PASS (`v4.8.7`) |

## Verification evidence

- All required TypeScript, i18n, locale-parity, stable-ID, feasibility,
  topic-fidelity, mastery-depth, pinyin, Hanzi-builder, plan, and V4.8.6
  commercial gates pass locally.
- Production build: PASS (only the pre-existing chunk-size/dynamic-import
  warnings).
- Chromium: 17/17 combined EN core + V4.8.7 tests passed; the focused
  V4.8.7 rerun passed 11/11 with semantic sticky-CTA geometry assertions.
- Visual evidence is stored under `docs/reports/v487-screenshots/` for Journey,
  topic detail, player, dialogue, listening, production, transfer, Review,
  desktop, and the exact 390×844 mobile viewport.

## Boundaries

- `LONGYU_RC_VERSION` and persistence version are unchanged.
- No curriculum fork (`journey-en.ts`, `lessons-en.ts`, or per-topic EN files).
- No production backend write, migration, Edge deploy, or #208 change.
- No Stripe Live product, price, checkout, webhook, or charge.
- This report does not authorize a public beta release.
