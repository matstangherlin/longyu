# Backend migration drift (Longyu / MandarimProject)

Generated at: 2026-08-28T01:06:41.149Z

**Read-only.** MandarimProject was not written.

- Production: MandarimProject `drjcfalvlbbeblmmyhwj`
- Remote history captured at: 2026-08-28T00:50:00Z
- Production watermark: `20260810175737` beta_experience_telemetry
- Local files: 44
- Remote versions: 34
- LOCAL_AND_REMOTE: 26
- REMOTE_ONLY: 8
- LOCAL_ONLY: 18
- Baseline schema hash (local files, sha256): `ac47fed51a0ba25b5a650cf04e51f63bdadfddcb3194a936a609bc9fc0a25b87`
- Baseline source: `supabase/migrations` (`001_initial_schema.sql` onward)
- generated_at: 2026-08-28T01:06:41.149Z

## Baseline strategy

MandarimProject migration versions were recorded with Management API timestamps that **do not** match local filenames (name matches, version drift).

Do **not** add empty SQL files named after REMOTE_ONLY timestamps to silence GitHub Supabase Preview. That check fail-closed (“Remote migration versions not found in local migrations directory”) is the correct drift signal.

Ephemeral reconstruction uses the local chain only. Remote history is not altered.

Operational LOCAL_ONLY files (planned schema, not on production watermark):

- `20260812180000_production_help_telemetry.sql`
- `20260813180000_pearl_pro_economy.sql`
- `20260814010000_mastery_pass_telemetry.sql`
- `20260825043000_business_foundation.sql`
- `20260825062000_business_operational_hardening.sql`
- `20260826230000_placement_onboarding.sql`
- `20260827023000_placement_onboarding_handoff.sql`

## Classification

