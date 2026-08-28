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
| backup status | **`BLOCKED_BACKUP_NOT_CONFIRMED`** |
| current migration watermark | `20260810175737` `beta_experience_telemetry` |
| migrations pending | **11** — see `docs/reports/v478b-pending-delta.md` |
| Edge Functions pending | **3 MISSING**: `commit-placement`, `finalize-onboarding`, `submit-business-lead` |
| production onboarding flag | `VITE_CLOUD_ONBOARDING_V2_ENABLED=false` (must stay false) |
| remessa status | `WAITING_HUMAN_APPROVAL` |

## MAIN_SHA CI (this SHA only — not an older branch)

Refreshed 2026-08-28T05:39Z against
https://github.com/matstangherlin/longyu/actions/runs/33143685565

| Gate | Status on `3223d43` |
| --- | --- |
| validate:beta (Portão) | **PASS** (job completed 05:20:49Z) |
| build | **PASS** (same Portão job) |
| Chromium E2E | **PASS** (job “Testes E2E (Playwright)” 33143685565) |
| Firefox E2E | **IN_PROGRESS** (step “E2E Firefox” in the cross-engine job) |
| WebKit E2E | **PASS** (step completed 05:35:17Z; informative continue-on-error in `ci.yml`) |
| Security | **PASS** (run 33143685562) |
| backend-rehearsal | **PASS** (run 33143685559) |
| backend-contract | **PASS** (run 33143685576) |
| GitHub Supabase Preview | expected fail-closed on main (remote-only timestamps; do not fake empty files) |

FASE B also waits for Firefox to be terminal PASS on this SHA. CI green is
**not** hosted PASS and is **not** approval. “Faz o que está faltando” is
**not** `APPROVE_MANDARINPROJECT_BACKEND_UPGRADE`.

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
- Backup/PITR window **not** confirmed from Dashboard.

## Estimated operations (FASE B only, after token)

1. Confirm PITR/backup; arm deploy lock.
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
- Restore from confirmed PITR if schema apply corrupts learner data.

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
