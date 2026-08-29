# V4.8.4 — English Core Surface Completion + Zero Mixed-Language Gate

Frontend-only hardening of the English **core chrome** a learner can reach
through Journey topic 50. This wave does **not** add topics 51–113.

**PR #212 (V4.8.3) is merged on `main`** (`4bcd053`). This branch starts from
that merge. No MandarimProject writes, no #208 apply, no persist / RC bump
(`LONGYU_RC_VERSION` remains `v4.7.4-rc.1`).

## Objective

An English-interface user can go from onboarding through topic 50, miss,
succeed, finish a lesson, claim a reward, open Review, return to Journey, and
open Achievements **without Portuguese chrome** on those core surfaces.

Visual / runtime audit is the authority. Static overlay validators are not
enough.

## Architecture (unchanged)

```
CANONICAL PEDAGOGY (locale-invariant)
  lessonId · topicId · hanzi · pinyin · audio · target/lexical ids
  answer identity · difficulty · pass · mastery · SRS itemId
  stored badge identity "Precisão Serena"

LOCALIZED CHROME (catalog + overlay at render)
  buttons · nav · status · achievement titles by ID
  victory / save / reward chrome
```

Forbidden: `journey-en.ts` / `lesson-en.ts` / `topic21-en.ts`.

Achievement **identity** stays canonical (`jornada-primeira-licao`, stored
badge `"Precisão Serena"`). Display uses stable keys:

- `achievements.accuracy-serene.title` → EN **Serene Accuracy**
- `achievements.<id>.title` / `.desc` for every `ACHIEVEMENTS[]` id

PWA `workbox.cacheId` is `longyu-i18n-${LONGYU_I18N_VERSION}` (`v4.8.4`).
`html[data-i18n-version]` is set for stale-build diagnosis.

## Routes checked (E2E crawler, `interfaceLocale=en`)

`/`, `/login`, `/comecar`, `/jornada`, lesson detail, lesson player,
`/revisao`, `/treino`, `/missoes`, `/loja`, `/perfil`, `/ajustes`, `/mais`,
`/conquistas`, `/conta`, `/dados-locais`, `/sobre`, `/privacidade`, `/amigos`,
`/convide`.

Dump: `docs/reports/v484-e2e-leaks.json` (`count: 0`).

## Runtime states checked

- Topic 1 · M1 complete · victory (3★ path in playthrough)
- Player energy blocked (`/qa/energy-empty`)
- Review hub empty / due-ready chrome
- Achievements locked/unlocked labels
- Settings locale switch EN → pt-BR → EN (current screen updates)
- Shop chrome (SKU names stay `data-commercial-later`)
- Privacy legal body (`data-legal-later`)
- Account (`ContaPage`) login / session / placement CTA
- Missions headings, CTAs, monthly hero, card chrome
- Engine unlock reasons on More (overlay, not a global PT blacklist)
- Journey skip-test chrome (unavailable / Pro / previous-module / cost labels)

Victory branches (3★ / 2★ / pass 1–4 / errors / missions / reinforcement /
claim) share the same localized chrome in `LessonPlayer` (`player.*` catalog +
`localizedBadgeTitle`). The automated playthrough exercises topic 1 M1
victory; remaining branches are covered by catalog keys + leftover scanners,
not a 12-way live matrix in this PR.

## Screenshots (deterministic Chromium pack)

Written to `docs/reports/v484-screenshots/`:

| File | Surface |
| --- | --- |
| `journey.png` | Journey map |
| `lesson-activity.png` | Lesson player activity |
| `lesson-victory.png` | Topic 1 M1 victory |
| `review-hub.png` | Review hub |
| `review-session.png` | Review hub/session after Start if present |
| `achievements.png` | Achievements |
| `energy-blocked.png` | Energy blocked |
| `retry-modal.png` | Same energy-blocked chrome (retry/Qi adjacent) |

## PT leaks found (pre-fix) and fixed

Observed mixed-language failure mode: overlay existed for some strings but
**render did not call** `displayInstruction` / catalog / achievement IDs.

### Wave 1 — victory / player / account / shop / missions

| Leak | Class | Fix |
| --- | --- | --- |
| Victory footer Revisar / Biblioteca / Treinar | REAL_UI_LEAK | `player.navReview` / `navLibrary` / `navTrain` |
| Precisão Serena on victory | REAL_UI_LEAK | `achievements.accuracy-serene.title` (stored identity unchanged) |
| Progresso salvo / XP total / Rever resultados / Missões / Reforço / feedback / claim | REAL_UI_LEAK | `player.*` catalog |
| Save/sync PT | REAL_UI_LEAK | `player.save*` catalog |
| Account `/conta` chrome | REAL_UI_LEAK | `displayInstruction` + overlay |
| Shop headings / pearl chrome / chest section | REAL_UI_LEAK | `hub.*` catalog |
| Economy explainer PT fragments | REAL_UI_LEAK | `hub.economyFreeBody` / `economyProBody` + overlay fragments |
| Mission card titles/CTAs/monthly hero | REAL_UI_LEAK | overlay at render + `missions.*` chrome keys |
| Engine unlock copy on More / EngineGate | REAL_UI_LEAK | `displayInstruction` on canonical PT copy |
| Nested Account `chrome()` out of scope | REAL_UI_LEAK | `displayInstruction` in nested cards |

### Wave 2 — runtime crawler (fresh preview)

