# RC2.3.13R.3.2.1 — Culture/Journey Visual Polish & Symbolic Progression

```text
PRE-BETA FREEZE EXCEPTION.

VISUAL POLISH ONLY.

NO NEW CONTENT.
NO NEW LESSONS.
NO NEW CULTURE PATHS.
NO PEDAGOGICAL RULE CHANGE.
NO ECONOMY CHANGE.
```

`VISUAL_POLISH_ONLY`

## Parent

| Field | Value |
|---|---|
| Parent PR | #350 |
| Parent HEAD | `5808e575568f4547e5ed38347f8e242efa8ecc70` |
| Branch | `cursor/rc2-3-13r3-2-1-culture-journey-visual-polish-af1a` |

## What changed visually

- Topic cards use a single line-icon family (`longyu-line`) with a soft accent tile.
- Continue card and topic-detail header get tighter hierarchy and a thinner progress track.
- Progression bubbles sit on one vertical axis (`progressionOffsetForIndex` = 0). Connectors stay centered. Labels use a fixed width so copy length cannot shove the path.
- Decorative ornaments (lantern, fan, bamboo, cloud, moon gate, seal, blossom, knot) alternate left/right in side lanes. Culture is slightly denser than Journey.
- Ornaments are `aria-hidden`, non-focusable, and stop animating under `prefers-reduced-motion`.

## Alignment strategy

Center lane is `max-w-[11rem]` with `items-center`. Side ornaments are absolutely positioned and `pointer-events-none`. Offset translate applies only when offset is non-zero; canonical offset is 0.

## Artifact

Prior DEVICE_QA candidates, including #348 `fc72f9e3…`, stay **STALE**. New APK only after hosted green on this runtime.

## Local evidence

Playwright at 390×844 / 360×640:

- 7 topic cards, line-icon family present, no Trocar, no path picker
- topic detail axis stable (`data-progression-offset=0` on every bubble)
- ornaments left and right (`2` / `2` on Relações e etiqueta)
- Journey rail present
- reduced motion: ornament `animation-name` is `none`

## Physical

`NOT_RUN`
