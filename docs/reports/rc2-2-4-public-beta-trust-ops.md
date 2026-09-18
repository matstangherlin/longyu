# RC2.2.4 — Public Beta Trust & Operations Readiness

**Kind: RELEASE READINESS / TRUST / PRIVACY / OPERATIONS.**  
**Zero pedagogical product features.** FEATURE_FREEZE=`PUBLIC_BETA`.

| Formal check | Remains |
|---|---|
| `cloud_auth` | `pass: false` |
| `cloud_sync` | `pass: false` |
| `feedback_backend` | `pass: false` |
| `android_real_device` | `pass: false` |
| `ios_real_device` | `pass: false` |
| `pwa_upgrade` | `pass: false` |
| `rollback_drill` | `pass: false` |

**Verdict: NO-GO.**

---

## Stack

| | |
|---|---|
| PR base | #275 `cursor/rc2-human-qa-prebeta-5b4f` |
| `STACK_BASE_SHA` / #275 inherited | `054420c2effcf1793fbddb9ed25dc3d0337304e4` |
| Branch | `cursor/rc2-beta-trust-ops-5b4f` |
| Fingerprint | `516692632525` |
| Curriculum | 134 / 113 / 30 / 30 / 20 |
| Human QA (#275) | unchanged — founder/L1–L20/external **not** marked PASS |

Did **not** wait for merge, did **not** return to `main`, did **not** touch Supabase QA, did **not** use production to certify cloud.

---

## Privacy before → after

| Before | After |
|---|---|
| `data-legal-later` placeholder PT-only paragraphs | Public Beta Privacy Notice via i18n `privacyNotice.*` (PT-BR + EN) |
| `consentBody` / `privacyCopy` said “anônimos/anonymous” while listing account/profile id | “dados pedagógicos e de uso” / pedagogical and usage data |
| Contact hardcoded | `FEEDBACK_EMAIL` = `beta@longyu.app` |

---

## Terms

| Item | Status |
|---|---|
| Route `/termos` | **exists** |
| PT-BR + EN | **yes** |
| Minimal beta scope | service beta, availability, acceptable use, account, IP basics, feedback, changes, termination, contact |
| Legal certification claims | **none** — docs may note `LEGAL_REVIEW_RECOMMENDED` |
| Footer / About / Settings links | **yes** |

---

## Telemetry contract

- Absence of consent = **no remote pedagogy send**
- “Agora não” / “Not now” ≠ consent
- Revoke clears local pedagogy queue and blocks new sends
- Collected / not-collected lists remain honest (includes account/profile id when applicable)

## Feedback delivery

| State | UI |
|---|---|
| **SENT** | “Feedback enviado” / “was sent” — only when backend confirms |
| **QUEUED** | Saved on device; will send when connection available — `feedback.thanksQueued` |
| **ERROR** | Existing error path (not success) |

Dedupe / MAX_QUEUE / flush queue **reused** (not replaced).

## Export / deletion

| Surface | Status |
|---|---|
| Export (`buildPrivacyExportBundle`) | Discoverable in Settings + Dados locais — **CODE_READY** |
| Cloud account deletion | Client + Edge Function — **CODE_READY** / **BLOCKED_CLOUD_VERIFY** until Supabase QA |
| Local erase | Dados locais — honest local wipe (not “cloud deleted”) |

## Support / beta / version

- Canonical contact: `beta@longyu.app`
- `BetaNotice` + About copy: beta ≠ silent progress loss
- `AppVersionLabel` / version identity preserved

## ErrorBoundary / diagnostics

- Retry · Report · Journey · Reload audited
- Production UI does not show stack
- Diagnostics: sessionStorage, sanitized, **not** auto-uploaded

## Operations docs

| Doc | Path |
|---|---|
| Incident runbook | `docs/release/public-beta-incident-runbook.md` |
| Launch-day | `docs/release/public-beta-launch-day.md` |
| Observability map | `docs/release/public-beta-observability-map.md` |

## Gates

| Gate | Expectation |
|---|---|
| `validate:public-beta-trust` | PASS |
| `test:public-beta-trust` | PASS (mutations) |
| `gate:public-beta-operations` | PASS (trust + freezes + security boundaries — **not** cloud PASS) |
| Formal cloud/device/PWA/rollback | remain `false` |

## Remaining blockers (next)

1. **Return to #273 / RC2.2.1** — Supabase slot, `longyu-preview`, Netlify candidate, cloud_auth/sync/feedback_backend.
2. RC2.2.2B — physical devices + real PWA/rollback.
3. Founder L1–L20 + external testers when shareable build exists.
4. RC2.3 — squash to main SHA → final evidence → `gate:public-beta-core`.

**STOP after this remessa:** no more independent QA/mobile/release scaffolding; next work is real infra.

---

## FINAL_HEAD

`441c3bff1fedd901b61e7c7135fed6039ea20970` — `gate:public-beta-operations` PASS · fingerprint `516692632525` · verdict NO-GO.
