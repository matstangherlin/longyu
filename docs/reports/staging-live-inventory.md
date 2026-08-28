# Staging live inventory (Longyu)

Read-only consult of **MandarimProject** `drjcfalvlbbeblmmyhwj` (production — **HARD FAIL** as a staging target).

**No migration, Edge deploy, or row write was applied.**

`STAGING_READY` is **`BLOCKED_REMOTE_STAGING`**. This does not promote AUTH / PLACEMENT / SYNC / SECURITY / READY_FOR_CLOSED_BETA_BR.

Remote Longyu staging is not configured (`LONGYU_STAGING_PROJECT_ID` has no default). Validation continues on the ephemeral board.

## MandarimProject (production)

| project_id | name | region | status | role |
| --- | --- | --- | --- | --- |
| `drjcfalvlbbeblmmyhwj` | MandarimProject | us-west-2 | ACTIVE_HEALTHY | production — HARD FAIL as staging |

Watermark: `20260810175737` `beta_experience_telemetry`.

Repo Edges **not** on production: `commit-placement`, `finalize-onboarding`, `submit-business-lead`.

See `docs/reports/production-backend-delta.md`.
