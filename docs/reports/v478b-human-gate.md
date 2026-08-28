# V4.7.8B — HUMAN GATE (STOP before first write)

**STOP.** This prompt is **not** approval.

Required token (exact string, later message only):

```
APPROVE_MANDARINPROJECT_BACKEND_UPGRADE
```

Without that text: **ZERO WRITE** to MandarimProject. No `apply_migration`, no
Edge deploy, no secret mutation, no Stripe Live, no production
`VITE_CLOUD_ONBOARDING_V2_ENABLED=true`.

Do not interpret docs, CI green, or this PR as approval.

## What the human must see

| Campo | Valor |
| --- | --- |
| MAIN_SHA | `3223d4379b5ab4af118a8d88773186e965c504b5` |
| BACKEND_RC | `v4.7.8-rc.1` |
| product RC | `v4.7.4-rc.1` (unchanged) |
| Placement | v2 |
| backup type | `MANUAL_LOGICAL` (not PITR; RPO = dump `created_at` `2026-08-28`) |
| `MANUAL_LOGICAL_BACKUP_CREATED` | **`PASS`** |
| `MANUAL_LOGICAL_BACKUP_VERIFIED` | **`PASS`** |
| `BACKUP_RECOVERY_GATE` | **`PASS_WITH_MANUAL_LOGICAL_BACKUP`** |
| `AUTH_RECOVERY` | `OUT_OF_SCOPE_THIS_MIGRATION` |
| `BACKUP_STILL_VALID` | **`PASS`** (production unchanged at 2026-08-28T11:00:47Z) |
| `CI_HEAD_READY` | **`PASS`** (`1e3622c`) |
| current migration watermark | `20260810175737` `beta_experience_telemetry` |
| migrations pending | **11** — see `docs/reports/v478b-pending-delta.md` |
| Edge Functions pending | **3 MISSING**: `commit-placement`, `finalize-onboarding`, `submit-business-lead` |
| production onboarding flag | `VITE_CLOUD_ONBOARDING_V2_ENABLED=false` (must stay false) |
| remessa status | `READY_FOR_HUMAN_APPLY_APPROVAL` |

## MAIN_SHA CI (this SHA only — not an older branch)

Refreshed 2026-08-28T05:45Z against
https://github.com/matstangherlin/longyu/actions/runs/33143685565
(conclusion **success**).

| Gate | Status on `3223d43` |
| --- | --- |
| validate:beta (Portão) | **PASS** |
| build | **PASS** |
| Chromium E2E | **PASS** |
| Firefox E2E | **PASS** (step “E2E Firefox” success) |
| WebKit E2E | **PASS** (informative continue-on-error in `ci.yml`) |
| Security | **PASS** (run 33143685562) |
| backend-rehearsal | **PASS** (run 33143685559) |
| backend-contract | **PASS** (run 33143685576) |
| GitHub Supabase Preview | expected fail-closed on main (remote-only timestamps; do not fake empty files) |

MAIN_SHA CI is terminal green. That is **not** hosted PASS and is **not**
approval. This FASE B prompt is **not** `APPROVE_MANDARINPROJECT_BACKEND_UPGRADE`.

## #208 CI (PR_HEAD `1e3622c`)

Terminal **PASS** on this SHA (Actions run 33147329539 + Security 33147329547):
Portão (`validate:beta` + build), Chromium E2E, Firefox E2E (cross-engine job
success), Security, CodeQL. WebKit step remains informative `continue-on-error`.
That is **not** hosted PASS and is **not** `APPROVE_MANDARINPROJECT_BACKEND_UPGRADE`.

## V4.7.9 not started

A later prompt asked to open Physical QA + Stripe Test + Closed Beta Final Gate
(`LONGYU_CLOSED_BETA_RC=v4.7.9-rc.1`). That remessa requires every V4.7.8B
hosted key = PASS. They are still **NOT_RUN**. **Do not start V4.7.9.** Continue
this PR until FASE B has live evidence.

## Risks

- **11 live profiles** / 10 progress / 9 economy / 1 subscription.
- HIGH: placement tables + profile locale columns (steps 6–7).
- Grants: step 8 **widens** if step 9 is skipped — inseparable.
- Monotonic trigger: step 10 without 11 can crash malformed mastery jsonb.
- Missing Edges: hosted signup/placement handoff cannot complete until
  `commit-placement` + `finalize-onboarding` exist **after** schema 6–7.
- Anon still has ALL DML on personal tables until least-privilege apply.
- Manual logical dump **confirmed** (`CREATED`/`VERIFIED` = `PASS`;
  `BACKUP_RECOVERY_GATE=PASS_WITH_MANUAL_LOGICAL_BACKUP`). Not PITR.
  Recovery slower than physical restore. Auth login rows
  `OUT_OF_SCOPE_THIS_MIGRATION`.

## Estimated operations (FASE B only, after token)

1. Arm deploy lock. Backup already `PASS_WITH_MANUAL_LOGICAL_BACKUP`.
2. Apply 11 migrations **one by one** in order; smoke after each.
3. Schema / grants / RLS live evidence.
4. Deploy missing Edges one by one (no Stripe Live transaction).
5. QA hosted frontend with `VITE_CLOUD_ONBOARDING_V2_ENABLED=true` **only** on
   that QA deploy. Production stays false.
6. Real signup → real email confirm (new browser context) → onboarding handoff
   → Journey; idempotency; client-untrusted placement; true beginner;
   cross-browser sync; stale write; completed-lesson union; economy
   non-duplication; reload/offline; password recovery; correlation IDs;
   advisors AFTER vs BEFORE.

## Recovery plan

- Prefer a **forward fix**; never DROP/DELETE arbitrarily or edit
  `schema_migrations` to “make it pass”.
- New unused tables may be left in place if unused; do not drop learner rows.
- Monotonic: drop trigger only to return to last-write-wins after a documented
  incident.
- Grants: do not re-grant anon ALL except a documented incident.
- Rollback of locale columns: keep columns; drop unused drafts only if empty.
- Restore from the off-repo logical dump (`roles.sql` → `schema.sql` →
  `data.sql` → history files) if schema apply corrupts learner data. That
  is slower than PITR and only as fresh as dump `created_at`.

See `docs/reports/v478b-fase-b-runbook.md` for the operator checklist. It is
not permission to apply. `npm run v478b:fase-b-plan` prints the plan;
`--apply` exits 2.

## Explicitly blocked until the token

FASE B steps 9–34: apply, mastery live matrix on hosted, grants live, RLS A≠B,
Edge deploy, secrets audit with values, QA hosted onboarding true, real signup,
real email, handoff, idempotency, adulterated placement, beginner case,
cross-browser sync, stale write, union, economy duplication, reload/offline,
password recovery, observability, post-upgrade advisors, QA data cleanup.

Still out of scope even after a later PASS: PHYSICAL_QA_READY, PAYMENTS_READY,
READY_FOR_CLOSED_BETA_BR, i18n, Stripe Live charge, public onboarding flag.

This file is not permission to proceed. The token is.
