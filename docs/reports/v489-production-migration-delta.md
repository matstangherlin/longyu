# V4.8.9 — Production migration delta

Identity: `backend-rc-v489-preapply`

Base main: `02bf2f1803ffbde0e17efc00dbf3f0cde5b71163`

MandarimProject: `drjcfalvlbbeblmmyhwj`

Aggregate snapshot: `2026-09-01T23:48:15.668474Z`

Migration/Edge read-only refresh recorded at: `2026-09-02T09:18:43.053Z`

Remote watermark: `20260810175737` (`beta_experience_telemetry`)

This inventory compares 48 repository migrations with 34 hosted migration rows. It does not repair remote history and does not manufacture timestamp-only files. The ordered operational delta is 11 files:

| # | Migration | Risk | Dependency / rollback concern |
| ---: | --- | --- | --- |
| 1 | `20260812180000_production_help_telemetry.sql` | R1 | Function replacement; validate ingestion allowlist and rate limits. |
| 2 | `20260813180000_pearl_pro_economy.sql` | R3 | Alters live economy rows and entitlement constraint; snapshot counts and validate rewards/idempotency. |
| 3 | `20260814010000_mastery_pass_telemetry.sql` | R1 | Additive telemetry/function contract. |
| 4 | `20260825043000_business_foundation.sql` | R2 | New business tables/RLS/RPC surface; optional for learner core. |
| 5 | `20260825062000_business_operational_hardening.sql` | R2 | Must follow business foundation; restricts operational behavior. |
| 6 | `20260826230000_placement_onboarding.sql` | R3 | Auth-critical tables, profile columns and server placement authority. |
| 7 | `20260827023000_placement_onboarding_handoff.sql` | R3 | Must follow placement foundation; account handoff/finalization contract. |
| 8 | `20260828013000_api_role_table_grants.sql` | R3 | Transitional grants. Do not stop between #8 and #9. |
| 9 | `20260828020000_least_privilege_api_grants.sql` | R3 | Revokes broad API grants; validate RLS A≠B and all client paths. |
| 10 | `20260828030000_progress_mastery_monotonic.sql` | R4 | Trigger touches every new progress write. Do not stop between #10 and #11. |
| 11 | `20260828032249_progress_mastery_monotonic_clamp.sql` | R4 | Final INSERT+UPDATE clamp and monotonic union; learner-data safety gate. |

Risk scale: R0 documentation only; R1 additive/low impact; R2 bounded new surface; R3 auth/security/economy behavior; R4 live learner-data or high-impact behavioral path; R5 destructive/irreversible. No R5 migration was found.

## Hosted schema gap

At capture time production did not have `placement_attempts`, `placement_onboarding_drafts`, `organizations`, `organization_members`, `business_leads`, or the pearl catalog tables. Profile fields `country_code`, `interface_locale`, and `instruction_locale` were absent. `user_economy.pearl_ledger`, `commit_placement_result`, `save_placement_onboarding_draft`, and the mastery trigger were absent.

Current API grants are materially broader than the intended contract: `anon` has `ALL` on learner-owned tables including profiles/progress/SRS/economy/subscriptions/transactions, while migration #9 narrows this surface. RLS alone is not a substitute for correct grants; both must be rehearsed.

## Apply ordering and stop conditions

The future authorized run must apply one file at a time, record the remote version after each file, and stop on the first error. Files #8→#9 and #10→#11 are inseparable operational pairs. Do not deploy account/placement Edges before #6–#9 pass schema, RPC, grants and RLS checks. Do not enable cloud onboarding until the current `create-account`, `commit-placement`, and `finalize-onboarding` source identities are deployed and verified together.

Rollback is restore/forward-fix driven. Dropping newly introduced structures is not an acceptable improvised rollback after live writes. A fresh logical backup plus verified restore evidence is a precondition.

Decision: `BLOCKED_BEFORE_PRODUCTION_APPLY`.

`MANDARIMPROJECT_WRITES = 0`

`STRIPE_LIVE_WRITES = 0`
