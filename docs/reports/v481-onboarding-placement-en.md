# V4.8.1 — Onboarding + Placement English

Frontend-only localization of `/comecar`, onboarding, Placement, result, and
signup/missing-draft chrome. **PR #208 stays paused.** No MandarimProject
writes, no hosted migrations, no Edge deploys.

Base: `origin/main` (`5f3dd8d65e36c7189a53db5b9bd2d47808deb7bc`).

## Architecture

```
Placement question canonical identity
  id · stimulus/audio (zh) · dimension · difficulty · optionId · correctOptionId
        +
locale overlay (catalogs)
  prompt · gloss option labels · result chrome
```

Scoring, evidence, and `chooseNextQuestion` use **option IDs** (or canonical
Chinese/pinyin). They do not compare `Olá` / `Hello`.

`toServerPlacementEvidence` still emits the Portuguese/canonical **wire**
value the currently deployed Edge validates (`answer_not_in_options`). The
client engine already canonicalizes both IDs and legacy PT/EN labels.

`PLACEMENT_VERSION` remains **2**. Translation is not a new assessment.

## Cloud locale limitation (honest)

Until #208 is applied, `interface_locale` / `instruction_locale` are **not**
written to MandarimProject. The UI preference lives in
`longyu:interface-locale` on this browser. Confirming email in another
browser does not restore the chosen interface language from the cloud.
This does **not** block V4.8.1 and is not a hosted-handoff PASS.

Hosted onboarding V2 remains flag-gated. This remessa localizes the
frontend of `/finalizar-cadastro` only.

## Scoreboard

Filled from live commands on this PR (`validate:beta` PASS in 983.7s; `npm run build` PASS; Playwright onboarding PT/EN/switch PASS after a fresh preview build).

| Gate | Result | Evidence |
| --- | --- | --- |
| ONBOARDING_PT_BR_READY | **PASS** | Playwright `e2e/i18n-onboarding.spec.ts` PT funnel + existing PT chrome |
| ONBOARDING_EN_READY | **PASS** | Playwright EN funnel; `lang=en`; Get started / Continue / Question 1 |
| PLACEMENT_PT_BR_READY | **PASS** | Prompts kept semantically; option IDs with PT aliases |
| PLACEMENT_EN_READY | **PASS** | `placement.prompt.*` / `placement.opt.*` / result chrome |
| PLACEMENT_LOCALE_PARITY_READY | **PASS** | `npm run test:placement-locale-parity` — six profiles |
| PLACEMENT_RESULT_EN_READY | **PASS** | EN heading, recommendation, CTA, dimension labels |
| MID_FLOW_LANGUAGE_SWITCH_READY | **PASS** | Playwright PT→EN→PT on question 1 keeps option + goal/experience |
| ONBOARDING_A11Y_EN_READY | **PASS** | Back / progress / question names from catalogs |
| NO_PORTUGUESE_LEAK_ONBOARDING_EN | **PASS** | Playwright forbids key PT chrome strings. Journey lesson/phase titles on the result line remain PT until V4.8.2 |
| CANONICAL_CHINESE_UNCHANGED | **PASS** | Question ids, hanzi, pinyin, audioText, option IDs, difficulty, dimension snapshot in parity test |

## Local command results

| Command | Result |
| --- | --- |
| `npm run validate:beta` | PASS (983.7s) |
| `npm run build` | PASS |
| `npx playwright test e2e/i18n-onboarding.spec.ts --project=chromium` | PASS (3 tests) |

**Accept:** `PLACEMENT_LOCALE_PARITY_READY` is the critical gate.

## Chinese canonical identity

Unchanged: 你好 / 谢谢 / pinyin / audioText / difficulty / dimension /
`PLACEMENT_VERSION = 2`. Gloss options moved from Portuguese strings to
stable IDs (`hello`, `tone1`, …) with PT aliases equal to the previous
option text so leftover sessions and the live Edge still round-trip.

Speaking self-report stays a proxy: EN is “I could repeat it with a similar
tone”, not a claim of independent speech.

## Out of scope

- Journey lesson bodies / first 20 topics (V4.8.2)
- Tone Trainer, Pinyin Lab, Atlas, missions, shop, legal body, SEO articles
- Stripe, MandarimProject migrations, Edge deploy, RLS, #208 apply
- AccountPage legacy wizard (funnel is `/comecar`)

## Next

V4.8.2 — First 20 Journey topics EN.
