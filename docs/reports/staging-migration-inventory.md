# Staging migration inventory (STG-002)

**Does not apply SQL.** MandarimProject watermark (read-only): `20260810175737` `beta_experience_telemetry`.

Remote staging: `BLOCKED_REMOTE_STAGING` (no `LONGYU_STAGING_PROJECT_ID`). Apply the chain on ephemeral CI (`npm run rehearse:ephemeral`), not on production.

| version | name | production | remote staging |
| --- | --- | --- | --- |
| 20260812180000 | production_help_telemetry | NOT_APPLIED | BLOCKED_REMOTE_STAGING |
| 20260813180000 | pearl_pro_economy | NOT_APPLIED | BLOCKED_REMOTE_STAGING |
| 20260814010000 | mastery_pass_telemetry | NOT_APPLIED | BLOCKED_REMOTE_STAGING |
| 20260825043000 | business_foundation | NOT_APPLIED | BLOCKED_REMOTE_STAGING |
| 20260825062000 | business_operational_hardening | NOT_APPLIED | BLOCKED_REMOTE_STAGING |
| 20260826230000 | placement_onboarding | NOT_APPLIED | BLOCKED_REMOTE_STAGING |
| 20260827023000 | placement_onboarding_handoff | NOT_APPLIED | BLOCKED_REMOTE_STAGING |

Proof on production: `placement_onboarding_drafts`, `placement_attempts`, `business_leads`, `pearl_milestone_catalog` absent; `user_economy.pearl_ledger` column absent.

Order: one by one on an isolated target, stop on first error. Hard fail if the script points at production.

Fonte: `npm run inventory:staging-migrations` + `docs/reports/backend-migration-drift.md`.
