# V4.7.8B — pending delta (regenerated, not hardcoded)

Compared **CURRENT MandarimProject** (watermark `20260810175737`
`beta_experience_telemetry`, 34 remote versions, captured 2026-08-28T05:14:56Z)
vs repo `LONGYU_BACKEND_RC=v4.7.8-rc.1` on MAIN_SHA
`3223d4379b5ab4af118a8d88773186e965c504b5`.

Method: `classifyMigrationDrift(localMigrationFiles)` +
`V477_LOCAL_ONLY_CLASS[file].class === "NOT_YET_DEPLOYED"`.

`operational_local_only` from V4.7.6 (`V476_OPERATIONAL_MIGRATIONS`) is only
the first **7** files. The V4.7.8B apply chain is the **11** files below.

## Apply order (LOCAL_ONLY + NOT_YET_DEPLOYED)

| Order | File | Risk | Notes |
| --- | --- | --- | --- |
| 1 | `20260812180000_production_help_telemetry.sql` | LOW | function replace |
| 2 | `20260813180000_pearl_pro_economy.sql` | MEDIUM | catalog + `pearl_ledger` column |
| 3 | `20260814010000_mastery_pass_telemetry.sql` | LOW | extra event kinds |
| 4 | `20260825043000_business_foundation.sql` | MEDIUM | org/lead tables |
| 5 | `20260825062000_business_operational_hardening.sql` | MEDIUM | business RLS/helpers |
| 6 | `20260826230000_placement_onboarding.sql` | **HIGH** | `placement_attempts` + DEFINER RPC |
| 7 | `20260827023000_placement_onboarding_handoff.sql` | **HIGH** | drafts + profile locale columns |
| 8 | `20260828013000_api_role_table_grants.sql` | LOW if paired | **must be followed immediately by 9** |
| 9 | `20260828020000_least_privilege_api_grants.sql` | MEDIUM | revoke anon DML |
| 10 | `20260828030000_progress_mastery_monotonic.sql` | MEDIUM | **must be followed immediately by 11** |
| 11 | `20260828032249_progress_mastery_monotonic_clamp.sql` | MEDIUM | clamp 0..4; INSERT+UPDATE |

## Inseparable pairs

1. `api_role_table_grants` → immediately `least_privilege_api_grants`.
   Never leave production between those states longer than the apply gap.
2. `progress_mastery_monotonic` → immediately `progress_mastery_monotonic_clamp`.
   Do not finish deploy with only the first (malformed jsonb can crash
   `::integer` casts).

## Not in the apply chain

- LOCAL_REPLAY_ONLY / RENAMED_EQUIVALENT / SUPERSEDED LOCAL_ONLY files
  (`001`–`010`, `019_turnstile_vault_secret.sql`): already represented on hosted.
- REMOTE_ONLY (8 versions): classified; do not invent matching empty files.
- Frozen `012_pedagogy_consent_rpc_gate.sql` DROP VIEW is FRESH_REPLAY_ONLY —
  do not re-apply 012 to production.

## Edge delta

MISSING on hosted: `commit-placement`, `finalize-onboarding`,
`submit-business-lead`. Deploy only after schema steps 6–7 exist. Stripe Live
transactions stay out of scope.

This file is not an apply script. FASE B starts only after
`APPROVE_MANDARINPROJECT_BACKEND_UPGRADE`.
