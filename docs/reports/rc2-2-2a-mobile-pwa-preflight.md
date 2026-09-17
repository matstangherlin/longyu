# RC2.2.2A — Mobile + PWA + Rollback Preflight

**Kind: PRE_CERTIFICATION.** Candidate QA still `BLOCKED_CREDENTIALS` (#273).
This remessa does **not** close formal operational checks.

| Formal check | Remains |
|---|---|
| `android_real_device` | `pass: false` |
| `ios_real_device` | `pass: false` |
| `pwa_upgrade` | `pass: false` |
| `rollback_drill` | `pass: false` |

Emulation / local N→N+1 is labeled `CHROMIUM` / `WEBKIT` / `LOCAL_PREFLIGHT` — never physical candidate PASS.

---

## Stack

| | |
|---|---|
| PR base | #273 `cursor/rc2-cloud-certification-5b4f` |
| `STACK_BASE_SHA` | `529f85ef2b72a9682307e790639d1008654329fb` |
| Branch | `cursor/rc2-mobile-pwa-preflight-5b4f` |
| FINAL_HEAD |  |
| `validate:beta` | PASS · fingerprint `516692632525` · verdict NO-GO (candidate blocked) |
| Candidate | still blocked — no QA restore / no Netlify |
| Fingerprint | `516692632525` |
| FEATURE_FREEZE | `PUBLIC_BETA` |
| Curriculum | 134 / 113 / 30 / 30 / 20 |

Did **not** pause `sibling-free-tier-project`, did **not** use production, did **not** invent cloud PASS.

---

## Delivered

| Item | Path / script |
|---|---|
| Canonical device matrix | `docs/release/device-test-matrix.md` (points to `REAL_DEVICE_QA.md`) |
| Preflight status | `docs/release/device-preflight.json` |
| Mobile contract gate | `validate:mobile-beta-readiness` + mutations |
| PWA structural gate | `validate:pwa-release-readiness` |
| Local N→N+1 + rollback identity | `test:pwa-upgrade-preflight` |
| Aggregate gate | `gate:mobile-pwa-preflight` |
| Rollback runbook gaps filled | Netlify Publish deploy, before/after SHA, version.json |
| PWA upgrade runbook gaps filled | shaN/shaN1, open-tab, no loop, honest offline |

### Bug fix in this remessa

`StepDialogueChoice` (and sibling choice UIs) now publish `optionChoiceDomProps` / `data-option-index` — keyboard + touch contract was missing on dialogue choices, which broke mobile graded-step helpers after GuideDialogue.

### Reused (not rebuilt)

VisualViewport sticky stack · FreeAnswerField speech gate · GuideDialogue compact ·
`staleBundle` one-shot reload · `PwaUpdateBanner` · vite-plugin-pwa autoUpdate ·
existing mobile Playwright projects · evidence runbooks.

---

## Results

| Gate | Result |
|---|---|
| `gate:mobile-pwa-preflight` | PASS |
| `validate:rc2-content-freeze` | PASS · fp `516692632525` |
| `validate:security-boundaries` | PASS |
| `npm run build` | PASS (manifest + sw.js + version.json) |
| Local N→N+1 | PREFLIGHT_PASS (formal `pwa_upgrade` still false) |
| Local rollback identity | PREFLIGHT_PASS (formal `rollback_drill` still false) |
| Chromium mobile E2E | PASS · `lesson-player-mobile` + sticky + viewport + `mobile-device` |
| mobile-chrome | PASS (CHROMIUM_MOBILE_PREFLIGHT) |
| mobile-safari | PASS (WEBKIT_MOBILE_PREFLIGHT) |
| Final matrix stamp | **88 passed · 6 skipped · 0 failed** |

Viewports covered in player suite: 360×640, 375×667, 390×844, 667×360 landscape.
Keyboard / scroll-reset / sticky CTA / feedback modal / GuideDialogue advance covered in Chromium.

---

## device-preflight.json

| Surface | Status | Formal |
|---|---|---|
| android | `PREFLIGHT_PASS` (CHROMIUM) | `formalPass: false` |
| ios | `PREFLIGHT_PASS` (WEBKIT) | `formalPass: false` |
| pwa | `PREFLIGHT_PASS` (LOCAL N→N+1) | `formalPass: false` |
| rollback | `PREFLIGHT_PASS` (LOCAL) | `formalPass: false` |

---

## Offline product truth

Locale copy uses “Sem conexão” + sync-later / device-local continue.
No “full offline curriculum” claim. PWA instalável ≠ offline-ready.

---

## Physical devices

Not available in this agent environment.
No `PREVIEW_DEVICE_PREFLIGHT` physical run recorded.

---

## Remaining blockers (order)

1. Human: free Supabase slot → restore `qa-candidate-project` (#273)
2. Netlify candidate publish C
3. Cloud auth / sync / feedback on C
4. RC2.2.2B formal device/PWA/rollback on C
5. Human QA (RC2.2.3) can proceed in parallel as pre-beta usability

---

## Stop

No further device/PWA scaffolding after this remessa.
Next: RC2.2.3 Human QA Pre-Beta **or** return to #273 when slot authorized.
