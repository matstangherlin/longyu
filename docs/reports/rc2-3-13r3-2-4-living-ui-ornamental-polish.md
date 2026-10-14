# RC2.3.13R.3.2.4 — Living UI, Chinese Ornamental Embroidery & Motion Delight

```text
OWNER-APPROVED PRESENTATION POLISH.
NO NAVIGATION REDESIGN. NO CURRICULUM EXPANSION. NO PEDAGOGY, MASTERY, SRS,
XP, FÔLEGO, UNLOCK, ECONOMY, SCHEMA, BILLING OR JEV CHANGE.
MOTION SYSTEM + ORNAMENT FAMILY + FEEDBACK MOTION ONLY.
PRE_BETA_FREEZE_EXCEPTION = OWNER_APPROVED_LIVING_UI_ORNAMENTAL_POLISH
```

## Parent

- PR **#354** re-queried: head `64a06df8c1d7579e53a585ab25b1c9452dfe4d29`.
- Hosted on that exact head: **19 checks green + Supabase Preview skipped (not applicable)** — CI run 38593098764, Android 38593098878, Security 38593099830. WebKit **PASS_WITH_ALLOWLISTED_ENGINE_SKIP** (the narrow LEGIT Hanzi Builder clear→rebuild skip, unchanged).
- No APK was minted for `64a06df8`: this wave is built directly on it, so the one Device-QA APK carries R.3.2.3 + R.3.2.4 together.
- #354 (R.3.2.3 and the stacked waves below it) was merged to `main` as merge commit `16a9184c` (a merge commit, so the stack SHAs the gates pin stay reachable). R.3.2.4 restarts `claude/journey-svg-storytelling-7amwba` from that `main` and lands in its own PR.

### Cross-engine failures on #354 (classified, fixed, never skipped)

| Engine | Head | Test | Classification | Fixed in |
| --- | --- | --- | --- | --- |
| Firefox | `aa801dab` | Journey scenes: no runtime fetch — the network filter also matched the mascot SVG Firefox requests | TEST_CONTRACT_STALE | `a1c5605` (filter scoped to `journey-*.svg`) |
| WebKit | `a1c5605b` | Journey scenes: one test walked all 8 matrix rows and hit the timeout | TEST_CONTRACT_STALE | `64a06df` (one test per row, robust expand-all) |

`REAL_RUNTIME_REGRESSION` = 0. New skips = 0. No `continue-on-error`, no `|| true`. The three pre-existing WebKit-only LEGIT skips (speech capture, Hanzi Builder rebuild, WebKit-only guided contract) are pinned and unchanged.

## What changed (presentation only)

| Area | Change |
| --- | --- |
| Motion system | `src/lib/motion/livingUiMotion.ts`: `MOTION_MS` mirrors the CSS tokens (instant 80 · fast 140 · normal 220 · emphasis 280 · celebrate ≤ 1100 ms), ambient band 5–10 s, one `prefersReducedMotion()` / `subscribeReducedMotion()`. Easing roles: standard, enter, exit, spring-soft, ambient. |
| Ambient budget | `ambientBudget.ts`: `MAX_VISIBLE_AMBIENT_ANIMATIONS = 4`; one shared `IntersectionObserver`, attributes written in a rAF batch (no React state, no scroll listener); paused offscreen, in a hidden document and under reduced motion. Registered: current-node halo, Journey scene drift, symbolic ornaments, mascot blink, chest glow, guide caret. |
| Ornaments | 13 embroidered SVGs in `src/assets/ornaments/chinese/` (xiangyun ×2, huiwen ×2, ruyi, lattice ×2, plum ×2, knot, seal, roof eave, bamboo), 1.3–2.9 KB, role classes → Longyu tokens, text-free, no ids. `ChineseOrnamentalFrame` / `Divider` / `CornerMotif`. |
| Surfaces | Current Journey module (huiwen frame, draws once per session) · Culture topic hero (xiangyun frame) · Culture root (lattice divider) · Victory (burst + xiangyun divider) · Review drill (ruyi corner) · Home continue card (plum corner). Never on answers, buttons, forms, settings, rows or modals. |
| Interaction | Button press/release, topic-card press 0.985 + fine-pointer lift, segment slide (no overshoot), Culture root ↔ topic 12 px direction, modal fade+scale / sheet slide, step entrance never from blank. |
| Learning feedback | Answer select press, correct check pop, error shake capped at 3 px, audio-playing ring (read-only), recording dot + bars, Hànzì stage label + builder snap. |
| Delight | Victory `CompletionBurst`: ring + seal + 6 plum petals, ≤ 1100 ms, once; no sound, no loop. Delta-only `AnimatedCounter` (TopBar) and `ProgressFill` (Culture, primitives). |
| QA | `/qa/device` → "Living UI & ornaments": every asset × tone, frame/divider sample, burst replay, live ambient readout. |

`learnerRuntimeSha` advances to `053983abf3b12463d0f3471368c99d8ccb2dbb2e`. The canonical fingerprint stays **29bb02ec0336** (generator truth — no curriculum source changed).

## Gates

