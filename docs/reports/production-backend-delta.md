# Production backend delta (repo HEAD vs MandarimProject)

Generated at: 2026-08-28T01:21:58.917Z

Repo SHA: `63102a5b1ee3ffb786bc761580e5b2f0c9b65d45`
origin/main: `b2a5818af1182277ac61c699970b1e3e868ded12`

**EXPECTED_REPO_STATE** vs **CURRENT_MANDARIMPROJECT_STATE** (read-only capture 2026-08-28T00:50:00Z).

MandarimProject writes this remessa: **ZERO**.

## Migrations

Remote watermark: `20260810175737` beta_experience_telemetry

- migration pending: `20260812180000_production_help_telemetry.sql`
- migration pending: `20260813180000_pearl_pro_economy.sql`
- migration pending: `20260814010000_mastery_pass_telemetry.sql`
- migration pending: `20260825043000_business_foundation.sql`
- migration pending: `20260825062000_business_operational_hardening.sql`
- migration pending: `20260826230000_placement_onboarding.sql`
- migration pending: `20260827023000_placement_onboarding_handoff.sql`

## Schema

- column missing: country_code, interface_locale, instruction_locale
- economy column missing: user_economy.pearl_ledger
- table missing: placement_attempts, placement_onboarding_drafts, business_leads, pearl_milestone_catalog
- RPC missing: commit_placement_result, save_placement_onboarding_draft

## Edge (LON-026)

| Slug | Class | Production |
| --- | --- | --- |
| `create-account` | MATCH | v8 ACTIVE |
| `commit-placement` | MISSING_IN_PRODUCTION | absent |
| `finalize-onboarding` | MISSING_IN_PRODUCTION | absent |
| `submit-business-lead` | MISSING_IN_PRODUCTION | absent |
| `create-checkout-session` | MATCH | v10 ACTIVE |
| `create-billing-portal` | MATCH | v9 ACTIVE |
| `stripe-webhook` | MATCH | v11 ACTIVE |
| `delete-account` | MATCH | v10 ACTIVE |
| `issue-anon-ingestion-session` | MATCH | v3 ACTIVE |

MATCH means the slug is deployed. Bundle hash was not byte-compared. Missing slugs: commit-placement, finalize-onboarding, submit-business-lead.
