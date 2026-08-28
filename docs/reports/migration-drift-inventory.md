# Migration drift inventory (V4.7.7)

**Read-only.** MandarimProject (`drjcfalvlbbeblmmyhwj`) was not written.
Remote history captured at `2026-08-28T02:20:00Z` (MCP `list_migrations`).
Production watermark: `20260810175737` `beta_experience_telemetry`.

Counts: local **48** files, remote **34** versions,
**LOCAL_AND_REMOTE=26**, **REMOTE_ONLY=8**, **LOCAL_ONLY=22**.

Do **not** add empty SQL files named after REMOTE_ONLY timestamps.

Historical 012: `DROP VIEW` + `CREATE VIEW` is **FRESH_REPLAY_ONLY** for ephemeral
replay (`42P16`). Semantic body matches hosted.

## REMOTE_ONLY

| version | remote name | class | label | represented_by | purpose | objects | replayed in ephemeral |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `20260804082814` | `referrals_mvp` | C | SUPERSEDED | `017_referrals.sql` | First referrals apply on hosted; immediately followed by 017 | referrals, referral_codes | via 017, not this timestamp |
| `20260804175935` | `turnstile_secret_vault_rpc` | A | RENAMED_EQUIVALENT | `019_turnstile_vault_secret.sql` | Vault lookup `_edge_get_turnstile_secret` | `_edge_get_turnstile_secret` | via 019 |
| `20260808133923` | `harden_economy_claim_mission` | A | ALREADY_IN_LOCAL_CHAIN | `20260808130000_harden_economy_reward_trust.sql` | Hosted split of claim_mission | `claim_mission` | via bundled harden file |
| `20260808134006` | `harden_economy_grant_story_energy` | A | ALREADY_IN_LOCAL_CHAIN | `20260808130000_harden_economy_reward_trust.sql` | Hosted split | `grant_story_energy` | via bundled harden file |
| `20260808134007` | `harden_economy_claim_league_week_reward` | A | ALREADY_IN_LOCAL_CHAIN | `20260808130000_harden_economy_reward_trust.sql` | Hosted split | `claim_league_week_reward` | via bundled harden file |
| `20260808134009` | `harden_economy_add_league_weekly_xp` | A | ALREADY_IN_LOCAL_CHAIN | `20260808130000_harden_economy_reward_trust.sql` | Hosted split | `add_league_weekly_xp` | via bundled harden file |
| `20260808134010` | `harden_economy_grant_lesson_reward` | A | ALREADY_IN_LOCAL_CHAIN | `20260808130000_harden_economy_reward_trust.sql` | Hosted split | `grant_lesson_reward` | via bundled harden file |
| `20260808134325` | `profiles_social_columns` | A | ALREADY_IN_LOCAL_CHAIN | `005_social.sql` | username/avatar/public stats | `profiles.username` | via 005 |

No REMOTE_ONLY row is UNKNOWN (class D).

## LOCAL_ONLY

| path | class | purpose | objects | replayed in ephemeral |
| --- | --- | --- | --- | --- |
| `001_initial_schema.sql` | LOCAL_REPLAY_ONLY | Baseline tables/RLS production already has | profiles, user_progress, user_economy, user_srs, subscriptions, transactions | yes |
| `002_client_snapshot.sql` | LOCAL_REPLAY_ONLY | `client_snapshot` + profiles insert policy | `user_progress.client_snapshot` | yes |
| `003_profile_trigger.sql` | LOCAL_REPLAY_ONLY | `handle_new_user` | `handle_new_user` | yes |
| `004_leagues.sql` | LOCAL_REPLAY_ONLY | League tables/RPCs already on production | league_memberships, `add_league_weekly_xp` | yes |
| `005_social.sql` | LOCAL_REPLAY_ONLY | Social columns/view | username, public_profiles | yes |
| `006_economy_server.sql` | LOCAL_REPLAY_ONLY | economy_ledger + reward RPCs | economy_ledger, `grant_lesson_reward` | yes |
| `007_internal_test_pro.sql` | SUPERSEDED | Early `economy_user_is_pro` | `economy_user_is_pro` | yes, then later replaced |
| `008_server_entitlement_rpc.sql` | LOCAL_REPLAY_ONLY | `get_server_entitlement` | `get_server_entitlement` | yes |
| `009_profile_admin.sql` | LOCAL_REPLAY_ONLY | country / signup_source | profiles.country | yes |
| `010_beta_feedback.sql` | LOCAL_REPLAY_ONLY | beta_feedback / submit RPCs | beta_feedback | yes |
| `019_turnstile_vault_secret.sql` | RENAMED_EQUIVALENT | Same RPC as hosted turnstile vault | `_edge_get_turnstile_secret` | yes |
| `20260812180000_production_help_telemetry.sql` | NOT_YET_DEPLOYED | Help telemetry kinds | `submit_beta_pedagogy_event` | yes (local only) |
| `20260813180000_pearl_pro_economy.sql` | NOT_YET_DEPLOYED | Pearl catalog + ledger | pearl_milestone_catalog, pearl_ledger | yes (local only) |
| `20260814010000_mastery_pass_telemetry.sql` | NOT_YET_DEPLOYED | mastery_pass_* kinds | `submit_beta_pedagogy_event` | yes (local only) |
| `20260825043000_business_foundation.sql` | NOT_YET_DEPLOYED | Organizations + leads | organizations, business_leads | yes (local only) |
| `20260825062000_business_operational_hardening.sql` | NOT_YET_DEPLOYED | Business RLS/helpers | `is_organization_member` | yes (local only) |
| `20260826230000_placement_onboarding.sql` | NOT_YET_DEPLOYED | Placement persist | placement_attempts, `commit_placement_result` | yes (local only) |
| `20260827023000_placement_onboarding_handoff.sql` | NOT_YET_DEPLOYED | Drafts + locales | placement_onboarding_drafts, `save_placement_onboarding_draft` | yes (local only) |
| `20260828013000_api_role_table_grants.sql` | NOT_YET_DEPLOYED | Ephemeral Data API grants (hosted already has platform defaults) | table privileges | yes (local only) |
| `20260828020000_least_privilege_api_grants.sql` | NOT_YET_DEPLOYED | Tighten anon/authenticated after 13000 | table privileges | yes (local only) |
| `20260828030000_progress_mastery_monotonic.sql` | NOT_YET_DEPLOYED | Server GREATEST mastery merge | `merge_progress_mastery_monotonic` | yes (local only) |
| `20260828032249_progress_mastery_monotonic_clamp.sql` | NOT_YET_DEPLOYED | Clamp 0..4 + empty search_path | `longyu_clamp_mastery_level` | yes (local only) |

