# V4.8.5 — Journey topics 51–80 English

Frontend-only instruction overlay for teaching topics **51–80**, plus stable
pedagogical loc ids extended from the 21–50 catalog. No curriculum expansion.

Identity of the slice is programmatic:

`ALL_LESSONS.filter(isTopicMasteryLesson).slice(50, 80)`

validated against `TOPICS_51_80_TEACHING_TOPIC_IDS`. One topic = one
`lesson.id`. M1–M4 are mastery **passes** of that id.

Fail-closed English overlay now covers teaching topics **1–80**.
`LONGYU_I18N_VERSION` is **v4.8.5**. `LONGYU_RC_VERSION` stays
`v4.7.4-rc.1`. Persist version stays **20**.

**Do not auto-merge.** No MandarimProject writes, no hosted migrations, no
Edge deploys, no Stripe / legal / SEO / shop SKU catalog.

## Architecture

```
CANONICAL PEDAGOGY (locale-invariant)
  lessonId · topicId · hanzi · pinyin · audio · target/lexical ids
  answer identity · difficulty · pass · mastery · SRS itemId
  stored badge identity "Precisão Serena"

RUNTIME EN LOOKUP
  displayInstruction → resolveInstructionText
    1) exact key in instructionGloss.en.json
    2) isCanonicalZhOrPinyin → leave
    3) applyPatterns
    4) else return PT (fail-open UI; fail-closed in validate:journey-en for 1–80)

STABLE IDs (durable catalog, 21–80)
  p.{topicId}.m{pass}.s{nn}.{field}
  generated into stablePedagogy.en.json
```

One Journey. Multiple overlays. Forbidden: `journey-en.ts` / `lesson-en.ts` /
`topic51-en.ts`. First 20 stay on the PT-text overlay.

Scoring: `answersEquivalent` / `scoredAnswersMatch` map EN visible labels back
to PT identity. Gloss key order is preserved so reverse-map first-wins stays
stable (`alto e reto` before `alto e constante` → `high and level`).

## Topics 51–80

See `docs/localization/topics-51-80-manifest.json` (generated, not hand-typed).

| Index | topicId | Notes |
| --- | --- | --- |
| 51 | `p4-char-ren` | 人 |
| 52 | `p4-char-kou` | 口 · audio discrimination |
| 66 | `l14-numeros-visuais` | Visual Numbers |
| 72 | `l18` | Friend · conversation |
| 73 | `p5-mu-mu-lin` | 木 + 木 = 林 |
| 77 | `p5-nv-zi-hao` | 女 + 子 = 好 · transfer |
| 80 | `p5-nv-ma-mae` | 女 + 马 = 妈 |

All 30 topics require M1–M4 EN when those passes exist. Titles that are only
hànzì stay canonical Chinese.

Sample speaker nationality stays Brazilian (`I'm Brazilian` / `Bāxī rén`).
That is character identity, not interface-locale inference.

## Authored overlay (51–80 new strings)

`docs/localization/t5180-en.json` + `docs/localization/t5180-kinds.json`
(491 new PT→EN keys, merged into `instructionGloss.en.json`):

| Kind | Count |
| --- | --- |
| DIRECT_TRANSLATION | 305 |
| NATURAL_REWRITE | 186 |
| SOURCE_LANGUAGE_ADAPTATION | 0 |

This slice is composition / hànzì, not the Brazil-sound pack. Existing
adaptations (English-speaker framing, Communication Repair) still apply via
reused 1–50 gloss.

## English Journey progress (computed)

From `docs/reports/v485-english-journey-progress.json`
(`ALL_LESSONS.filter(isTopicMasteryLesson)`, 113 teaching topics):

| Slice | Status |
| --- | --- |
| 1–20 | **READY** |
| 21–50 | **READY** |
| 51–80 | **READY** |
| 81–113 | **NOT_YET_LOCALIZED** |

## Scoreboard

| Gate | Result | Evidence |
| --- | --- | --- |
| TOPICS_51_80_EN_READY | **PASS** | overlay + M1–M4 harvest |
| TOPICS_1_80_EN_COVERAGE | **PASS** | `validate:journey-en` — uniqueStrings 2712, missingCount 0 |
| TOPICS_1_80_NO_PT_LEAK | **PASS** | leakCount 0 |
| M1_1_80_EN_READY | **PASS** | walkIssueCount 0 across M1–M4 |
| M2_1_80_EN_READY | **PASS** | same walk |
| M3_1_80_EN_READY | **PASS** | same walk |
| M4_1_80_EN_READY | **PASS** | same walk |
| REVIEW_1_80_EN_READY | **PASS** | `localizeReviewExercise`; SRS `type:itemId` unchanged (`char:ren`) |
| PROGRESS_LOCALE_PARITY_READY | **PASS** | first-20 + 21–50 + 51–80 locale-parity scripts |
| SRS_LOCALE_PARITY_READY | **PASS** | `makeKey("char", id)` ignores locale |
| MISTAKE_LOCALE_PARITY_READY | **PASS** | localize does not change hanzi / charId / chunkId / fingerprint |
| CANONICAL_CHINESE_UNCHANGED | **PASS** | fingerprintDrift 0 |
| AUTOMATED_WALK_51_80_READY | **PASS** | validate:journey-en walkIssueCount 0 (30 × M1–M4) |
| EN_CORE_SURFACE_REGRESSION_READY | **PASS** | `validate:en-core-surfaces` |
| PWA_I18N_VERSION_READY | **PASS** | `LONGYU_I18N_VERSION = v4.8.5`; workbox `longyu-i18n-${LONGYU_I18N_VERSION}` |

Stable loc catalog: **12966** ids · **1436** unique PT strings for topics 21–80
(`npm run test:stable-pedagogy-ids`). First 20 remain absent from that catalog.

## Local command results

| Command | Result |
| --- | --- |
| `npm run typecheck` | PASS |
| `npm run validate:i18n` | PASS (1756 catalog keys, pt-BR/en parity) |
| `npm run test:i18n` | PASS |
| `npm run validate:en-core-surfaces` | PASS |
| `npm run validate:first-20-en` | PASS |
| `npm run test:first-20-locale-parity` | PASS |
| `npm run validate:journey-en` | PASS — missing 0, leak 0, fingerprintDrift 0 |
| `npm run test:topics-21-50-locale-parity` | PASS |
| `npm run test:topics-51-80-locale-parity` | PASS |
| `npm run test:stable-pedagogy-ids` | PASS |
| `npm run validate:exercise-feasibility` | PASS |
| `npm run test:exercise-feasibility` | PASS |
| `npm run validate:topic-fidelity` | PASS |
| `npm run validate:topic-mastery-depth` | PASS |
| `npm run validate:pinyin-display` | PASS |
| `npm run test:hanzi-builder-integrity` | PASS |
| Playwright `e2e/i18n-topics-51-80.spec.ts` | pending local Chromium run |
| Playwright `e2e/en-core-surfaces.spec.ts` | pending local Chromium run (i18n version bump) |

Overlay key count: **3005** PT→EN strings in `instructionGloss.en.json`.
New 51–80 authored strings: **491**.

## Out of scope

- Topics 81–113 (V4.8.7)
- International pricing / Family Plan (V4.8.6)
- Full Atlas / legal / SEO international routing
- MandarimProject writes / #208 apply
- Stripe, BRL/USD checkout, Family subscription backend, Business Admin

Default interface locale remains **pt-BR**. EN tests call `seedInterfaceLocale(page, "en")`.
