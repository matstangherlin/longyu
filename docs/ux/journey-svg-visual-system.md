# Journey SVG Visual System — RC2.3.13R.3.2.3

The **Longyu vector illustration language** for the Journey's atmosphere layer:
custom `.svg` scenes in side lanes beside the learning path, the small ornaments
that keep clear of them, and the embroidered medallion on module-review nodes.

> **Learning > Progression > Atmosphere.** Scenes never move, cover or compete
> with a node, a label, a CTA or a card. They are decorative, hidden from
> assistive tech, and they never read learner state.

---

## 1. Design principles

| Principle | How it shows up |
| --- | --- |
| Authored, not stock | 16 hand-drawn scenes made for Longyu; no emoji, no clip-art, no remote images. |
| Recognizably Chinese, not clichéd | Real landmarks and symbols (moon gate, pagoda, paifang, Guilin karst, Great Wall, Sun Wukong, the 招财猫 lucky cat with a square-holed cash coin) — no dragon on every screen, no flags. |
| One family | Every scene sits on the same **moon-window disc**, uses the same linework, one coral focal and a small cloud curl. |
| Quiet | Linework at 78% ink, soft washes, slow wrapper drift; scenes are smaller and lower-contrast than nodes. |
| Text-free | No `<text>`, no `<title>`, no ASCII art, no Hànzì. The 福 door sign and the couplets are drawn as blank red shapes so nothing can be read as lesson content. |

## 2. Canvas and file contract

- `viewBox="0 0 320 240"` (4:3) for every scene — the lane reserves a 4:3 box before paint.
- Transparent canvas: no full-canvas rect; the disc is the only backdrop (`r ≤ 120`).
- True vectors only: `path`, `rect`, `circle`, `ellipse`, `line`, `polygon`, one restrained `linearGradient` (the disc fade) and `clipPath` where a view is framed (moon gate, Great Wall hills).
- Root: `fill="none" stroke-linecap="round" stroke-linejoin="round" data-lys-scene="<id>"`.
- Pure ASCII, no fonts, no scripts, no `foreignObject`, no event handlers, no external references, no SMIL.
- Size: 4.2–5.9 KB per file (4262–6020 bytes; budget 35 KB; target 8–25 KB is comfortably undercut without losing detail).

## 3. Palette — roles, not colors

Scenes never carry a hex color. Every painted element has a **role class**:
`lys-f-<role>` (fill) and/or `lys-s-<role>` (stroke). The app maps roles to the
real Longyu tokens in `src/index.css` (`.journey-scene` block).

| Role | Meaning | Light themes (`clay`, `china`) |
| --- | --- | --- |
| `ink` | charcoal linework | `--text` @ 0.78 |
| `soft` | secondary linework, ground, clouds | `--text` @ 0.34 |
| `mark` / `mark-soft` | detail drawn **on** pale objects (eyes, whiskers, brush ink) | `--text` @ 0.82 / 0.36 |
| `paper` | occluding fill (walls, buildings, train) | `--surface` |
| `pale` | intrinsically light objects (white cat, porcelain, rice paper, auspicious cloud) | `--surface` |
| `wash` / `lys-stop-wash` | the moon disc | `--accent-soft` (fades to transparent) |
| `accent` | the Longyu coral focal | `--accent` @ 0.9 |
| `clay` | muted terracotta (roof tiles, pots) | `--accent` @ 0.38 |
| `sage` / `sage-soft` | plants, bamboo, far hills | `--good` @ 0.58 / 0.16 |
| `sand` / `glow` / `gold` | earth · lantern light · gold details | `--gold` @ 0.18 / 0.22 / 0.78 |

### Moonlit dark mode

A dark-on-dark drawing turns to mud (owner feedback: *"tá tudo escuro"*). In
`[data-theme="dark"]` the scene keeps the **light artwork** — the scene tokens
are the clay theme's own values (`47 52 55`, `250 249 246`, `244 230 226`,
`185 65 46`, `47 133 90`, `138 90 23`) — the disc becomes a **solid moon**
(`stop-opacity: 1`) and the whole scene is dimmed to `opacity: 0.86`. In the dark
UI each scene reads as a lit moon window: luminous, but never brighter than the
nodes. `validate:journey-svg-style` computes WCAG contrast from the real tokens
(ink on page ≥ 3, moon on dark page ≥ 3, ink on moon ≥ 3) and rejects any color
that is not a Longyu token.

