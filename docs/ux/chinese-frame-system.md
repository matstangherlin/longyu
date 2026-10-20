# Chinese frame system — RC2.3.13R.3.2.6

Source of truth: `src/components/ornaments/chinese/ChineseOrnamentalFrame.tsx`
(`level` prop), `src/styles/chinese-frames.css`, theme tokens `--gilt`,
`--frame-line`, `--line-strong` in `src/index.css`.
Machine mirror: `docs/release/chinese-frame-contract.json`.

An authored frame language, not a corner icon pasted on a card.

## Levels

| Level | Drawing | Where |
| --- | --- | --- |
| 1 · Whisper | one corner motif (`ChineseCornerMotif`), no rule | Home continue card |
| 2 · Heritage | lacquer outer border + a solid gilt inner rule (双线框) whose 回纹 key-fret hooks grow out of the rule at each corner | current Journey module, Culture topic hero, Review correction-round header, in-lesson error-review summary |
| 3 · Ceremony | the same double rule with ruyi-cloud corners (24 px) | Victory, chest reward hero |

The corner is structure: the hook's first stroke lies on the inner rule
(`M16 .5H.5V16`), and the rule's edges stop exactly at `--cframe-hook`, so
line and corner meet without a gap or an overlap.

## Rules

- Drawn inside the existing ornament overlay (`z-index: -1` in an isolated
  host): never a host `box-shadow`, never extra text, never focusable,
  `pointer-events: none`, `aria-hidden`.
- Colour is a theme token (`rgb(var(--gilt))`); hooks are vector masks
  (`mask` + `-webkit-mask`), so they follow clay, china and dark. No raster,
  no hex.
- Per-surface insets keep each hook inside its host's radius and clear of
  text and controls (Review header 6 px, summary 8 px, Victory 10/10/6 px,
  reward hero inside the safe areas on phones).
- At most one entrance per mount (`data-animate="once"`, `cframe-settle`), only
  where the host passes `animated` (current module, Victory, chest reward);
  never a loop; static under reduced motion.
- Never on ordinary cards, lesson tasks, topic cards, buttons or list rows.
  One structural frame per screen (Journey, Culture topic, Victory).

## Contrast

Gilt over surface at milestone alpha must stay visible (≥ 1.6:1) in clay and
dark, and never blinding in dark (≤ 6:1). Measured by
`validate:chinese-frame-system`.

## Validators

`validate:chinese-frame-system`, `validate:chinese-visual-density`.
