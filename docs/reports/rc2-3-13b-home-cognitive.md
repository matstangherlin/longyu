# RC2.3.13B — Home Cognitive Redesign report

## Summary

Home/Journey now answers **“O que eu faço agora?”** with a learning path:

1. **Continue** (primary)
2. **Today for You** (one recommendation + reason)
3. **Seu Mandarim** (mastery snapshot)
4. **Descobrir** (one unlocked culture item)

## Before first viewport (13A)

- Pro offer (when active)
- Header card with Continue **and** Review soft CTA (two high-emphasis actions)
- Guidance tip
- Mission/streak chips
- Start of Journey trail

Approximate: **4–8** actionable destinations; **often 2** primary-looking CTAs.

## After first viewport (13B)

- Compact greeting + streak
- **Continue** card only (one filled primary)
- Start of **Today for You** (secondary) when a recommendation exists
- Remaining sections scroll

Approximate: **≤3** first-fold actions; **exactly 1** primary CTA.

## Section hierarchy

| Rank | Section | CTA weight | Test id |
|---|---|---|---|
| 100% | Continue | PRIMARY | `home-continue` |
| 70% | Today for You | SECONDARY | `home-today` |
| 55% | Seu Mandarim | TERTIARY | `home-mastery` |
| 45% | Descobrir | TERTIARY | `home-explore` |

## Resolver

`src/lib/home/homeRecommendations.ts`

- Continue: `currentLessonId` → `/licao/…` or pinyin capsule (existing `routeForLesson`)
- New learner: START_FIRST / “Começar minha primeira aula”
- Path complete fallback: Review → Practice → Explore (never dead Continuar)
- Today: Review due → Mastery need → Developing → Enrichment (only when not derailing Journey)
- Never Store / League / Jev
- Dedup when Today href === Continue href
- Mastery snapshot consumes `useLearnerMastery` / `STATE_LABEL_PT` only
- Explore: unlocked moments or `pickNextCultureMissionId` when culture AVAILABLE

## Proof references

- Gate: `npm run gate:rc2-3-13b-home-cognitive`
- Audit: `docs/ux/home-cognitive-audit.md`
- Cert: `docs/release/rc2-3-13b-ux-certification.json`
- E2E: `e2e/rc2-3-13b-home-cognitive.spec.ts`
- Screenshots: capture at 360×640 / 375×667 / 390×844 for new / returning / review-due (artifacts when CI/local run)

## RC identity

This wave changes learner Home UI. Preferred next stamp: **RC2.3.12-RC3** / `0.2.0-rc.3` / Android versionCode **> 596**. RC2 remains for regression comparison; do not pretend RC2 certifies 13B Home.
