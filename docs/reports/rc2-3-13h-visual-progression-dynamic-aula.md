# RC2.3.13H — Visual Progression & Dynamic Aula

## Journey before/after

- **Before:** Local `LessonNode` / `LessonStageRing` only on Journey.
- **After:** Shared `ProgressionNodeBubble` + pass ring from canonical mastery; current node uses size, ring, accent, label, and reduced-motion-safe pulse.

## Culture before/after

- **Before:** Row list with ● / ◉ / ○.
- **After:** `ProgressionPath` bubbles + connectors; current bubble is primary entry; path picker stays tertiary.

## Shared progression grammar

`ProgressionPath` · `ProgressionNodeBubble` · `ProgressionConnector` · `ProgressionNodeLabel`  
States: `COMPLETED` | `CURRENT` | `AVAILABLE` | `LOCKED`.

## Node state table

| State | Shape/icon | Motion |
|---|---|---|
| COMPLETED | check icon | calm |
| CURRENT | larger + accent ring + Continuar | pulse (reduced-motion off) |
| AVAILABLE | tappable border | none |
| LOCKED | lock icon | none |

## Dynamic Aula architecture

`DynamicTeachingSequence` inside Guided presentation provider + dock primitives.  
Beats from `lessonPresentations.ts`. Teacher bubble: `TeacherSpeechBubble` (ENTER/TYPING/READY, tap finishes type-on).

## Foundation coverage

See `docs/ux/dynamic-aula-inventory.md` — five foundation capsules `DYNAMIC_PASS`.

## Visual asset inventory

`src/data/lessonVisualAssets.ts` + bundled SVGs under `public/assets/visuals/`.

## Animation contract

- Fast type-on; tap completes; no auto-advance.
- `prefers-reduced-motion`: instant text, no pulse.

## Accessibility

Semantic bubble text, image alts PT/EN, aria-current/disabled on nodes, ≥44px targets.

## Responsive

Designed for 360×640, 375×667, 390×844 — CTA in dock / min-h-12.

## Gates

`gate:rc2-3-13h-visual-progression-dynamic-aula` (≥50 mutation kills).

## Known gaps

- Physical device QA / motion video evidence deferred to final pre-beta RC entry.
- Chromium/cross-engine stamps after hosted green.
