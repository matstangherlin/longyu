# V4.7.8B — FASE B runbook (do not execute in this commit)

**This file is the operator checklist after** `APPROVE_MANDARINPROJECT_BACKEND_UPGRADE`
**and** a confirmed Dashboard backup/PITR **and** MAIN_SHA Firefox PASS.

It is **not** approval. `scripts/v478b-fase-b-plan.mjs` is plan-only and exits 2
on `--apply`. Zero MandarimProject writes happened while writing this file.

Production `VITE_CLOUD_ONBOARDING_V2_ENABLED` stays `"false"`. Stripe Live is
out of scope. Do not start V4.7.9 until hosted keys are PASS.

## Preconditions (all required)

1. Chat contains exactly `APPROVE_MANDARINPROJECT_BACKEND_UPGRADE`
2. Human confirms PITR window or backup id (off-repo) — today
   `BLOCKED_BACKUP_NOT_CONFIRMED`
3. MAIN_SHA `3223d4379b5ab4af118a8d88773186e965c504b5` CI: Portão, build,
   Chromium, Firefox, Security, backend-rehearsal, backend-contract = PASS
4. Deploy lock armed; no parallel schema/Edge work
5. Watermark still `20260810175737` immediately before first apply (re-read)

If any precondition fails: **STOP**. No write.

## 9 — Apply one by one (inseparable pairs in the same sitting)

After each file: row in `supabase_migrations.schema_migrations`, project
`ACTIVE_HEALTHY`, smoke SQL below. First failure = STOP. No DROP, no DELETE
of learner rows, no manual history edit. Prefer forward fix.

| # | File | Smoke (no PII) | Next |
| --- | --- | --- | --- |
| 1 | `20260812180000_production_help_telemetry.sql` | `sanitize_pedagogy_metadata` exists | continue |
| 2 | `20260813180000_pearl_pro_economy.sql` | `pearl_milestone_catalog` exists; `user_economy.pearl_ledger` exists; `claim_pearl_milestone` exists | continue |
| 3 | `20260814010000_mastery_pass_telemetry.sql` | `submit_beta_pedagogy_event` exists | continue |
| 4 | `20260825043000_business_foundation.sql` | `organizations`, `organization_members`, `business_leads` exist | continue |
| 5 | `20260825062000_business_operational_hardening.sql` | project healthy; RLS on new tables | continue |
| 6 | `20260826230000_placement_onboarding.sql` | `placement_attempts`; `commit_placement_result` | continue |
| 7 | `20260827023000_placement_onboarding_handoff.sql` | `placement_onboarding_drafts`; `save_placement_onboarding_draft`; `profiles.country_code` / locale cols | continue |
| 8 | `20260828013000_api_role_table_grants.sql` | registered only | **immediately 9** |
| 9 | `20260828020000_least_privilege_api_grants.sql` | anon has **no** table DML on profiles/progress/srs/subscriptions/transactions/user_economy | continue |
| 10 | `20260828030000_progress_mastery_monotonic.sql` | trigger name present | **immediately 11** |
| 11 | `20260828032249_progress_mastery_monotonic_clamp.sql` | trigger is INSERT OR UPDATE; helper clamp exists; no `pg_catalog.greatest` | schema check |

Never leave production between 8 and 9, or between 10 and 11.

## 11 — Schema ready

`MANDARINPROJECT_SCHEMA_READY=PASS` only if watermark `20260828032249`, missing
tables/RPCs/trigger/columns from `v478b-preapply-live-state.md` are present,
RPC signatures match `docs/backend/rpc-contract.json`.

## 12–14 — Live SQL (QA users only)

- Mastery matrix 2→stale1 stays 2; 3; 4; malformed clamp 0..4
- Grants: anon / authenticated / service_role as planned
- RLS A≠B on listed personal tables (QA_USER_A / QA_USER_B; IDs off-repo)

## 15–17 — Edges and secrets

Repo source hashes: `docs/backend/edge-contract.json`.

Deploy **one by one**, after schema 6–7, no Stripe Live charge:

1. `create-account` (`verify_jwt=false`) — update; drafts RPC now exists
2. `commit-placement` (`verify_jwt=true`) — MISSING
3. `finalize-onboarding` (`verify_jwt=true`) — MISSING
4. `submit-business-lead` (`verify_jwt=false`) — MISSING

After each: ACTIVE, verify_jwt expected, smoke without Live payment.
Secrets: confirm **presence** only (service role, Turnstile, Stripe, webhook).
Never print values. Hard-fail if a Test checkout uses `sk_live_`.

## 18–30 — QA hosted frontend (not production, not Deploy Preview)

Deploy Preview is `VITE_BACKEND_MODE=local` with empty Supabase URL. Do **not**
use it as hosted evidence.

Create a **QA-only** Netlify (or equivalent) with MandarimProject URL and
`VITE_CLOUD_ONBOARDING_V2_ENABLED=true`. Production context stays `false`.

Then execute remessa steps 19–30 against that QA URL: real signup, real email
in a **new** browser context, handoff, idempotency, untrusted placement body,
true beginner, cross-browser sync, stale write, completed-lesson union,
economy non-duplication, reload/offline, password recovery.

Document QA user ids off-repo. Do not delete real learner rows.

## 31–35 — Observability, advisors, report

Correlation ids signup → Edge → DB without email/JWT/secrets in git.
Advisors AFTER vs BEFORE: no new ERROR; WARN accepted or follow-up.
Fill `docs/reports/v478b-hosted-validation.md` + JSON from **live** evidence
only. No inferred PASS.

## Recovery if a step fails

Forward fix. Do not DROP unused learner data. Do not edit
`schema_migrations`. PITR only if learner data is corrupted and the backup
was confirmed before apply.
