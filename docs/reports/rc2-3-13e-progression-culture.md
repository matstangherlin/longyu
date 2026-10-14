# RC2.3.13E — Progression Shell, Journey ↔ Culture

## Architecture

```text
ProgressionShell
  ├── JourneyPath  (/jornada)
  └── CulturePath  (/cultura)
Culture Atlas      (/cultura/explorar)
```

Segmented control `[ Jornada | Cultura ]` — mode selection, not CTA. Routes stay independent for deep links, Back, analytics, a11y.

## Before

- Culture hub as secondary content dump (filters, featured, collections, routes, seals at equal weight).
- Culture also as bottom-tab destination.
- Culture progression gates could hard-lock Mandarin lessons.

## After

- `/cultura` = Culture Journey (current route → next node → one Continuar).
- Atlas/explore secondary at `/cultura/explorar`.
- ProgressionShell on Journey + Culture with independent anchors/scroll.
- `CULTURE_MAY_BLOCK_JOURNEY = false` — gates become advisory bridges.

## Cognitive rationale

Hick: one dominant Cultura CTA. Two complementary progressions, not two apps. Culture answers “what part of China do I understand next?”

## Journey preservation

13B/13C Home cognitive stack unchanged inside Journey mode; only wrapped by ProgressionShell + header.

## Culture hierarchy

1. Current cultural route  
2. Next node + Continuar cultura  
3. Review if due (secondary)  
4. Explorar cultura (tertiary)

## Flagship template

Five `FLAGSHIP_DEEP` nodes in `cultureDeepSchema.ts` (mesa, digital, família, 客气/面子, metrô).

## Bridge proof

Bridge catalog retained; origin-aware return via `progressionShellState`. Culture completion does not mark language mastery.

## Route compatibility

`/cultura/:id`, collections, review unchanged. Hub bookmarks → Journey surface; explore at `/cultura/explorar`.

## Accessibility / responsive

Tabs + aria-selected + ≥44px targets + reduced-motion. Viewport E2E pending promotion after local run.

## Known gaps

- Full 12-path corpus expansion → 13F  
- Exhaustive physical QA → after 13F/13G UI freeze  
- Tab bar still lists Cultura for RC2.2.13 compatibility (not a 6th tab); primary mode switch is ProgressionShell


## Hosted closure (13E.1)

- Declared `cultura/explorar` in `docs/release/learner-surfaces.json` (RC2.3.13E).
- Declared `src/lib/progressionShellState.ts` in `BETA_PEDAGOGY_FREEZE.systemModules` with `RC2_3_13E_PROGRESSION_SHELL_EXCEPTION` (`UX_NAVIGATION_ONLY`, `PEDAGOGICAL_AUTHORITY: NONE`) — not a second Mandarin progression engine.
- Gate kills expanded to **31/31** (atlas surface, freeze honesty, authority, second-engine).
