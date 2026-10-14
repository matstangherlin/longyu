# Final motion system — RC2.3.13R

CSS-only. **No framer-motion / gsap** (public-beta freeze forbids them).

## Tokens (`src/index.css`)

| Token | Value | Use |
|-------|-------|-----|
| `--motion-instant` | 80ms | press feedback |
| `--motion-fast` | 140ms | micro UI |
| `--motion-normal` | 220ms | mode enter, cards |
| `--motion-emphasis` | 280ms | rare emphasis |
| `--ease-standard` | cubic-bezier(0.2, 0, 0, 1) | indicator |
| `--ease-enter` | cubic-bezier(0, 0, 0.2, 1) | enter |
| `--ease-exit` | cubic-bezier(0.4, 0, 1, 1) | exit |
| `--ease-spring` | reserved | rare |

Prefer **transform + opacity**. Avoid layout animation (width/height/top/left).

## Patterns

1. **Journey ↔ Culture** — content panel `progression-panel-enter` with `data-enter=from-left|from-right` (~12px). TopBar + switch immobile. Thumb uses `--motion-normal`.
2. **Scroll restore** — `useLayoutEffect` before paint; no flash-to-top.
3. **Culture path card** — `culture-path-card-enter` on path id change.
4. **Buttons** — existing `active:scale-[.98]`.
5. **Current node** — restrained pulse (`motion-safe:animate-pulse`); disabled under reduced motion.
6. **Dynamic Aula** — TeacherSpeechBubble unchanged (type-on / tap-to-finish).
7. **Victory / chest** — existing bounded animations.

## Reduced motion

`prefers-reduced-motion: reduce` → spatial slides collapse to `longyu-fade-in` 150ms; transitions off; state feedback preserved (selected tab, content swap).

## Prohibited

- Animating Global TopBar / counters on mode switch
- Remounting TopBar
- Blocking CTA until animation ends
- Continuous decorative bounce on nodes
- Full-page swipe theater
- New heavy motion libraries
