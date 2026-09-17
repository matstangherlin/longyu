# RC2.1.2 — Guide Motion Polish + Public Beta Feature Freeze

## Stack

| Field | Value |
|---|---|
| STACK_BASE_SHA | `248add6145bc4be94a42f28638089257fb6be8f6` (#269 inherited HEAD) |
| Branch | `cursor/guide-motion-beta-freeze-5b4f` |
| PR base | `cursor/guided-journey-culture-5b4f` (not `main`) |
| CURRICULUM_FREEZE | `RC2_CONTENT_FREEZE` |
| FEATURE_FREEZE | `PUBLIC_BETA` |
| Fingerprint before | `516692632525` |
| Fingerprint after | `516692632525` |

#269 GuideDialogue mechanics are preserved — this remessa adds entrance life + freeze only.

## GuideDialogue motion

| Piece | Behavior |
|---|---|
| Mascot entrance | `guide-mascot-in` — opacity + translate3d + scale (~220ms) |
| Bubble entrance | `guide-bubble-in` — delayed ~80ms (~180ms) |
| Continue | Enters with bubble; never hidden until text completes |
| Typewriter | Starts immediately on mount (first letter ≪ 350ms) |
| Presentation state | `data-guide-motion=entering\|ready` (separate from pedagogy) |
| Message 2+ | Text swap micro-fade only — **no** mascot re-entrance |
| Complete click | Cursor gone + 100ms settle — no flash/shake |
| Blink | Existing eyes overlay after `ready` (`data-mascot-motion=eyes-only`) |
| Reduced motion | Instant `ready`; no entrance/bob/cursor anim |
| Dependencies added | **0** (no Framer / GSAP / Lottie) |

## PUBLIC_BETA_CORE

| Item | Value |
|---|---|
| Profile | `PUBLIC_BETA_CORE` |
| Manifest | `docs/release/public-beta-core.json` |
| Library | `src/lib/publicBetaCore.ts` |
| Gate | `gate:public-beta-core` |
| Required | cloud_auth, cloud_sync, feedback_backend, android/ios real device, pwa_upgrade, rollback_drill |
| Conditional | league_cloud_smoke only if League publicly enabled |
| Commercial conditional | Stripe / Family / Business — **skipped** while offers stay planned/pilot |
| Product Truth | journey/free available · Pro/Family planned · Business pilot |
| Verdict today | **NO-GO** (expected — candidate SHA empty, core checks false) |

## Feature freeze

After this stack: **zero new product features** before public beta.

Allowed: P0/P1 blockers, security, a11y, auth/sync, devices, release tooling, QA fixes.  
Forbidden: new lessons, CultureItems, exercise modes, AI, gamification, commercial launches, new History/festival content, new mascot.

Frozen metrics: 134 / 113 / 30 / 30 / 20 · fingerprint `516692632525`.

## Roadmap embed

1. RC2.1.2 Motion + Feature Freeze ← current  
2. RC2.2 Candidate Infrastructure  
3. RC2.2.1 Cloud Evidence  
4. RC2.2.2 Devices + PWA + Rollback  
5. RC2.2.3 Human QA  
6. RC2.3 Final Candidate  
7. V5.0 Public Beta  

Future `release_candidate_sha` = HEAD after this stack (or release-config-only follow-up) — **not** `7acd074` / `248add6`.

## Counts

| Metric | Before | After |
|---|---|---|
| Core lessons | 134 | 134 |
| Teaching topics | 113 | 113 |
| CultureItems | 30 | 30 |
| Culture native lessons | 30 | 30 |
| Journey culture nodes | 20 | 20 |
| Culture Moments | 5 | 5 |

## Gates / tests

- `validate:guide-dialogue-motion` / `test:guide-dialogue-motion` — PASS
- `validate:public-beta-feature-freeze` — PASS (`FEATURE_FREEZE=PUBLIC_BETA`)
- `validate:public-beta-core` / `test:public-beta-core` — PASS (mutations + expected NO-GO)
- `gate:public-beta-core` — PASS (contract green; GO still NO until cloud/device/candidate)
- `validate:rc2-content-freeze` — PASS · fingerprint `516692632525`
- `validate:commercial-product-truth` — PASS (Pro/Family planned · Business pilot)
- E2E `e2e/guided-journey-culture.spec.ts` — **8 passed** (Chromium + WebKit)
  - teach intro: Continuar during typing → complete; second click advances
  - reduced motion: phase complete + motion ready
  - Continue during entrance still completes typing
  - Journey Culture Moment → Guide → Hub+Journey completion

## Evidence

| Artifact | Notes |
|---|---|
| Desktop Guide ready | `rc212-desktop-guide-ready.png` |
| Mobile 390×844 Guide | `rc212-mobile-guide-ready.png` |
| Culture Moment Guide | `rc212-culture-guide-ready.png` |
| Manual demo clip | `rc212-guide-entrance-demo-clip.mp4` |

## Close

| Field | Value |
|---|---|
| FINAL_HEAD | `af13cf27335b5f8d2533324975843093843f699a` |
| Candidate SHA | still empty — capture only in RC2.2 after this stack |
| Next remessa | RC2.2 — Public Beta Candidate Infrastructure |

**STOP:** after merge of this stack — zero new product features before public beta. Question becomes: which blocker prevents GO?
