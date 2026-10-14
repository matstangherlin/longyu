# Chinese Ornamental System — RC2.3.13R.3.2.4

A small family of embroidered ornaments — thread lines, running stitches and
French knots — drawn for Longyu and placed on a handful of **milestone**
surfaces. They make the app feel Chinese and hand-made without turning every
card into a souvenir.

> **Longyu first, Chinese second.** Ornaments use only Longyu palette roles,
> stay quieter than content, and never sit on a button, an answer, a form or a
> list row.

Sources of truth:

| What | Where |
| --- | --- |
| Assets (13 local SVGs) | `src/assets/ornaments/chinese/ornament-*.svg` |
| Registry (motif, kind, aspect, surfaces, intensities, density) | `src/components/ornaments/chinese/chineseOrnamentRegistry.ts` |
| Safe markup (refuse whole, never regex-sanitize) | `src/components/ornaments/chinese/chineseOrnamentMarkup.ts` |
| Components | `ChineseOrnament`, `ChineseOrnamentalFrame`, `ChineseOrnamentalDivider`, `ChineseCornerMotif` |
| Role → token CSS | `src/index.css`, Living UI block (`.lyo …`) |
| Inventory | `docs/release/chinese-ornamental-assets.json` (generated) |
| QA gallery | `/qa/device` → "Living UI & ornaments" |

---

## Philosophy

- **Embroidery, not print.** Every motif is a thread path (`lyo-s-thread`), a
  softer echo (`lyo-s-thread-soft`), a running stitch (`stroke-dasharray`
  dots, `lyo-s-stitch`) and a few knots (`lyo-f-knot`). It reads as stitched
  onto the card, which is why it can be pale and still be seen.
- **Inspired, not reproduced.** Motifs are drawn in the spirit of traditional
  patterns; they are not museum copies and carry no text, no Hànzì and no
  symbols that could be read as lesson content.
- **Rare by design.** Ornament marks a moment — the current module, a
  completed lesson, a Culture topic, the Review drill — so it keeps meaning.

## Motifs

| Motif | Assets | Character |
| --- | --- | --- |
| Xiangyun 祥云 (auspicious cloud) | `xiangyun-corner`, `xiangyun-divider` | soft curls; Culture hero and Victory |
| Huiwen 回纹 (meander) | `huiwen-frame`, `huiwen-strip` | squared spiral; the current Journey module |
| Ruyi 如意 | `ruyi-corner` | the lucky ruyi head; Review |
| Window lattice 窗格 | `lattice-frame`, `lattice-divider` | geometric lattice; Culture root header |
| Plum blossom 梅花 | `plum-corner`, `plum-blossom` | five petals; Home continue card, Victory petals |
| Chinese knot 中国结 | `knot-divider` | a knotted cord; Review summary / milestone |
| Seal 印章 | `seal-medallion` | a pressed square seal; the Victory burst |
| Roof eave 飞檐 | `roof-eave` | an upturned eave line; Culture hero accent |
| Bamboo 竹 | `bamboo-corner` | two stalks and leaves; Culture hero accent |

File contract (enforced by `validate:chinese-ornamental-assets`): text-free,
transparent, `viewBox` present, ≤ 8 KB (actual 1.3–2.9 KB), no ids, no
`<script>`, `<foreignObject>`, raster, external references, event handlers,
comments or SMIL, and every painted element carries a `lyo-*` role class —
never a hex color. Each file also has a standalone `<style>` (light and
`prefers-color-scheme: dark`) so it renders correctly when opened on its own;
the app strips that style and maps roles to the live theme tokens.

## Surfaces

