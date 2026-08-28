# V4.8.2 — First 20 Journey topics in English

Frontend-only instruction overlay for the first **20 teaching topics**
(`ALL_LESSONS.filter(isTopicMasteryLesson).slice(0, 20)`). One topic = one
`lesson.id`. M1–M4 are mastery **passes** of that id, not four lesson files.

**PR #208 stays paused.** No MandarimProject writes, no hosted migrations, no
Edge deploys, no persist bump (`LONGYU_RC_VERSION` remains `v4.7.4-rc.1`).

This branch stacks on V4.8.1 (`cursor/v481-onboarding-placement-en-3618`) until
#210 merges.

## Architecture

```
Canonical Journey data (pt-BR + zh)
  lesson.id · hanzi · pinyin · audio · option identity
        +
EN overlay at render
  resolveInstructionText / localizeLessonStep
  catalogs: player.* · journey.* · review.*
```

Scoring uses `answersEquivalent` / `scoredAnswersMatch`: `Hello` canonicalises
to `Olá`. Do not compare raw `Olá === Hello`.

`showPortuguese` in `applyScaffoldToStep` still means **hide source-language
gloss** on later passes (`isNoHint`), not “Portuguese forever”.

## Scoreboard

| Gate | Result | Evidence |
| --- | --- | --- |
| FIRST_20_EN_READY | **PASS** | `npm run validate:first-20-en` — M1–M4 planned steps, titles, lexical glosses, builders, conversation nodes |
| TOPIC_PROGRESS_LOCALE_PARITY | **PASS** | `npm run test:first-20-locale-parity` — same plan fingerprint across locales; Olá ≡ Hello |
| CANONICAL_CHINESE_UNCHANGED | **PASS** | fingerprint: hanzi, pinyin, audio, ids, kinds, pass type |
| PLAYER_CHROME_EN | **PASS** | Continue / Check / Same / Different / pass labels from catalogs |
| REVIEW_SUBSET_EN | **PASS** | `localizeReviewExercise` after overlay, then personalize |
| NO_PORTUGUESE_LEAK_FIRST_20 | **PASS** | validator fail-closed; pinyin/hanzi/Longyu not flagged |

## Local command results

Filled from this PR’s gates. Playwright Topic 1 4/4 EN is in
`e2e/i18n-first-20-journey.spec.ts` (Chromium). Default UI locale remains
**pt-BR**; EN tests call `seedInterfaceLocale(page, "en")`.

| Command | Result |
| --- | --- |
| `npm run validate:first-20-en` | PASS |
| `npm run test:first-20-locale-parity` | PASS |
| `npm run validate:i18n` | PASS |
| `npm run test:i18n` | PASS |
| `npm run typecheck` | PASS |
| `npx playwright test e2e/i18n-first-20-journey.spec.ts --project=chromium` | PASS (Journey chrome + Topic 1 M1→M4) |
| `npx playwright test e2e/i18n-shell.spec.ts --project=chromium` | PASS |

## Out of scope

- Topics 21+ (V4.8.3)
- Full Atlas / Tone Trainer / Pinyin Lab / missions / shop / legal / SEO / Stripe
- #208 cloud locale persistence
- MandarimProject, Edge, RLS, persist version 20

## Honest leftover

Later-wave LessonPlayer surfaces still mix Portuguese: skip-with-breath banners,
streak-shield copy, victory collapsible stats (“Rever resultados”, missions),
and some production-step chrome that is not in the first-20 planned step list.
`/revisao` hub chrome (“Plano de hoje”), the Journey side rail (Missão /
Progresso geral), and achievement toasts are later waves. First-20 planned
pedagogical strings, player actions, Journey/Detail CTAs, Review exercises,
and Hanzi Builder chrome for these topics are overlaid.
