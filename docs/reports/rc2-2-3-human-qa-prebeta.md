# RC2.2.3 — Human QA Pre-Beta + Pedagogical / Usability / A11y Sanity

**Kind: PRE_CERTIFICATION_HUMAN.** Proves the *experience* kit and honesty gates — not Public Beta GO.

| Formal check | Remains |
|---|---|
| `cloud_auth` | `pass: false` · `DEFERRED_UNTIL_QA_CANDIDATE` |
| `cloud_sync` | `pass: false` · `DEFERRED_UNTIL_QA_CANDIDATE` |
| `feedback_backend` | `pass: false` · `DEFERRED_UNTIL_QA_CANDIDATE` |
| `android_real_device` | `pass: false` |
| `ios_real_device` | `pass: false` |
| `pwa_upgrade` | `pass: false` |
| `rollback_drill` | `pass: false` |

**Human QA PASS ≠ Public Beta GO.** Cloud, physical devices, real PWA upgrade, and real rollback still required.

**Verdict: NO-GO.**

---

## Stack

| | |
|---|---|
| PR base | #274 `cursor/rc2-mobile-pwa-preflight-5b4f` |
| `STACK_BASE_SHA` / #274 inherited HEAD | `d9c7887e60442013cab1d54f15eee7ce6fdb9390` |
| Branch | `cursor/rc2-human-qa-prebeta-5b4f` |
| Environment | `LOCAL_PREVIEW_ONLY` |
| Shareable build for external testers | **No** → `EXTERNAL_TESTERS_BLOCKED_SHAREABLE_BUILD` |
| Fingerprint | `516692632525` |
| FEATURE_FREEZE | `PUBLIC_BETA` |
| Curriculum | 134 lessons · 113 topics · 30 CultureItems · 30 Native · 20 Journey Culture nodes |
| Runbook revision | `docs/BETA_HUMAN_QA_RUNBOOK.md` (PUBLIC_BETA_CORE, 2026-09-17) |

Did **not** wait for #274 merge, did **not** return to `main`, did **not** resolve Supabase QA, did **not** use production as cloud QA, did **not** invent human PASS.

---

## Delivered

| Item | Path |
|---|---|
| Modernized human runbook | `docs/BETA_HUMAN_QA_RUNBOOK.md` |
| Canonical bug log (severity) | `docs/BETA_BUG_LOG.md` |
| Human QA manifest | `docs/release/human-qa-prebeta.json` |
| External tester kit | `docs/release/beta-tester-instructions.md` |
| Honesty gate | `npm run validate:human-qa-prebeta` / `test:human-qa-prebeta` |
| Pinch / iOS meta audit notes | `docs/REAL_DEVICE_QA.md` rows 9–10 → **PASS_CODE** |

---

## Environment decision (P3)

| Option | Result |
|---|---|
| A stable branch preview | Not available as shareable non-prod URL in this agent slot |
| B local dev/build | Available for founder / `LOCAL_HUMAN_PREFLIGHT` |
| C LAN preview | Possible locally; not provisioned here |
| D other non-cloud preview | None configured |

**External testers:** `BLOCKED_EXTERNAL` / `BLOCKED_SHAREABLE_BUILD`.  
**Founder QA:** may proceed on local — status remains `NOT_STARTED` until a human executes (agent does not mark PASS).

---

## Accessibility / PWA code audits

| Audit | Result | Evidence |
|---|---|---|
| Pinch zoom (`user-scalable=no` / `maximum-scale=1`) | **PASS_CODE** | `index.html` viewport = `width=device-width, initial-scale=1.0, viewport-fit=cover` |
| iOS PWA legacy metas | **PASS_CODE** | `apple-mobile-web-app-capable`, `status-bar-style`, `title` present |
| Reduced motion | OS preference remains authority — no new in-app toggle (P21) | GuideDialogue already respects reduced motion (#274 stack) |

No product redesign. No new feature. Formal device/PWA checks stay `false`.

---

## Session statuses (honest)

| Area | Status |
|---|---|
| B001 | `CODE_READY_AWAITING_PHYSICAL` — emulação ≠ PASS |
| B002 | `CODE_READY_AWAITING_HUMAN` |
| L1–L20 | `NOT_STARTED` |
| GuideDialogue human | `NOT_STARTED` |
| Culture Moments / Hub | `NOT_STARTED` |
| Review / Reforço+ / Victory / Nav | `NOT_STARTED` |
| Product truth human | `NOT_STARTED` |
| Founder QA | `NOT_STARTED` |
| External tester batch (1–5) | **0** · blocked shareable build |
| `externalTesterCount` | `0` (not invented) |

---

## Bug triage snapshot

| Sev | Open | Notes |
|---|---:|---|
| P0 | 1 | B003 code-ready; awaits physical iPhone |
| P1 | 5 | B001, B002, B004, PED-005, QA-008 |
| P2 | 2 | VIS-006/007 code-fixed; human/device confirm still open in spirit of log |
| P3 | 0 | |

P0/P1 **not** auto-closed by this remessa. Allowed fixes limited to P0/P1/a11y blockers — pinch/iOS already correct in code (no further product change).

---

## Stripe / Family / Business

| Item | Free Public Beta |
|---|---|
| Stripe Test Mode | **NOT REQUIRED FOR PUBLIC_BETA_CORE** |
| Family | planned — not self-serve |
| Business | pilot — not self-serve |

---

## Gates

| Gate | Expectation |
|---|---|
| `validate:human-qa-prebeta` | PASS (honesty + a11y contracts) |
| `test:human-qa-prebeta` | PASS (mutation kills) |
| `validate:beta` | PASS · fingerprint `516692632525` |
| `gate:mobile-pwa-preflight` | PASS (inherited #274) |
| Formal cloud/device/PWA/rollback | remain `false` |

---

## Mutations refused by gate (sample)

Automation marks human PASS · Playwright as tester · seeded L1–L20 · fake 5 testers · P0+PASS · P1 without waiver · Stripe required · cloud PASS from local · emulation flips formalPass · pinch re-blocked · iOS meta removed · fingerprint drift · verdict GO.

---

## Remaining blockers (next phases)

1. **Return to RC2.2.1 / #273** — unlock QA candidate project / Supabase QA / Netlify candidate → `cloud_auth` / `cloud_sync` / `feedback_backend`.
2. **RC2.2.2B** — formal Android / iPhone / PWA N→N+1 / Netlify rollback.
3. Founder L1–L20 + B002 on local when human available; external batch when shareable build exists.
4. **RC2.3** — squash → capture final `main` SHA → redeploy sensitive evidence → `gate:public-beta-core`.

**STOP:** no further QA / mobile scaffolding remessas after this one.

---

## FINAL_HEAD

Filled after validate:beta green on this branch tip.