| Gate | Result (local) |
| --- | --- |
| `validate:chinese-ornamental-assets` | PASS — 13 parsed · scripts 0 · externalRefs 0 · foreignObject 0 · embeddedRaster 0 · missingViewBox 0 · oversize 0 |
| `validate:chinese-ornamental-system` | PASS — registry ↔ files ↔ hosts ↔ surfaces ↔ density |
| `validate:living-ui-motion` | PASS — tokens in band, TS ↔ CSS, reduced motion, one-shot burst, delta-only |
| `validate:ambient-motion-budget` | PASS — code contract + real-browser evidence |
| `validate:motion-performance-contract` | PASS — transform/opacity only, one observer, fallbacks, 30-min session |
| `validate:ui-effect-accessibility` | PASS |
| `validate:theme-ornament-contrast` | PASS — light/dark × tone × intensity |
| `validate:rc2-3-13r3-2-4-living-ui-ornamental-polish` | PASS — release honesty |
| `test:rc2-3-13r3-2-4-living-ui-ornamental-polish` | mutation suite (≥ 120 meaningful kills required; see gate output) |

All seven validators and the mutation suite run in the hosted `experience` suite; `gate:rc2-3-13r3-2-4-living-ui-ornamental-polish` chains the R.3.2.3 gate.

## Real-browser evidence

`e2e/rc2-3-13r3-2-4-living-ui.spec.ts` runs in the Chromium, Firefox and WebKit CI projects (one test per matrix row, no engine branches). Evidence (Chromium, production build): `docs/release/evidence/rc2-3-13r3-2-4/living-ui-evidence.json`, bound to the Living UI runtime digest.

| Row | Ambient loops (max on screen / offscreen / hidden) | Halo | Ornaments | Text / CTA overlap | Host Δ | Min thread contrast | Overflow | Layout shift | AT / focus leaks |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 360x640-light | 4 / 0 / 0 | visible, breathing | 3 | 0 / 0 | 0 | 2.105:1 | 0 | 0 | 0 |
| 375x667-light | 4 / 0 / 0 | visible, breathing | 3 | 0 / 0 | 0 | 2.105:1 | 0 | 0 | 0 |
| 390x844-light | 4 / 0 / 0 | visible, breathing | 3 | 0 / 0 | 0 | 2.105:1 | 0 | 0 | 0 |
| 390x844-dark | 4 / 0 / 0 | visible, breathing | 3 | 0 / 0 | 0 | 1.743:1 | 0 | 0 | 0 |
| tablet-834x1112-light | 4 / 0 / 0 | visible, breathing | 3 | 0 / 0 | 0 | 2.105:1 | 0 | 0 | 0 |
| desktop-1280x900-light | 4 / 0 / 0 | visible, breathing | 3 | 0 / 0 | 0 | 2.105:1 | 0 | 0 | 0 |
| 360x640-large-font | 4 / 0 / 0 | visible, breathing | 3 | 0 / 0 | 0 | 2.105:1 | 0 | 0 | 0 |
| 390x844-reduced-motion | 0 / 0 / 0 | visible, still | 3 | 0 / 0 | 0 | 2.105:1 | 0 | 0 | 0 |

- Victory burst: 8 one-shot animations, last ends at **960 ms** (budget 1100), infinite 0.
- Rapid Journey ↔ Culture ×6: final `/jornada`, page errors 0, at most **0** thumb animation alive.
- Sheet ("Mais"): first option is the hit target **0 ms** after the sheet appears, while its entrance is still running (yes).
- Progress bars replayed on remount: **false**; counters animated on mount: **0** of 3.
- Emulated 30-minute session: `docs/release/evidence/rc2-3-13r3-2-4/living-ui-30min-session.json` (SESSION_LINE).

## Media

`docs/screenshots/rc2-3-13r3-2-4/`: `journey-living-ui-light.png`, `journey-living-ui-dark.png`, `journey-milestone-embroidery.png`, `journey-home-continue.png`, `culture-ornamental-topic.png` (+ dark), `culture-root-lattice.png`, `review-ornamental.png`, `victory-ornamental.png`, `large-font-ornaments.png`, `qa-ornament-gallery.png` (one shot: `/qa/device` did not pick up the seeded dark theme); videos `living-ui-journey-390.webm`, `culture-topic-motion-390.webm`, `learning-feedback-motion.webm`, `review-victory-motion.webm`, `reduced-motion-comparison-full.webm` / `-reduce.webm`.

## Honest state

```text
CHINESE_ORNAMENTAL_SYSTEM   = CODE_PASS
LIVING_UI_MOTION            = CODE_PASS
REDUCED_MOTION              = PASS
PERFORMANCE_CONTRACT        = PASS (emulated 30-min session; physical NOT_RUN)
CROSS_ENGINE                = PASS (WebKit with the narrow existing LEGIT skips)
HOSTED (this wave)          = PENDING — exact-head green required
DEVICE_QA_APK               = NOT_BUILT — ONE APK after exact-head green
PRIOR APKs                  = STALE_FOR_CURRENT_RUNTIME (fc72f9e3…, fb835ce8…)
PHYSICAL                    = NOT_RUN
LONGYU_UI_UX_FREEZE         = PENDING_OWNER_ACCEPTANCE (bound to the APK SHA256)
PLAY CLOSED BETA            = HOLD (signing secrets)
PUBLIC BETA                 = HOLD
WAVE 1                      = 0 invited
```

Owner handoff: `docs/release/OWNER_R32_4_LIVING_UI_HANDOFF.md`.