Each file also carries a standalone `<style>` (light + `prefers-color-scheme: dark`)
so the asset renders correctly when opened on its own; the app strips it at render.

## 4. Line weights

Scenes render at ~92 px (360 px phone) to ~136 px (tablet/desktop), a 0.29–0.43
scale. Strokes are authored for that size:

| Weight | Units | ≈ px at 360 | Use |
| --- | --- | --- | --- |
| Primary | 4.5–5 | 1.3–1.4 | silhouettes, walls, the main subject |
| Secondary | 3–4 | 0.9–1.1 | roofs, windows, figures |
| Texture | 2.5 | 0.7 | tiles, lattice, cords |

Nothing below 2 units (`STROKE_TOO_THIN`).

## 5. Scene library (pack v1)

| # | Scene | Stands for | Regions | Placements |
| --- | --- | --- | --- | --- |
| 1 | `moon-gate` | entering a new world (a pagoda seen through the gate) | Foundation, Everyday | 2 |
| 2 | `lantern-street` | everyday social Mandarin (paifang arch, lanterns) | Everyday, Real life, Modern | 2 |
| 3 | `bamboo-mountains` | calm progress (Guilin karst, raft with conical hat, bamboo) | Foundation, Everyday, Real life | 5 |
| 4 | `tea-table` | hospitality (teapot, porcelain cups, plum-blossom window) | Foundation, Everyday, Real life | 2 |
| 5 | `market` | shopping and asking (striped canopy, lanterns, produce) | Real life | 2 |
| 6 | `high-speed-rail` | travel, modern China (city → pagoda hill) | Real life, Modern | 2 |
| 7 | `modern-city` | modern Mandarin use (tiered towers, elevated transit) | Modern | 1 |
| 8 | `courtyard` | family and home (red door, 福 diamonds, couplets, lanterns) | Foundation, Everyday, Real life | 3 |
| 9 | `river-bridge` | continuity (arched bridge, pavilion, reflections) | Foundation, Everyday, Real life | 4 |
| 10 | `brush-seal` | written Mandarin (rice paper, brush, ink stone, abstract seal) | Foundation, Everyday | 5 |
| 11 | `night-street` | real-world situations (moon, lit windows, lanterns) | Real life, Modern | 1 |
| 12 | `digital-life` | digital China (phone, QR-like blocks, transit, coin, pin) | Real life, Modern | 1 |
| 13 | `buddhist-temple` | heritage and calm practice (5-tier pagoda, hall, incense burner) | Foundation, Everyday, Real life | 4 |
| 14 | `sun-wukong` | the Monkey King of *Journey to the West* (staff, headband, cloud) | Everyday, Real life, Modern | 2 |
| 15 | `lucky-cat` | shops, money, numbers (招财猫, cash coin, red envelope, ingot) | Real life, Modern | 2 |
| 16 | `great-wall` | building, history, travel (watchtowers over ridges) | Real life, Modern | 2 |

Scenes 13–16 were requested by the owner (temples, Wukong, the Chinese cat,
real landmarks) and fill the four optional slots (library max 16). Sun Wukong is
an original drawing of the 16th-century literary character — it copies no game,
film or TV design. The lucky cat is the beckoning cat that originated as Japan's maneki-neko
and is now ubiquitous in Chinese shops as 招财猫; here it holds a Chinese
square-holed cash coin.

## 6. Mapping (deterministic)

`src/features/journey/scenes/journeyScenePlan.ts` — no randomness, no clock, no
learner state, no expansion state. Same curriculum → same arrangement.

- **Cadence** counts progression *stops* (AULA bubbles, lesson nodes, trainer
  cards, culture moments) from static data: first scene at stop ≥ 2, then ≥ 4
  stops and ≥ 2 lesson rows apart. Real curriculum: **40 scenes over 171 stops =
  one per 4.3 stops**, never on consecutive lesson rows. Async inline nodes
  (published capsules) are excluded so nothing shifts after load.
- **Sides** alternate by global ordinal: left, right, left, right.
- **Storytelling regions** follow the phase, never a level label:
  Foundation (p1, p2, p4) → Everyday (p3) → Real life (p5, p6) → Modern (p7).