| Leak | Class | Fix |
| --- | --- | --- |
| `Pro: pular módulos avançados` | REAL_UI_LEAK | overlay + `displayInstruction(skipAccess.labels.pro)` |
| `Progresso da unidade: 0 de 10 lições` | REAL_UI_LEAK | `journey.unitProgress` |
| `aria-label="Progresso"` | REAL_UI_LEAK | `ProgressBar` uses `missions.progressLabel` |
| `Baú do Dragão — bloqueado` | REAL_UI_LEAK | `localizedChestVisual` + `journey.chestLocked` |
| Profile: Editar perfil / Missão do dia / Ver missões / estuda desde / PT-BR → Mandarim | REAL_UI_LEAK | `hub.editProfile`, `missions.todayMission`, `player.seeMissions`, `hub.studyingSince`, `marketing.taglineEn` |
| About: cloud feedback empty | REAL_UI_LEAK | `feedback.needCloudHistory` / `loadingMine` / `noneYet` |
| Privacy telemetry chrome | REAL_UI_LEAK | `displayInstruction` on headings + `TELEMETRY_*` rows |
| Skip: Teste indisponível / blockedReason / cost labels | REAL_UI_LEAK | `journey.skipTest*` + overlay for skip-access copy |

Captured PT needles on the topic 1 M1 victory body (`precisão`, `Precisão Serena`,
`Progresso salvo`, `XP total agora`, `Rever resultados`, `Missões atualizadas`,
`Reforço guiado`, `Prática curta`, `Deixar feedback`, `Opcional`,
`Receber recompensas`, `Revisar`, `Biblioteca`, `Treinar`) are asserted absent
in context. They are not a global blacklist.

## Intentional exceptions (not REAL_UI_LEAK)

| Kind | What | Why |
| --- | --- | --- |
| PEDAGOGICAL_TARGET | Quiz options / production / conversation scene copy | Scored PT identity; crawler tags `[data-option-index]`, `[data-production-answer]`, `[data-conversation-scene]` |
| PROPER_NOUN | Longyu, Qi, XP, Pro, Mei, Dragon, `Português (Brasil)` | Product names and native locale label |
| CHINESE | CJK in player / review | Target language |
| TECHNICAL | `v4.8.4`, M1–M4, 4/4, SRS | Version / pedagogy IDs |
| LEGAL_LATER | Privacy policy body | `[data-legal-later]` — legal body out of scope |
| COMMERCIAL_LATER | Shop SKU name/desc | `[data-commercial-later]` — catalog until pricing wave. **Chrome** (Buy, Pearls heading, chests) is EN. |

The leak classifier uses Portuguese-specific letters `[çãõâêô]` (not a
character class of `ões`, which would also match ASCII `e`/`o`/`s`) plus a
chrome word list. Acute-accent vowels are omitted from the letter class because
pinyin 2nd tone uses `á`.

## Scoreboard

| Flag | Result |
| --- | --- |
| EN_VICTORY_SCREEN_READY | PASS |
| EN_PLAYER_ALL_STATES_READY | PASS |
| EN_PLAYER_BOTTOM_NAV_READY | PASS |
| EN_REWARD_ACHIEVEMENTS_READY | PASS |
| EN_SAVE_SYNC_STATUS_READY | PASS |
| EN_REVIEW_CORE_READY | PASS |
| EN_JOURNEY_CORE_READY | PASS |
| EN_ACCOUNT_SETTINGS_READY | PASS |
| EN_MORE_CORE_READY | PASS |
| EN_RUNTIME_LOCALE_SWITCH_READY | PASS |
| EN_PWA_CACHE_READY | PASS |
| NO_MIXED_LANGUAGE_CORE_EN | PASS |

**REAL_UI_LEAKS_CORE_EN = 0** (static leftover gate + EN crawler dump).

## Local command results

| Command | Result |
| --- | --- |
| `npm run typecheck` | PASS |
| `npm run validate:i18n` | PASS (1756 catalog keys) |
| `npm run test:i18n` | PASS |
| `npm run validate:en-core-surfaces` | PASS |
| `npm run validate:journey-en` | PASS — topics 1–50 missing 0, leak 0, fingerprintDrift 0 |
| `npm run validate:first-20-en` | PASS |
| `npm run test:first-20-locale-parity` | PASS |
| `npm run test:topics-21-50-locale-parity` | PASS |
| `npm run test:stable-pedagogy-ids` | PASS |
| `npm run validate:lesson-victory-ui` | PASS |
| `npm run test:player-ux` | PASS |
| `npm run test:qa-regression-guard` | PASS |
| `npm run test:production-help` | PASS |
| Playwright `e2e/en-core-surfaces.spec.ts` (chromium, fresh `CI=1` preview) | PASS 5/5 |

Follow-up (failure/review chrome the route crawler does not open): in-lesson
review assembly labels, Listen again, free-answer aria, and overlay for
assembly + error-cause feedback.

Overlay key count after this wave: **2514** PT→EN strings in
`instructionGloss.en.json`. Product i18n version: **v4.8.4**. Catalog keys:
**1756**.

## Stale build / PWA

- Fresh install / hard reload: `html[data-interface-locale]` + `html[data-i18n-version=v4.8.4]`.
- Workbox `cacheId` includes the i18n version so a new wave does not mix old PT JS with a new EN catalog (or the reverse).
- E2E fetches `/sw.js` when present and asserts `longyu-i18n-v4.8.4`.
- QA hub eyebrow also prints `i18n v4.8.4` next to the RC label.

## Out of scope

- Topics 51+
- MandarimProject writes / #208 apply
- Stripe, BRL/USD, Family backend
- Full legal body, complete SEO articles
- Shop SKU catalog translation (commercial later)
- Friends/referral **logged-in** social lists (local E2E session hits the
  cloud-required catalog chrome, which is EN)

Default interface locale remains **pt-BR**. EN tests call
`seedInterfaceLocale(page, "en")`.

## After this wave

- V4.8.5 — Journey topics 51–80 EN
- V4.8.6 — International pricing foundation (BRL/USD) + Family Plan contract
- V4.8.7 — Journey topics 81–113 EN
