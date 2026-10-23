# Premium Surface System — RC2.3.13R.3.2.5

Premium, for Longyu, means better hierarchy, spacing, feedback and material.
It does not mean more shadows, gradients, borders or animation. This page is the
contract for surfaces, elevation, borders, radii and interactive states. The
tokens live in `src/index.css` (`:root`, china and dark blocks) and are mapped in
`tailwind.config.js`.

> **One hero moment at a time.** A screen has at most one emphasis surface
> (the "do this now" card). Reward surfaces are only for real rewards. Nothing
> is glass, nothing glows, nothing blurs.

## Surface levels

| Level | Role | How |
| --- | --- | --- |
| surface-0 | page | `bg-bg` |
| surface-1 | card / grouped content | `bg-surface border-line shadow-card` (`Card`) |
| surface-2 | inset or interactive block | `bg-surface-2` |
| raised | temporary elevated content | `shadow-lift` (`--shadow-raised`) |
| emphasis | current / most important learning action | `.surface-emphasis` (accent-soft wash, accent/20 border, raised shadow) |
| overlay | modal / sheet | `bg-surface border-line shadow-overlay` over `bg-scrim/60` |
| reward | major reward only (chest opening) | `.surface-reward` (gold wash, gold/30 border, `--shadow-reward`), `rounded-4xl` |

Emphasis is used on the Home "continue" card and the Culture "continue" card,
one per screen. Reward is used on the chest-opening takeovers.

## Tokens

New in this wave (per theme; china inherits clay unless noted):

| Token | Clay / china | Dark | Why |
| --- | --- | --- | --- |
| `--scrim` | `24 26 28` | `0 0 0` | The modal backdrop was `bg-ink/65`; in dark, ink is near-white, so every dialog flashed a light-grey veil. |
| `--good-soft` / `--gold-soft` | `230 240 235` / `245 238 226` | `29 47 39` / `50 43 30` | Nine classes referenced these and rendered with no fill. |
| `--on-good` / `--on-wrong` / `--on-gold` | white | `10 11 13` | White on dark-theme good/gold was 2.9:1 / 2.1:1; the lesson "Continuar" after a correct answer was unreadable. |
| `--accent-on-soft` | `var(--accent-strong)` | `236 128 108` | The `soft` button and selected tiles were 3.1:1 in dark. |
| `--focus-ring` | `var(--accent)` | `236 128 108` | Focus rings were `accent/45` (≈2:1). Now ≥ 3:1 everywhere. |
| `--text-faint` | `108 113 116` (china `118 110 110`) | unchanged | 2.95:1 → 4.57:1: it carries small state labels. |

### Text roles

`text-accent`, `text-good` and `text-wrong` read their own text token
(`tailwind.config.js` → `theme.extend.textColor`); `bg-*`, `border-*` and
`ring-*` keep the fill. Each text token holds 4.5:1 on `bg`, `surface`,
`surface-2` and its own soft tint in every theme (`validate:text-contrast`).

| Token | Clay | China | Dark | Why |
| --- | --- | --- | --- | --- |
| `--accent-text` | `181 64 45` | `var(--accent)` | `236 128 108` | Dark accent as text was 3.8:1 on surface and 3.1:1 on accent-soft; a white label and small text can't share one red. Clay accent on accent-soft was 4.47:1. |
| `--good-text` | `42 120 81` | inherits clay | `var(--good)` | Green text was 3.9:1 on `good-soft` and 4.2:1 on the page. |
| `--wrong-text` | `178 70 49` | inherits clay | `var(--wrong)` | Coral text was 3.9:1 on `wrong-soft`. Dark `--wrong-soft` is `71 34 28` (was `87 42 34`, 4.0:1 under wrong text). |

Use `text-good` / `text-wrong`, never `text-[rgb(var(--good))]`: the arbitrary
value reads the fill and skips the text role.

## Elevation

`shadow-card` and `shadow-lift` are now CSS variables (`--shadow-rest`,
`--shadow-raised`), so dark mode composes with `ring-*` instead of overriding it.
The old `[data-theme="dark"] .shadow-card { box-shadow: … }` rule erased every
verdict ring in dark mode.