| Class | Remote | Local file | Notes |
| --- | --- | --- | --- |
| LOCAL_AND_REMOTE | 20260804032032 pedagogy_analytics_consent | 011_pedagogy_analytics_consent.sql | name_only — Version timestamps differ. Do not add empty files with the remote timestamp. |
| LOCAL_AND_REMOTE | 20260804032109 subscription_event_ordering | 014_subscription_event_ordering.sql | name_only — Version timestamps differ. Do not add empty files with the remote timestamp. |
| LOCAL_AND_REMOTE | 20260804032252 pedagogy_consent_rpc_gate | 012_pedagogy_consent_rpc_gate.sql | name_only — Version timestamps differ. Do not add empty files with the remote timestamp. |
| LOCAL_AND_REMOTE | 20260804032353 pedagogy_rpc_hardening | 013_pedagogy_rpc_hardening.sql | name_only — Version timestamps differ. Do not add empty files with the remote timestamp. |
| LOCAL_AND_REMOTE | 20260804032737 fix_apply_subscription_event_rowcount | 015_fix_apply_subscription_event_rowcount.sql | name_only — Version timestamps differ. Do not add empty files with the remote timestamp. |
| LOCAL_AND_REMOTE | 20260804042502 fix_leagues_cohort_finalize | 016_fix_leagues_cohort_finalize.sql | name_only — Version timestamps differ. Do not add empty files with the remote timestamp. |
| LOCAL_AND_REMOTE | 20260804083127 017_referrals | 017_referrals.sql | name_only — Version timestamps differ. Do not add empty files with the remote timestamp. |
| LOCAL_AND_REMOTE | 20260804171838 018_signup_rate_limits | 018_signup_rate_limits.sql | name_only — Version timestamps differ. Do not add empty files with the remote timestamp. |
| LOCAL_AND_REMOTE | 20260804182833 020_signup_cleanup_job | 020_signup_cleanup_job.sql | name_only — Version timestamps differ. Do not add empty files with the remote timestamp. |
| LOCAL_AND_REMOTE | 20260804231003 ensure_own_profile | 021_ensure_own_profile.sql | name_only — Version timestamps differ. Do not add empty files with the remote timestamp. |
| LOCAL_AND_REMOTE | 20260807175927 022_fix_referral_try_qualify | 022_fix_referral_try_qualify.sql | name_only — Version timestamps differ. Do not add empty files with the remote timestamp. |
| LOCAL_AND_REMOTE | 20260808065946 harden_function_privileges | 20260808064852_harden_function_privileges.sql | name_only — Version timestamps differ. Do not add empty files with the remote timestamp. |
| LOCAL_AND_REMOTE | 20260808071731 secure_social_profile_boundary | 20260808070849_secure_social_profile_boundary.sql | name_only — Version timestamps differ. Do not add empty files with the remote timestamp. |
| LOCAL_AND_REMOTE | 20260808074952 erase_account_personal_data | 20260808073233_erase_account_personal_data.sql | name_only — Version timestamps differ. Do not add empty files with the remote timestamp. |
| LOCAL_AND_REMOTE | 20260808084551 harden_anonymous_ingestion | 20260808081000_harden_anonymous_ingestion.sql | name_only — Version timestamps differ. Do not add empty files with the remote timestamp. |
| LOCAL_AND_REMOTE | 20260808122646 harden_referral_qualification | 20260808093000_harden_referral_qualification.sql | name_only — Version timestamps differ. Do not add empty files with the remote timestamp. |
| LOCAL_AND_REMOTE | 20260808134045 admin_roles_user_id | 20260808130200_admin_roles_user_id.sql | name_only — Version timestamps differ. Do not add empty files with the remote timestamp. |
| LOCAL_AND_REMOTE | 20260808134047 harden_subscription_event_ordering | 20260808130100_harden_subscription_event_ordering.sql | name_only — Version timestamps differ. Do not add empty files with the remote timestamp. |
| LOCAL_AND_REMOTE | 20260808134407 abuse_controls_ip_email_snapshot | 20260808150000_abuse_controls_ip_email_snapshot.sql | name_only — Version timestamps differ. Do not add empty files with the remote timestamp. |
| LOCAL_AND_REMOTE | 20260808134423 economy_anti_cheat_qi | 20260808140000_economy_anti_cheat_qi.sql | name_only — Version timestamps differ. Do not add empty files with the remote timestamp. |
| LOCAL_AND_REMOTE | 20260808134424 harden_economy_reward_trust | 20260808130000_harden_economy_reward_trust.sql | name_only — Version timestamps differ. Do not add empty files with the remote timestamp. |
| LOCAL_AND_REMOTE | 20260808174114 revoke_economy_user_is_pro_client | 20260808160000_revoke_economy_user_is_pro_client.sql | name_only — Version timestamps differ. Do not add empty files with the remote timestamp. |
| LOCAL_AND_REMOTE | 20260808183305 harden_client_reward_claims | 20260808170000_harden_client_reward_claims.sql | name_only — Version timestamps differ. Do not add empty files with the remote timestamp. |
| LOCAL_AND_REMOTE | 20260809161017 require_referral_reward_review | 20260809160306_require_referral_reward_review.sql | name_only — Version timestamps differ. Do not add empty files with the remote timestamp. |
| LOCAL_AND_REMOTE | 20260809161213 index_referral_review_reviewer | 20260809161134_index_referral_review_reviewer.sql | name_only — Version timestamps differ. Do not add empty files with the remote timestamp. |
| LOCAL_AND_REMOTE | 20260810175737 beta_experience_telemetry | 20260810170000_beta_experience_telemetry.sql | name_only — Version timestamps differ. Do not add empty files with the remote timestamp. |
| REMOTE_ONLY | 20260804082814 referrals_mvp | — | Not in repo. Do not invent an empty file with this timestamp. |
| REMOTE_ONLY | 20260804175935 turnstile_secret_vault_rpc | — | Not in repo. Do not invent an empty file with this timestamp. |
| REMOTE_ONLY | 20260808133923 harden_economy_claim_mission | — | Not in repo. Do not invent an empty file with this timestamp. |
| REMOTE_ONLY | 20260808134006 harden_economy_grant_story_energy | — | Not in repo. Do not invent an empty file with this timestamp. |
| REMOTE_ONLY | 20260808134007 harden_economy_claim_league_week_reward | — | Not in repo. Do not invent an empty file with this timestamp. |
| REMOTE_ONLY | 20260808134009 harden_economy_add_league_weekly_xp | — | Not in repo. Do not invent an empty file with this timestamp. |
| REMOTE_ONLY | 20260808134010 harden_economy_grant_lesson_reward | — | Not in repo. Do not invent an empty file with this timestamp. |
| REMOTE_ONLY | 20260808134325 profiles_social_columns | — | Not in repo. Do not invent an empty file with this timestamp. |
| LOCAL_ONLY | — | 001_initial_schema.sql | Planned Longyu schema; not on MandarimProject watermark |
| LOCAL_ONLY | — | 002_client_snapshot.sql | Planned Longyu schema; not on MandarimProject watermark |
| LOCAL_ONLY | — | 003_profile_trigger.sql | Planned Longyu schema; not on MandarimProject watermark |
| LOCAL_ONLY | — | 004_leagues.sql | Planned Longyu schema; not on MandarimProject watermark |
| LOCAL_ONLY | — | 005_social.sql | Planned Longyu schema; not on MandarimProject watermark |
| LOCAL_ONLY | — | 006_economy_server.sql | Planned Longyu schema; not on MandarimProject watermark |
| LOCAL_ONLY | — | 007_internal_test_pro.sql | Planned Longyu schema; not on MandarimProject watermark |
| LOCAL_ONLY | — | 008_server_entitlement_rpc.sql | Planned Longyu schema; not on MandarimProject watermark |
| LOCAL_ONLY | — | 009_profile_admin.sql | Planned Longyu schema; not on MandarimProject watermark |
| LOCAL_ONLY | — | 010_beta_feedback.sql | Planned Longyu schema; not on MandarimProject watermark |
| LOCAL_ONLY | — | 019_turnstile_vault_secret.sql | Planned Longyu schema; not on MandarimProject watermark |
| LOCAL_ONLY | — | 20260812180000_production_help_telemetry.sql | Planned Longyu schema; not on MandarimProject watermark |
| LOCAL_ONLY | — | 20260813180000_pearl_pro_economy.sql | Planned Longyu schema; not on MandarimProject watermark |
| LOCAL_ONLY | — | 20260814010000_mastery_pass_telemetry.sql | Planned Longyu schema; not on MandarimProject watermark |
| LOCAL_ONLY | — | 20260825043000_business_foundation.sql | Planned Longyu schema; not on MandarimProject watermark |
| LOCAL_ONLY | — | 20260825062000_business_operational_hardening.sql | Planned Longyu schema; not on MandarimProject watermark |
| LOCAL_ONLY | — | 20260826230000_placement_onboarding.sql | Planned Longyu schema; not on MandarimProject watermark |
| LOCAL_ONLY | — | 20260827023000_placement_onboarding_handoff.sql | Planned Longyu schema; not on MandarimProject watermark |
