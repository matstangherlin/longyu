# Chinese Living Canvas — RC2.3.13R.3.2.6

Owner request: "melhorar o design, com estética bem chinesa, as bordas devem
estar melhores, os SVG integrados nas abas Jornada e Cultura (lado direito e
esquerdo) animados, deixar o site/app mais vivo."

Priority, always: **CONTENT > STRUCTURE > AMBIENCE.** The living layer is
calm, purposeful and budgeted; it never carries state, blocks input or costs
battery when nobody is looking.

## What changed

1. **Living scenes (Journey lanes).** The 16 bundled scenes move by their
   subject — lanterns sway, steam rises, the train passes, clouds drift, the
   brush stroke draws itself once. The whole-scene float is retired. See
   [scenic-motion-profiles.md](scenic-motion-profiles.md).
2. **Culture.** Lane ornaments move their own motif (lantern sways, cloud
   drifts, blossom breathes; seal, knot and moon gate stay still); each topic
   opens on its own motif sequence. Each topic hero carries one thematic
   living scene (`CULTURE_TOPIC_VISUAL`) on a static 宣纸 paper grain, inside a
   Heritage frame. Topic cards gain a stronger rest border, a lacquer line on
   hover and a gilt seal around the line icon — no frame, no scene.
3. **Frames.** One frame language in three levels — Whisper, Heritage,
   Ceremony. See [chinese-frame-system.md](chinese-frame-system.md).
4. **Guidance arbitration.** One primary guide surface at a time, by a fixed
   ladder: critical onboarding > the page's own first-visit guide (marked
   `data-first-visit-guide`) > optional contextual guidance. On the first
   Culture visit the in-page guide owns the visit, so the global coachmark
   waits for the next one; it steps aside for critical onboarding and any
   ceremony, is remembered per account on this device (no replay on a cold
   start), and its Continue is secondary. Guides (GuideDialogue,
   TeacherSpeechBubble) type only once ≥ 60 % on screen in a visible document,
   start once, never restart on scroll, hold one "floor" so two never type at
   once; Continue while waiting shows the whole line; reduced motion never
   waits.
5. **Progression polish.** Connector states are calm solids — complete
   (accent), the lead-in to the current node (subtle accent), open, locked
   (muted); the Journey axis draws its completed part to the current node.
   When a node completes in this session (back from a Victory) it plays ONE
   moment — the ring settles, the check appears, a tiny sparkle, the line
   fills (≤ 1.1 s) — never on a cold start, a remount or under reduced
   motion, and never under another ceremony (it waits for the milestone or
   streak screen to close). The current node's halo stays the only
   continuous emphasis.
6. **Typography and icons.** Canonical UI speaks one icon family (Longyu line
   icons, plus five Chinese icons in the same stroke: moon, pagoda, brush,
   seal, train). No emoji as nav/status/collection icons. No text below 10 px.
   Hanzi on learning surfaces is never caption-sized; pinyin stays beneath
   Hanzi. Fonts: Inter + Noto Serif SC (+ system fallbacks) only.
7. **UX debt.** Honest Android export copy (download on web; copied to the
   clipboard or "web only" on Android); the Danger Zone appears only for cloud
   accounts.

## Budget (unchanged ceiling, new shape)

- ≤ 4 ambient owners on screen; ≤ 2 scenes and ≤ 2 lane ornaments; the
  current Journey node first.
- ≤ 4 looping parts per owner → ≤ 16 raw loops; unbudgeted loops = 0.
- Offscreen, hidden tab and reduced motion: 0 loops (the authored drawing).
- One shared IntersectionObserver (`ambientBudget.ts`); parts never register
  on their own.

## Density

- One structural frame per screen; never on ordinary cards or lesson tasks.
- One living scene per Culture topic page, only in its hero.
- Never Ceremony + a living scene + the mascot on one screen.

## Mobile, themes, accessibility

- 360 px first: the hero scene is 5.5 rem (7 rem from 640 px); frames sit
  inside each host's radius and padding.
- Clay, china and dark use the same tokens (`--gilt`, `--frame-line`,
  `--line-strong`); contrast is measured by the frame gate.
- Every ornament and scene is `aria-hidden`; frames are not focusable and do
  not intercept pointer events; reduced motion keeps the art, stops the motion.

## QA

`/qa/device` → Living Canvas Lab (scenes, profiles, budget snapshot) and
Border Lab (Whisper/Heritage/Ceremony in every theme).

## Gate

`gate:rc2-3-13r3-2-6-chinese-living-canvas` — validators
`scenic-motion-profiles`, `animated-svg-role-contract`,
`ambient-scene-ownership`, `chinese-frame-system`, `chinese-visual-density`,
`guidance-arbitration`, `typography-icon-audit`, `progression-living`, plus
release honesty and ≥ 180 mutation kills.