| Role | Token | Light | Dark |
| --- | --- | --- | --- |
| rest | `shadow-card` | 2-layer 3–4 % black | top highlight + deep 18 % shadow |
| raised | `shadow-lift` | 2-layer 4–6 % | top highlight + 30 % |
| overlay | `shadow-overlay` | 18 % + 6 % | top highlight + 55 % |
| reward | `shadow-reward` | gold 18 % | gold 14 % |
| dock | `shadow-dock` | upward 5 % | hairline highlight + 40 % |
| current | `shadow-current` | 3 px accent/28 ring | same |

The lesson action dock and the TabBar share `shadow-dock`. The dock had been
casting a 16 % band over every step.

## Borders

| Role | Class |
| --- | --- |
| ordinary | `border-line` |
| interactive (hover) | `hover:border-accent/25` |
| selected | `border-accent` + `ring-2 ring-accent/35` |
| current | `border-accent` + `shadow-current` |
| error | `border-wrong/25 bg-wrong-soft` |
| success | `bg-good-soft` + `ring-1 ring-[rgb(var(--good)/0.45)]` |
| ornamental | `.lyo` frames (see chinese-ornamental-system.md) |

## Radii

`lg` 12 (tags) · `xl` 14 (controls) · `2xl` 16 (cards, tiles) · `3xl` 24 (panels,
sheets) · `4xl` 28 (reward takeovers only) · `full` (pills, nodes). New code
does not add arbitrary `rounded-[Npx]`; the gate ratchets the count down.

## Interactive state matrix

| State | Button | Card / tile | Node |
| --- | --- | --- | --- |
| rest | variant colours | `border-line bg-surface` | state colours |
| hover (fine pointer) | darker fill or surface-2 | `-translate-y-px`, accent border | — |
| pressed | `scale(.98)` | `scale(.985)` / `.98` | `scale(.95)` |
| focus-visible | `ring-2 ring-focus-ring ring-offset-2` | global outline `--focus-ring` | same ring |
| selected | — | accent border + ring, label stays ink | — |
| current | — | `.surface-emphasis` | accent-soft fill + `shadow-current` + halo |
| disabled | solid line-grey pill, legible ink-soft label (filled); outline kept (bordered) | muted tokens, never `opacity-100` "looks active" | `aria-disabled`, tap reaches the caller (locked reason) |
| loading | inert, **variant colours kept**, spinner, `aria-busy` | — | — |
| success / error | `good` only after a correct verdict | tint + ring + `TileVerdictMark` (check / X) | — |

Rules:

- State is never colour alone. Verdicts carry a check or X (`TileVerdictMark`).
  Selected tiles keep their label in ink. Switches have a visible OFF track.
  Segmented controls mark the active segment with a dot.
- "Verificar" before a verdict is `primary`, never `good` (green means "right").
- `Card` `className` wins over the variant per property family (`mergeCardClasses`).
- Touch targets are ≥ 44 × 44 for important controls; small icons sit inside
  larger hit areas.

## Do / don't

| Do | Don't |
| --- | --- |
| Use `.surface-emphasis` once per screen | Give several cards `shadow-lift` + gradients |
| Use the elevation tokens | Write `shadow-[0_-10px_28px_…]` |
| Use `bg-scrim/60` behind dialogs | Use `bg-ink/…` as a scrim |
| Use `text-on-good` / `text-on-wrong` / `text-on-gold` on those fills | Hard-code `text-white` on theme fills (white is for `bg-accent`) |
| Use solid `bg-bg` / `bg-surface` bars | Use translucent bars with `backdrop-blur`, or `blur-*` glow blobs |
| Use `bg-good-soft` behind green text | Mix denser `bg-[rgb(var(--good)/0.18)]` tints under it |
| Express tone through `Card` variants | Fight the variant with colour classes |
| Use theme tokens | Hard-code `#B7791F` / `#B42318` |
