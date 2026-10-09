# RC2.3.13H.1 — Sticky Progression Chrome

## Problem

On Journey/Culture scroll, the Global Top Bar appeared to disappear because the Progression switch used `sticky top-0` and covered it.

## Old behavior

- `TopBar`: sticky `top-0`
- Progression switch: sticky `top-0` (same stack position → covers TopBar when scrolled)

## New architecture

Conceptual `ProgressionStickyChrome`:

1. Global TopBar (AppShell) — sticky `top-0`, z-25, opaque `bg-bg`, safe-top
2. Progression switch — sticky `top: var(--progression-sticky-offset)` (= `--app-header-height`), z-20, opaque
3. Progression content scrolls underneath

## Scroll ownership

Primary scroll remains `window` / document. Tokens:

- `--progression-switch-height` (measured)
- `--progression-sticky-offset`
- `--progression-sticky-height`
- `html:has([data-progression-shell]) { scroll-padding-top: var(--progression-sticky-height) }`

## Anchor restoration

`scrollIntoView({ block: "center" })` + scroll-padding keeps current nodes below the sticky stack. Journey ↔ Culture keep independent anchors; AppShell no longer forces `scrollTo(0)` on `/jornada` ↔ `/cultura`.

## Lesson exception

Focus/lesson routes still hide TopBar + TabBar via `focusMode`. No Global TopBar + Progression switch + GuidedLessonHeader stack during AULA.

## Z-index

content < switch (20) < TopBar (25) < bottom nav (30) < modal (80)

## Safe area

`--app-safe-top` feeds `--app-header-height`. Sticky stack height:

`safe-top + TopBar + ProgressionSwitch = --progression-sticky-height`

## Responsive evidence

Local E2E covers 360×640 immobility + culture. Hosted VIEWPORT_360/375/390 remain `PENDING_HOSTED` until screenshot stamps.

## Gate

`gate:rc2-3-13h1-sticky-progression-chrome` (≥35 mutation kills; current suite 43).

## UI freeze

`docs/release/pre-beta-ui-freeze.json` records H.1 as the freeze wave. NO 13I.