- **Semantic sequences** per module; scenes sit beside related content where it
  exists — Sun Wukong right after the *Sun Wukong* culture card (after `l9`) and
  again in *Histórias curtas*; the lucky cat in *Números 1 a 10*; the Great Wall
  in *Construção lógica*; the temple at the start, in the tones module and in Hànzì.
- Never the same scene twice in a row; every scene is used; every id is allowed
  in its region (`REGION_CONTRACT_BROKEN`).

## 7. Lanes and responsive sizing

```
LEFT SCENE LANE  ·  CENTER PROGRESSION LANE  ·  RIGHT SCENE LANE
minmax(0, 1fr)      minmax(8.75rem, auto)       minmax(0, 1fr)
```

Only lesson rows that carry decor become a `JourneyLaneRow`. The side tracks are
equal, so the center (node, label, CTA) lands on exactly the same axis as
undecorated rows; scenes are grid cells, so they shrink with their lane and can
never reach the center. `--journey-node-lane` matches the label width in `rem`,
so large text widens the center and the scenes shrink; a lane under 48 px drops
its scene (`@container`).

| Viewport | Scene width | Scene height |
| --- | --- | --- |
| 360 × 640 | 92 px | 69 px |
| 375 × 667 | 99.5 px | 75 px |
| 390 × 844 | 107 px | 80 px |
| tablet 834 / desktop 1280 | 136 px | 102 px |
| 360 × 640, 130 % text | 66 px | 49 px |

(Measured with every module expanded — `docs/release/evidence/rc2-3-13r3-2-3/journey-scene-layout.json`.)

## 8. Ornaments and the medallion

- **Hierarchy:** scene = rare and larger; ornament = small and frequent.
  Journey ornaments now live in lane cells (not a percentage overlay), at least
  two lesson rows from any scene, on the lane opposite the scene they follow,
  never on a scene row. Culture keeps its ornament rail unchanged and never gets scenes.
- **Review medallion:** module-review nodes get an embroidered frame — a
  12-scallop lotus rosette, a ring of French-knot stitches and four ruyi knots.
  It frames the bubble in its own 84 px box (no reach into the CTA pill or the
  label), is hidden from assistive tech, and stays muted when the review is locked.

## 9. Motion

- The asset is static; the **wrapper** drifts: `translateY(0 → −2px)`,
  `rotate(±0.4deg)`, `opacity 0.94 → 1`, 12 s alternate, phase offset per scene.
- One restrained entrance per session per scene: `opacity 0 → 1`, `translateY(4px → 0)`,
  520 ms, when it first enters the viewport.
- Only `transform` and `opacity` animate — no filters, blur or path morphing.
- **Reduced motion:** no drift, no entrance; scenes are simply visible.

## 10. Rendering, offline and Android

The app theme lives on `<html data-theme>`, which an `<img>` SVG cannot see, so
scenes are **inlined**: `import.meta.glob(..., { query: "?raw", eager: true })`
bundles the 16 files (~80 KB raw, ~10 KB gzip) into the Journey chunk. No network request,
no flash, offline-safe in the PWA and inside Capacitor's WebView. Each instance
passes through `prepareSceneMarkup`, which refuses unsafe markup (script,
foreignObject, image, event handlers, external URLs, text), strips the standalone
style and the intrinsic size, marks the SVG `aria-hidden="true" focusable="false"`,
and suffixes every id so repeated scenes never share a gradient or clip path.

## 11. Accessibility

Decorative = hidden: wrapper and SVG are `aria-hidden`, nothing is focusable or
tappable (`pointer-events: none`), there is no alt text, title or label. A scene
never announces "lantern with bamboo" to TalkBack.

## 12. Gates

| Gate | Guards |
| --- | --- |
| `validate:journey-svg-assets` | parse, external refs, scripts, foreignObject, raster, viewBox, size, duplicate/dangling ids, SMIL, fonts |
| `validate:journey-svg-style` | canvas, viewBox, roles, palette ⊂ tokens, stroke weight, round caps, disc + coral signature, text/emoji, light + moonlit-dark contrast |
| `validate:journey-scene-registry` | registry ↔ files ↔ inventory, deterministic plan, density, alternation, regions, ornament clearance |
| `validate:journey-scene-layout` | lane grid, sizing, reserved box, motion, reduced motion, renderer safety, isolation + real-browser evidence |
| `gate:rc2-3-13r3-2-3-journey-svg-storytelling` | all of the above + release honesty, with the mutation suite |
