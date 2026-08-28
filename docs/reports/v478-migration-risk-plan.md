# V4.7.8 — migration risk plan (not an apply script)

**Do not apply this remessa.** Ordered LOCAL_ONLY `NOT_YET_DEPLOYED` files vs
MandarimProject watermark `20260810175737`. Derived from `classifyMigrationDrift`
+ `V478_PENDING_MIGRATIONS`. Remote-only timestamps must not get empty SQL files.

Data safety: production has **11** profiles, **10** user_progress rows,
**9** user_economy rows, **1** subscription. HIGH steps must not apply silently.

Risk = lock / rewrite / grants / trigger / backfill / rollback.

| Order | File | Risk | Locks | Rewrite | Grants | Trigger | Backfill | Rollback |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `20260812180000_production_help_telemetry.sql` | LOW | function replace | `submit_beta_pedagogy_event` body | no | no | no | restore previous function |
| 2 | `20260813180000_pearl_pro_economy.sql` | MEDIUM | catalog table + column add | `user_economy.pearl_ledger` | new table grants | no | catalog seed | drop catalog only if unused; column stays |
| 3 | `20260814010000_mastery_pass_telemetry.sql` | LOW | function replace | extra event kinds | no | no | no | restore previous function |
| 4 | `20260825043000_business_foundation.sql` | MEDIUM | new org/lead tables | none on learner rows | new RLS | helpers | no | drop tables only if unused |
| 5 | `20260825062000_business_operational_hardening.sql` | MEDIUM | helper/RLS replace | org policies | tighten | no | no | restore helpers |
| 6 | `20260826230000_placement_onboarding.sql` | **HIGH** | new `placement_attempts` + DEFINER RPC | none until Edge writes | new table | no | no | drop table only if zero rows; disable Edge |
| 7 | `20260827023000_placement_onboarding_handoff.sql` | **HIGH** | drafts table + profile locale columns | `profiles` ADD columns | drafts service_role | no | no | keep columns; drop drafts if unused |
| 8 | `20260828013000_api_role_table_grants.sql` | LOW on hosted | GRANT ALL restatement | privilege rows | **widens** if 9 skipped | no | no | never apply 8 without 9 |
| 9 | `20260828020000_least_privilege_api_grants.sql` | MEDIUM | REVOKE/GRANT | anon DML removed | **tightens** | no | no | re-grant only for documented incident |
| 10 | `20260828030000_progress_mastery_monotonic.sql` | MEDIUM | BEFORE UPDATE on `user_progress` | jsonb merge each update | function execute | **yes** | no | drop trigger; last-write-wins returns |
| 11 | `20260828032249_progress_mastery_monotonic_clamp.sql` | MEDIUM | INSERT+UPDATE trigger replace | clamp 0..4 on mastery jsonb | revoke execute | **yes** | no extra SQL backfill; first write clamps | drop helpers + restore prior trigger |

## HIGH must not apply silently

Steps **6 and 7** create placement persistence and add profile columns used by
onboarding V2. They are HIGH because they change the hosted auth/placement
contract. Apply only with:

1. Fresh snapshot + backup/PITR (HOST-007)
2. Exact token `APPROVE_MANDARINPROJECT_BACKEND_UPGRADE`
3. Stop at the first error
4. Deploy lock (no parallel schema edits)
5. Edge deploy **after** schema 6–7, not before

Step 11 is Medium (10 rows today) but **must follow 10**. Step 10 without 11
leaves crashing `::integer` casts on malformed client jsonb.

## What this remessa will not do

- No `apply_migration` on MandarimProject
- No Edge deploy
- No production `VITE_CLOUD_ONBOARDING_V2_ENABLED=true`
- No invented hosted PASS
