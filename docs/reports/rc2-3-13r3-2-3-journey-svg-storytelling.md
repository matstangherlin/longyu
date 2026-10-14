# RC2.3.13R.3.2.3 — Journey SVG Visual Storytelling & Final Beta Candidate

```text
OWNER-APPROVED FINAL VISUAL ASSET WAVE.
NO NAVIGATION REDESIGN. NO CURRICULUM EXPANSION. NO PEDAGOGICAL RULE CHANGE.
NO MASTERY CHANGE. NO ECONOMY CHANGE.
CUSTOM JOURNEY SVG ASSETS + FINAL RELEASE CANDIDATE ONLY.
PRE_BETA_FREEZE_EXCEPTION = OWNER_APPROVED_JOURNEY_SVG_VISUAL_STORYTELLING
```

## Parent

- PR **#353** re-queried: head `05bcf51e5897982dbe15af98e38e8c9d1b37edd1` (unchanged since planning).
- Hosted on that exact head: **19 checks green + Supabase Preview skipped (not applicable)** — Release Truth, Security (gitleaks, npm audit, CodeQL), all beta suites, quality/build, Android foundation + runtime, Chromium, Firefox, WebKit (**PASS_WITH_ALLOWLISTED_ENGINE_SKIP**: the LEGIT Hanzi Builder clear→rebuild skip in `e2e/v494-builder-ux.spec.ts`, kept explicit, narrow and WebKit-only).
- No #353 Device-QA APK was minted: this wave started before a #353 physical candidate was certified, so one final APK is minted after this wave's exact-head hosted green.
- All #353 runtime hardening is inherited unchanged (this branch is built on `05bcf51e`).

## What changed (presentation only)

| Area | Change |
| --- | --- |
| Assets | 16 hand-authored `.svg` scenes in `src/assets/journey/scenes/` — the 12 specified + 4 owner-requested landmarks (Buddhist temple, Sun Wukong, lucky cat, Great Wall). True vectors, text-free, transparent, 320×240, 4.2–5.9 KB each. |
| Owner feedback | Scenes enriched with real Chinese references (pagoda through the moon gate, Guilin karst + conical-hat raftsman, paifang arch, couplets + 福 diamonds, pavilion); **moonlit dark mode** after "no modo dark tá horrível / tá tudo escuro"; **embroidered review medallion** after "bordados bonitos na bolinha final de revisão". |
| Registry | `journeySceneRegistry.ts` — typed ids, files, themes, regions, density; `JOURNEY_SCENE_PACK_VERSION = 1`. |
| Mapping | `journeyScenePlan.ts` — deterministic: 40 scenes over 171 progression stops (1 per 4.3), alternating sides, storytelling regions by phase, semantic module sequences, never consecutive rows, never the same scene twice in a row. |
| Rendering | `JourneyScene` (bundled `?raw`, guarded inline markup, decorative, reduced-motion aware, one-time reveal) inside `JourneyLaneRow` side lanes; the center lane never moves. |
| Ornaments | Journey ornaments moved into lane cells, kept ≥ 2 rows from scenes, opposite lane; Culture unchanged (no scenes there). |
| Review node | `ProgressionReviewMedallion` — lotus rosette, French-knot stitch ring, ruyi knots; own 84 px box; muted when locked. |
| QA | `/qa/device` → "Journey SVG scenes": pack identity + all 16 scenes in the live theme for physical judging. |

`learnerRuntimeSha` advances to the runtime commit of this wave (see certification). The canonical fingerprint stays **29bb02ec0336** (generator truth — no curriculum source changed).

## Gates

| Gate | Result (local) |
| --- | --- |
| `validate:journey-svg-assets` | PASS — 16 parsed · externalRefs 0 · scripts 0 · foreignObject 0 · embeddedRaster 0 · missingViewBox 0 · oversize 0 · duplicateIds 0 |
| `validate:journey-svg-style` | PASS — roles ⊂ Longyu tokens, light + moonlit-dark contrast from real tokens |
| `validate:journey-scene-registry` | PASS — registry ↔ files ↔ inventory ↔ deterministic plan |
| `validate:journey-scene-layout` | PASS — lane contract + real-browser evidence |
| `test:rc2-3-13r3-2-3-journey-svg-storytelling` | mutation suite (see gate output; ≥ 80 kills required) |

E2E `e2e/rc2-3-13r3-2-3-journey-svg-storytelling.spec.ts` runs in the Chromium, Firefox and WebKit CI projects. Locally (Chromium, production build, every module expanded, 40 scenes per row):

| Row | Overlaps (node/label/CTA/card/ornament) | Overflow | Axis Δ | Node jump | Scene px (w×h) |
| --- | --- | --- | --- | --- | --- |
| 360×640 light | 0/0/0/0/0 | 0 | 0 | 0 | 92 × 69 |
| 375×667 light | 0/0/0/0/0 | 0 | 0 | 0 | 99.5 × 75 |
| 390×844 light | 0/0/0/0/0 | 0 | 0 | 0 | 107 × 80 |
| 390×844 dark | 0/0/0/0/0 | 0 | 0 | 0 | 107 × 80 |
| tablet 834×1112 | 0/0/0/0/0 | 0 | 0 | 0 | 136 × 102 |
| desktop 1280×900 | 0/0/0/0/0 | 0 | 0 | 0 | 136 × 102 |
| 360×640, 130 % text | 0/0/0/0/0 | 0 | 0 | 0 | 66 × 49 |
| 390×844 reduced motion | 0/0/0/0/0 | 0 | 0 | 0 | 107 × 80 (0 animating) |

Evidence: `docs/release/evidence/rc2-3-13r3-2-3/journey-scene-layout.json` (bound to the scene runtime digest), screenshots and scroll video in `docs/screenshots/rc2-3-13r3-2-3/`.

## Honest state

```text
HOSTED                 = PENDING (exact head of this wave)
JOURNEY_SVG_SYSTEM     = CODE_PASS
DEVICE_QA_APK          = NOT_BUILT (one APK after hosted green)
PHYSICAL               = NOT_RUN
OWNER_QA_ENTRY         = HOLD (until the one Device-QA APK exists)
PLAY                   = HOLD
PUBLIC_BETA_ENTRY      = HOLD
Wave 1 invited         = 0
```

Android WebView rendering (gradients, theme, transforms, sizing) is verified by the owner on the physical device; the emulator never counts as physical PASS.
