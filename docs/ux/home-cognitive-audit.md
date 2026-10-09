# RC2.3.13B — Home cognitive audit (with component mapping)

Home purpose: **RESUME LEARNING** — answer “O que eu faço agora?” in seconds.

Parent baseline: RC2.3.13A (`cursor/rc2-3-13a-cognitive-ui-foundation-af1a`).

## Phase 0 — First-fold inventory (BEFORE → AFTER)

| Element (before) | File | Class | AFTER disposition |
|---|---|---|---|
| `ProOfferBanner` | `src/components/pro/ProOfferBanner.tsx` | PROMO | Moved **below** cognitive Home |
| `JourneyHeader` Continue + review CTA | `src/features/journey/JourneyPage.tsx` (removed) | CORE_LEARNING + PERSONAL_PRACTICE (tied) | Replaced by `HomeContinueCard` (single primary) |
| Dual review ButtonLink in header | same | PERSONAL_PRACTICE | Moved to **Today for You** (secondary) |
| Streak + offline pills in header | same | GAMIFICATION / SYSTEM | Compact chrome (`HomeCompactChrome`) |
| Unit progress ring in header | same | MASTERY-ish chrome | Removed from first fold |
| `GuidanceInlineSlot` | `src/components/guidance/GuidanceHost.tsx` | SYSTEM | After cognitive blocks |
| `JourneyMobileChips` (missions + streak/progress) | `JourneyPage.tsx` | GAMIFICATION | Below cognitive Home (not first-fold competition) |
| Journey trail nodes | `JourneyPage.tsx` ModuleBlock… | CORE_LEARNING | Below fold (path remains) |
| `JourneySidePanel` review/mission/progress | `JourneyPage.tsx` | PERSONAL_PRACTICE / GAMIFICATION | xl sidebar only |

### Classification key

- **CORE_LEARNING** — next lesson / Journey progression
- **PERSONAL_PRACTICE** — review / mastery practice
- **MASTERY** — competency snapshot
- **EXPLORE** — culture / optional enrichment
- **GAMIFICATION** — streak, missions, XP chrome
- **PROMO** — Pro offer / shop
- **SYSTEM** — offline, guidance, chrome

## AFTER structure (canonical)

```
1. HomeCompactChrome     — greeting (secondary) + streak/offline
2. HomeContinueCard      — PRIMARY CTA (Continuar / Começar / fallback)
3. HomeTodayForYou       — ONE recommendation + reason (secondary CTA)
4. HomeSeuMandarim       — snapshot (tertiary → /dominio)
5. HomeExploreBlock      — ONE unlocked culture item (tertiary)
6. ProOfferBanner        — de-emphasized
7. Guidance + chips + trail
```

## File mapping

| Concern | Path |
|---|---|
| Deterministic resolver | `src/lib/home/homeRecommendations.ts` |
| UI blocks | `src/features/journey/HomeCognitiveBlocks.tsx` |
| Wiring | `src/features/journey/JourneyPage.tsx` |
| Mastery authority | `src/features/dominio/useLearnerMastery.ts` → `personalMastery.ts` |
| SRS due | `src/lib/srs.ts` `dueItems` |
| Culture unlock | `progressiveDiscovery` + `pickNextCultureMissionId` / moments |
| Gate | `gate:rc2-3-13b-home-cognitive` |
| i18n | `home.*` in `src/locales/pt-BR.ts` / `en.ts` |

## Test IDs (stable)

- `home-cognitive`
- `home-continue` / `home-continue-cta`
- `home-today` / `home-today-cta` / `home-today-reason`
- `home-mastery` / `home-mastery-cta`
- `home-explore` / `home-explore-cta`
- Coachmark preserved: `data-coachmark-target="journey-continue"`

## Cognitive load (mature account, mobile first fold)

| Metric | BEFORE (13A audit) | AFTER (13B target) |
|---|---|---|
| Actionable choices | 4–8 | ≤3 (Continue + optional Today start + compact streak) |
| Primary-looking actions | often 2 (Continue + Review) | **exactly 1** |
| Distinct competing groups | 3–5 | 1–2 above fold |

## 5-second test

After 5 seconds a tester should answer:

1. What should I do next? → Continue card title + lesson
2. Where do I tap? → `home-continue-cta`
3. Why is recommended practice relevant? → `home-today-reason` (one sentence)

## JEV / freeze

- `JEV_RUNTIME_ENABLED=false`, no Home → Jev calls
- No Mastery 2.0 / Longyu Life / Reader / new curriculum / billing / sibling projects