| Surface | Host | Ornament |
| --- | --- | --- |
| `journey-milestone` | `JourneyPage` — only the module card that contains the current lesson | huiwen frame, milestone intensity; the stitch draws once per session |
| `culture-topic-hero` | `CultureTopicDetailPage` header | xiangyun frame, milestone intensity |
| `culture-root-header` | `ProgressionShell` (Culture root) | lattice divider |
| `victory` | `LessonVictory` | `CompletionBurst` (seal + plum petals, once) + xiangyun divider |
| `review-header` | `RevisaoPage` drill hero | ruyi corner |
| `home-continue` | `HomeCognitiveBlocks` continue card | plum corner |
| `qa-gallery` | `/qa/device` panel only | every asset × tone |

Forbidden (validated against the source): answer options, settings, form
fields, account screens, list rows, buttons and modals. Only the hosts above
may import an ornament component.

## Density

`ORNAMENT_DENSITY` caps placements per surface instance: one on a Journey
milestone, the Culture root, Home, the Review header and summary; two on
Victory and the Culture hero. Completed modules carry no ornament (they would
turn the path into noise); locked modules never do.

Intensity bands map to the spec's opacity bands:

| Intensity | Opacity | Band | Corner size |
| --- | --- | --- | --- |
| `subtle` | 0.16 | background 0.08–0.18 | 18 px |
| `medium` | 0.28 | surface 0.16–0.30 | 22 px |
| `milestone` | 0.55 | milestone 0.35–0.60 | 26 px (20 px on Journey, 30 px on the Culture hero) |

## Motion

- Frames on a milestone entrance draw their thread once (`stroke-dashoffset`
  100 → 0 over `--motion-emphasis`), and only once per session
  (`claimSessionOnce`). Never a loop.
- The Victory burst (ring, seal, 6 plum petals) ends within 1100 ms and never
  repeats on its own; the QA panel can replay it.
- Any looping ornament registers with the ambient budget (`kind: "ornament"`,
  lowest priority) — see `docs/ux/living-ui-motion-system.md`.
- Reduced motion: no draw, no burst; the finished ornament is shown still.

## Theme

Roles resolve to real tokens: thread → `--accent` (coral), stitch and knots →
`--gold`, wash and petals → `--accent-soft`, sage → `--good`. Tones swap the
pairing (`gold` tone: gold thread with coral stitches; `muted` tone:
`--text-faint` for locked/neutral contexts). In dark mode stitches and knots
step down to 0.62 alpha so gold never glares on near-black.
`validate:theme-ornament-contrast` computes the real thread colour (token ×
role alpha × intensity, composited on the surface) for light and dark × every
tone and intensity: each must stay visible (milestone ≥ 1.5:1, medium ≥ 1.2:1,
subtle ≥ 1.05:1), current / completed / locked must stay distinguishable, the
locked tone must be the least saturated, and dark-mode gold must not glare.

## Accessibility

- Every ornament is decorative: `aria-hidden="true"`, `focusable="false"`,
  `pointer-events: none`, `user-select: none`, never in the tab order.
- Ornaments sit **under** content (`z-index: -1` inside a `relative isolate`
  host) and inside the host's padding; the E2E matrix checks they never
  overlap text or CTAs, never change the host's size and never cause
  horizontal overflow — including at 360 px with large font.
- Meaning never depends on an ornament: the current module is still marked by
  its node, ring and label.

## Performance

- Inline SVG from local files, bundled at build time (`import.meta.glob`
  `?raw`), no network, no runtime fetch.
- Corners are mirrored with `transform`, never stretched (`preserveAspectRatio
  meet`); edges are 1 px borders, not images.
- The box is reserved before paint (dividers have a fixed height), so
  decoration causes no layout shift.

## Do / don't

| Do | Don't |
| --- | --- |
| Place an ornament on a real milestone surface | Ornament every card, button or row |
| Use `ChineseOrnamentalFrame` / `Divider` / `CornerMotif` | Inline a new SVG or a PNG |
| Pick an intensity band and a tone | Hard-code a color or an opacity |
| Keep text inside the host's padding | Let thread or corners run under text |
| Draw once, then stay still | Loop a frame or burst |
| Add new motifs through the registry + inventory | Copy a historical pattern or add Hànzì |
