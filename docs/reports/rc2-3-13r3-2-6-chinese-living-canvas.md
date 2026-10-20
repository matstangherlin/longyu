# RC2.3.13R.3.2.6 — Chinese Living Canvas, Animated Scenic SVGs & Ornamental Frame System

Owner-requested presentation wave on top of R.3.2.5 (#356, merged to main as
`98967c39`). There is no navigation, curriculum, pedagogy, mastery, SRS, XP,
Fôlego, unlock, economy, grant-timing, schema, billing or JEV change.

## Parent: #356

Before branching, #356 was re-queried. Its exact head `0fc1353` was green on
CI, security and Android (runs 38896588428, 38896588430, 38896588453). It was
merged with a merge commit. No disposable #356 APK was built. Its cert now
records that hosted PASS and the merge.

## What the learner sees

- **Living scenes (Journey lanes).**
  - The 16 scenes move by their subject: lanterns sway ±1.5°, steam rises, bamboo leans ≤ 1°, the train glides and rests ≥ 64 % of its cycle, water ripples, windows breathe, clouds drift 14 units, and the brush stroke draws itself once.
  - The whole-scene float is retired.
  - Each part has a neutral pose. A scene that loses its slot rests on the authored drawing, never on a tilted lantern.
  - Scenes enter once from their own side (left −6 px, right +6 px, ≈ 312 ms).
- **Culture.**
  - Lane ornaments move their own motif (lantern, cloud, blossom, sway); seal, knot and moon gate stay still.
  - Each topic opens on its own motif sequence.
  - Each topic hero carries one thematic living scene on a static 宣纸 paper grain, inside a Heritage frame.
  - Topic cards get a stronger rest border, a lacquer line on hover and a gilt seal around the icon.
- **Frames.** One frame language in three levels:
  - **Whisper:** the Home continue card.
  - **Heritage** (a solid gilt inner rule whose 回纹 key-fret hooks grow out of it): the current Journey module, the Culture topic hero, Review start and Review summary.
  - **Ceremony** (ruyi-cloud corners): Victory and the chest reward hero.
  - Frames use theme tokens and vector masks. They make one entrance, never loop, never take taps and never cover text. Per-surface insets keep the hooks clear of CTAs and the close button.
- **Progression.**
  - Connectors are calm states (complete, lead-in, open, locked); the Journey axis draws its completed part to the current node.
  - A node completed in this session plays one moment (≤ 1.1 s): the ring settles, the check appears, a tiny sparkle, the line fills.
  - It never plays on a cold start, a remount, under reduced motion or under another ceremony.
- **Guidance.**
  - One primary guide surface at a time (critical > page first-visit > optional). The first Culture visit belongs to its own guide, remembered per account.
  - Guides type only once seen (≥ 60 % on screen, visible document), start once and never restart.
- **Typography and icons.**
  - Five Chinese line icons (moon, pagoda, brush, seal, train) in the Longyu stroke family replace placeholder emoji: the More-hub lock, the Culture card dragon and the collection icons.
  - 8–9 px labels are raised to 10 px.
  - Hanzi help chips are raised to 18 px and immersion cast Hanzi to 14 px.
  - Culture eyebrows use the type roles.
- **UX debt.**
  - Honest Android export copy: download on web; copied to the clipboard, or "web only", on Android.
  - The Danger Zone appears only for cloud accounts.

## Budget

| | Ceiling | Measured (Chromium, 390×844) |
| --- | --- | --- |
| Ambient owners | ≤ 4 | see `living-canvas-evidence.json` |
| Scenes running | ≤ 2 | idem |
| Lane ornaments running | ≤ 2 | idem |
| Raw loops (owners × parts) | ≤ 16 | idem |
| Unbudgeted loops | 0 | 0 |
| Offscreen / hidden tab / reduced motion | 0 | 0 |

## Bundle

No new dependency, no motion library: CSS, the Web Animations already in the
engine and the existing hooks. Production build vs `main` (`98967c39`):

| | main | R.3.2.6 | Δ |
| --- | --- | --- | --- |
| JS (raw / gzip) | 6 134 011 / 1 829 784 B | 6 157 292 / 1 836 960 B | +23.3 KB / +7.2 KB (+0.38 %) |
| CSS (raw / gzip) | 135 555 / 23 069 B | 151 315 / 25 755 B | +15.8 KB / +2.7 KB |

Scene SVGs gained only `<g class="scene-…">` wrappers. Motion logic activates
only where a scene, ornament or guide mounts.

## Gate

`gate:rc2-3-13r3-2-6-chinese-living-canvas` runs:

- the validators:
  - `scenic-motion-profiles`
  - `animated-svg-role-contract`
  - `ambient-scene-ownership`
  - `chinese-frame-system`
  - `chinese-visual-density`
  - `guidance-arbitration`
  - `typography-icon-audit`
  - `progression-living`
- release honesty;
- the mutation suite (≥ 180).

Behaviour is executed wherever it can be:

- the ambient allocation and scheduler slot release;
- the guide start rule, against a fake IntersectionObserver and a hidden document;
- the connector state function;
- the completion-moment session memory;
- token contrast;
- keyframe neutral poses, amplitudes and durations.

Machine registries (`docs/release/scenic-motion-registry.json`, `docs/release/chinese-frame-contract.json`) are generated from the code, and drift fails the gate.

## Evidence

- E2E: `e2e/rc2-3-13r3-2-6-living-canvas.spec.ts`, Chromium, Firefox and WebKit in CI. It covers:
  - the budget sweep;
  - hidden tab and reduced motion;
  - the neutral frame after slot loss;
  - entrance side and CLS;
  - the Culture hero;
  - frames vs taps/focus/aria in clay and dark;
  - the completion moment end to end (Victory → Journey; once, ≤ 1.1 s, never again);
  - connector states and the axis fill;
  - guide tests in `e2e/guided-journey-culture.spec.ts` (below the fold, never restarts, Continue while waiting, reduced motion).
- Screenshots and videos: `docs/screenshots/rc2-3-13r3-2-6/`.
- R.3.2.3 layout evidence and the R.3.2.4 living-UI evidence and emulated 30-minute session were re-recorded for this runtime.
- QA: `/qa/device` › Chinese Living Canvas Lab and Chinese Frame Lab.

## Honesty

- Physical device: **NOT_RUN** (owner, on the ONE Device-QA APK minted after exact-head hosted green).
- The 30-minute session here is engine-emulated, never physical.
- `LONGYU_UI_UX_FREEZE` stays `PENDING_OWNER_ACCEPTANCE`.
- Public Beta and Play: **HOLD**.
- Not done, by design:
  - no Culture-root watermark (density);
  - no Whisper corner on the Culture continue card (it would need a new ornament host and surface for a marginal gain).