## LOCAL_AND_REMOTE (name match, timestamps differ)

Hosted Management API timestamps do not match local filenames. Match is by
normalized name, not version. **Do not** rename local files to the remote
timestamp.

| remote version | remote name | local file | match |
| --- | --- | --- | --- |
| `20260804032032` | `pedagogy_analytics_consent` | `011_pedagogy_analytics_consent.sql` | name_only |
| `20260804032109` | `subscription_event_ordering` | `014_subscription_event_ordering.sql` | name_only |
| `20260804032252` | `pedagogy_consent_rpc_gate` | `012_pedagogy_consent_rpc_gate.sql` | name_only |
| `20260804032353` | `pedagogy_rpc_hardening` | `013_pedagogy_rpc_hardening.sql` | name_only |
| `20260804032737` | `fix_apply_subscription_event_rowcount` | `015_fix_apply_subscription_event_rowcount.sql` | name_only |
| `20260804042502` | `fix_leagues_cohort_finalize` | `016_fix_leagues_cohort_finalize.sql` | name_only |
| `20260804083127` | `017_referrals` | `017_referrals.sql` | name_only |
| `20260804171838` | `018_signup_rate_limits` | `018_signup_rate_limits.sql` | name_only |
| `20260804182833` | `020_signup_cleanup_job` | `020_signup_cleanup_job.sql` | name_only |
| `20260804231003` | `ensure_own_profile` | `021_ensure_own_profile.sql` | name_only |
| `20260807175927` | `022_fix_referral_try_qualify` | `022_fix_referral_try_qualify.sql` | name_only |
| `20260808065946` | `harden_function_privileges` | `20260808064852_harden_function_privileges.sql` | name_only |
| `20260808071731` | `secure_social_profile_boundary` | `20260808070849_secure_social_profile_boundary.sql` | name_only |
| `20260808074952` | `erase_account_personal_data` | `20260808073233_erase_account_personal_data.sql` | name_only |
| `20260808084551` | `harden_anonymous_ingestion` | `20260808081000_harden_anonymous_ingestion.sql` | name_only |
| `20260808122646` | `harden_referral_qualification` | `20260808093000_harden_referral_qualification.sql` | name_only |
| `20260808134045` | `admin_roles_user_id` | `20260808130200_admin_roles_user_id.sql` | name_only |
| `20260808134047` | `harden_subscription_event_ordering` | `20260808130100_harden_subscription_event_ordering.sql` | name_only |
| `20260808134407` | `abuse_controls_ip_email_snapshot` | `20260808150000_abuse_controls_ip_email_snapshot.sql` | name_only |
| `20260808134423` | `economy_anti_cheat_qi` | `20260808140000_economy_anti_cheat_qi.sql` | name_only |
| `20260808134424` | `harden_economy_reward_trust` | `20260808130000_harden_economy_reward_trust.sql` | name_only |
| `20260808174114` | `revoke_economy_user_is_pro_client` | `20260808160000_revoke_economy_user_is_pro_client.sql` | name_only |
| `20260808183305` | `harden_client_reward_claims` | `20260808170000_harden_client_reward_claims.sql` | name_only |
| `20260809161017` | `require_referral_reward_review` | `20260809160306_require_referral_reward_review.sql` | name_only |
| `20260809161213` | `index_referral_review_reviewer` | `20260809161134_index_referral_review_reviewer.sql` | name_only |
| `20260810175737` | `beta_experience_telemetry` | `20260810170000_beta_experience_telemetry.sql` | name_only |
