# Scenic motion profiles — RC2.3.13R.3.2.6

Source of truth: `src/features/journey/scenes/sceneMotionProfiles.ts` (scenes),
`src/components/progression/symbolicOrnaments.tsx` (`ORNAMENT_MOTION_PROFILE`,
lane ornaments) and `src/styles/living-canvas.css` (the motion itself).
Machine mirror: `docs/release/scenic-motion-registry.json`, regenerated with
`node scripts/rc2-3-13r3-2-6-chinese-living-canvas.mjs registry --write` and
checked for drift by the release gate.

## The rule

A scene never bobs as a whole. Each scene names one **profile** — the subject
that is alive in the drawing — and the **parts** that carry it. Parts are
`<g class="scene-<part>">` wrappers around consecutive top-level elements of
the bundled SVG, so paint order is unchanged. CSS animates a part only while
its scene owns an ambient slot.

## Profiles

| Profile | Subject | Scenes |
| --- | --- | --- |
| `lantern-sway` | lanterns hang from a cord and sway ±1.5° | lantern-street, market, courtyard |
| `steam` | steam rises and dissolves | tea-table, buddhist-temple (incense) |
| `sway` | bamboo/leaves/tassel move in a breeze (≤ 1.2°) | bamboo-mountains, moon-gate, lucky-cat |
| `train-pass` | the train glides 10 units, then rests ≥ 64 % of the cycle | high-speed-rail |
| `city-glow` | windows and screens breathe | modern-city, night-street, digital-life |
| `water` | ripples glide, a boat rocks | river-bridge |
| `ink-reveal` | the brush stroke draws itself **once** | brush-seal |
| `float` | the figure breathes on its cloud (3 units, no bounce) | sun-wukong |
| `cloud-drift` | clouds drift 14 units and return seamlessly | great-wall |
| `blossom-breathe` | blossoms breathe (lane ornament) | — |
| `still` | nothing loops | moon-gate/seal/knot ornaments |

## Parts and their neutral pose

Every loop starts and ends at the part's neutral pose (`SCENE_PART_NEUTRAL`):
the authored drawing. When a scene loses its slot mid-loop the budget writes
`data-ambient="rest"`, the loop stops and the learner sees the authored still
frame — never a tilted lantern or a half-faded cloud.

`cloud, leaf, lantern, steam, water, light, accent, flag, bird, train, boat,
paw, ink, cloth, float, star, blossom` — each with a neutral pose, at most four
looping parts per scene (`MAX_AMBIENT_PARTS_PER_OWNER`).

## Timing

- Durations are motion tokens only (`--motion-ambient`, `--motion-ambient-slow`,
  `--motion-ambient-current`, `--motion-emphasis`), 5–14 s per loop.
- Neighbouring parts of one scene are desynchronised by `scene-phase-2/3`
  (`--scene-phase-step`); scenes are desynchronised by their ordinal phase.
  No `Math.random`, no `Date.now`.
- Transform and opacity only; no layout properties, no filters, no blur.

## Entrance

Once per session, from the lane's own side: left scenes from −6 px, right
scenes from +6 px, `calc(var(--motion-emphasis) * 1.3)` (≈ 312 ms, inside the
280–420 ms band). Reduced motion: no translation.

## Budget

One scene = one ambient owner (`useAmbientMotion(…, "scene")`), whatever its
parts. Owners ≤ 4 on screen, scenes ≤ 2, lane ornaments ≤ 2, the current node
first. Offscreen, hidden tab and reduced motion run 0 loops.

## Validators

`validate:scenic-motion-profiles`, `validate:animated-svg-role-contract`,
`validate:ambient-scene-ownership` (see
`scripts/lib/rc2-3-13r3-2-6-living-canvas-gates.mjs`).
