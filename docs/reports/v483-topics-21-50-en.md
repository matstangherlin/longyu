# V4.8.3 — Journey topics 21–50 English + localization scale hardening

Frontend-only instruction overlay for teaching topics **21–50**, plus stable
pedagogical loc ids and shared LessonPlayer / Review chrome.

Identity of the slice is programmatic:

`ALL_LESSONS.filter(isTopicMasteryLesson).slice(20, 50)`

validated against `TOPICS_21_50_TEACHING_TOPIC_IDS`. One topic = one
`lesson.id`. M1–M4 are mastery **passes** of that id.

**PR #208 stays paused.** No MandarimProject writes, no hosted migrations, no
Edge deploys, no persist bump (`LONGYU_RC_VERSION` remains `v4.7.4-rc.1`).

This branch is the V4.8.3 **delta** on V4.8.2 (`cursor/v482-first-20-journey-en-3618`).
It is **not** a third stack on `main` while #210 and #211 are open.

## Architecture

```
CANONICAL PEDAGOGY (locale-invariant)
  lessonId · topicId · hanzi · pinyin · audio · target/lexical ids
  answer identity · difficulty · pass · mastery · SRS itemId

LOCALIZED PEDAGOGY (overlay)
  title · instruction · explanation · hint · feedback
  source-language gloss · context · grammar note
```

One Journey. Multiple overlays. Forbidden: `journey-en.ts` / `lesson-en.ts` /
`topic21-en.ts`.

**Stable loc ids (topics 21–50):** `p.{topicId}.m{pass}.s{nn}.{field}`
and `p.{topicId}.meta.{field}`. Catalog:
`src/i18n/overlays/stablePedagogy.en.json`.

**Compatibility resolver (first 20, and planner clones):** PT-text overlay in
`instructionGloss.en.json`. Runtime still resolves by Portuguese string so
V4.8.2 does not break. Fail-closed coverage for topics 1–50 is the validator,
not a UI throw. Topic 51+ may still fall back to pt-BR.

Scoring: `Hello` / `I'm Brazilian` canonicalise to the same PT identity
(`Olá` / `Sou brasileiro`). No fuzzy match.

## Topics 21–50

See `docs/localization/topics-21-50-manifest.json` (generated, not hand-typed).

| Index | topicId | Notes |
| --- | --- | --- |
| 21 | `p2-comparar-tom-2-3` | tone compare |
| 29 | `p2-sons-brasileiros` | source-language adaptation (EN speaker sounds) |
| 31 | `l9` | conversation + transfer |
| 43 | `p3-ordem-das-palavras` | word order |
| 45 | `l14` | radicals |
| 50 | `p4-char-mu` | 木 |

All 30 topics require M1–M4 EN when those passes exist.

## Source-language adaptation (EN-010)

Authored kinds for the **894 new** 21–50 strings
(`docs/localization/t2150-kinds.json`):

| Kind | Count |
| --- | --- |
| DIRECT_TRANSLATION | 503 |
| NATURAL_REWRITE | 379 |
| SOURCE_LANGUAGE_ADAPTATION | 12 |

Required adaptations include:

- “Sons que brasileiros confundem” → “Sounds English speakers mix up”
- Portuguese yes/no-question analogy → English yes/no intonation
- Brazilian “r” on 二 → American English “her” / retroflex — not a calque

## English Journey progress (computed)

From `docs/reports/v483-english-journey-progress.json`
(`ALL_LESSONS.filter(isTopicMasteryLesson)`, 113 teaching topics):

| Slice | Status |
| --- | --- |
| 1–20 | **READY** |
| 21–50 | **READY** |
| 51–113 | **NOT_YET_LOCALIZED** |

## Scoreboard

| Gate | Result | Evidence |
| --- | --- | --- |
| STABLE_PEDAGOGY_LOCALIZATION_IDS_READY | **PASS** | `npm run test:stable-pedagogy-ids` — 5990 loc ids for topics 21–50 |
| TOPICS_21_50_EN_READY | **PASS** | overlay + M1–M4 walk |
| TOPICS_1_50_EN_COVERAGE | **PASS** | `npm run validate:journey-en` — uniqueStrings 2172, missingCount 0 |
| TOPICS_1_50_NO_PT_LEAK | **PASS** | leakCount 0 (hanzi/pinyin/Longyu/Mei not flagged) |
| SHARED_PLAYER_EN_READY | **PASS** | energy, streak shield, victory stats, listen/dictation, production help chrome via `player.*` |
| REVIEW_HUB_EN_READY | **PASS** | `/revisao` hub via `review.*` + domain overlay |
| REVIEW_1_50_EN_READY | **PASS** | `localizeReviewExercise`; SRS `type:itemId` unchanged |
| PROGRESS_LOCALE_PARITY_READY | **PASS** | `test:first-20-locale-parity` + `test:topics-21-50-locale-parity` |
| SRS_LOCALE_PARITY_READY | **PASS** | `makeKey("char", id)` ignores locale |
| MISTAKE_LOCALE_PARITY_READY | **PASS** | localize does not change hanzi / charId / chunkId / fingerprint |
| SOURCE_LANGUAGE_ADAPTATION_READY | **PASS** | 12 authored adaptations; validator leakCount 0 |
| CANONICAL_CHINESE_UNCHANGED | **PASS** | fingerprintDrift 0 |
| AUTOMATED_WALK_21_50_READY | **PASS** | validate:journey-en walkIssueCount 0 (all 30 × M1–M4) |
| FIRST20_REGRESSION_READY | **PASS** | `validate:first-20-en` + `test:first-20-locale-parity` |
| ONBOARDING_REGRESSION_READY | **PASS** | V4.8.1 gates remain in `validate:beta` (`test:placement-locale-parity`, onboarding e2e) |

## Local command results

| Command | Result |
| --- | --- |
| `npm run validate:i18n` | PASS (1358 catalog keys, pt-BR/en parity) |
| `npm run test:i18n` | PASS |
| `npm run validate:first-20-en` | PASS |
| `npm run test:first-20-locale-parity` | PASS |
| `npm run validate:journey-en` | PASS — missing 0, leak 0, fingerprintDrift 0 |
| `npm run test:topics-21-50-locale-parity` | PASS |
| `npm run test:stable-pedagogy-ids` | PASS |
| `npm run typecheck` | PASS |
| Playwright `e2e/i18n-topics-21-50.spec.ts` | **8/8 PASS** (Review hub, topics 21/29/31/43/45/50 chrome, topic 21 Discovery M1) |

Tone-trainer gates for topics 21–22 (`p2-comparar-tom-2-3`, `p2-tons-xiexie`) now use `journey.completeTonePack*` catalog copy. E2E seeds completed Tone Trainer packs so EN walks enter the player.

Overlay key count: **2221** PT→EN strings in `instructionGloss.en.json`.
New 21–50 authored strings: **894**. Stable loc ids: **5990**.

## Out of scope

- Topics 51+
- Full Atlas / legal / SEO international routing
- MandarimProject writes / #208 apply
- Stripe, BRL/USD checkout, Family subscription backend, Business Admin

Default interface locale remains **pt-BR**. EN tests call `seedInterfaceLocale(page, "en")`.
