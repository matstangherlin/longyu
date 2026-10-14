# RC2.3.10B migration forensics

Generated 2026-10-08T21:30:42.603Z from `0e5e528ca357643b6b8a18462dd16f74020ccffd`.

Method: Per ledger entry: when the applied production SQL is available (--prod-sql-dir), compare it with every repo migration by normalized md5 (MATCH_EXACT), structural signature hash (MATCH_SEMANTIC) and structural subset (PARTIAL_EQUIVALENT). Without production SQL, only an unchanged ledger md5 re-verified against the current repo file counts as MATCH_EXACT. Names and descriptions are never evidence.

## Counts

| Status | Entries |
| --- | ---: |
| MATCH_EXACT | 19 |
| MATCH_SEMANTIC | 3 |
| PARTIAL_EQUIVALENT | 7 |
| UNKNOWN | 34 |

Production SQL provided for 14 of 36 production rows.

| Prior ledger state | Entries |
| --- | ---: |
| MATCH | 19 |
| LEGACY_EQUIVALENT | 0 |
| PROD_ONLY | 6 |
| REPO_ONLY | 27 |
| UNKNOWN | 11 |

## Entries

| Version | Name | Repo file | Prior | Status | Confidence | Action |
| --- | --- | --- | --- | --- | ---: | --- |
| 20260804032032 | pedagogy_analytics_consent | supabase/migrations/011_pedagogy_analytics_consent.sql | MATCH | MATCH_EXACT | 1 | none |
| 20260804032109 | subscription_event_ordering | supabase/migrations/014_subscription_event_ordering.sql | UNKNOWN | UNKNOWN | 0.22 | manual object-level diff against production; do not repair or re-run blindly |
| 20260804032252 | pedagogy_consent_rpc_gate | supabase/migrations/012_pedagogy_consent_rpc_gate.sql | UNKNOWN | PARTIAL_EQUIVALENT | 0.87 | repo file and production chunk overlap fully on one side; reviewer confirms the remainder, then record the mapping in the ledger |
| 20260804032353 | pedagogy_rpc_hardening | supabase/migrations/013_pedagogy_rpc_hardening.sql | MATCH | MATCH_EXACT | 1 | none |
| 20260804032737 | fix_apply_subscription_event_rowcount | supabase/migrations/015_fix_apply_subscription_event_rowcount.sql | MATCH | MATCH_EXACT | 1 | none |
| 20260804042502 | fix_leagues_cohort_finalize | supabase/migrations/016_fix_leagues_cohort_finalize.sql | MATCH | MATCH_EXACT | 1 | none |
| 20260804082814 | referrals_mvp | - | UNKNOWN | UNKNOWN | 0 | extract the applied SQL from supabase_migrations.schema_migrations (read-only) into --prod-sql-dir and rerun |
| 20260804083127 | 017_referrals | supabase/migrations/017_referrals.sql | UNKNOWN | PARTIAL_EQUIVALENT | 0.9 | repo file and production chunk overlap fully on one side; reviewer confirms the remainder, then record the mapping in the ledger |
| 20260804171838 | 018_signup_rate_limits | supabase/migrations/018_signup_rate_limits.sql | MATCH | MATCH_EXACT | 1 | none |
| 20260804175935 | turnstile_secret_vault_rpc | supabase/migrations/019_turnstile_vault_secret.sql | MATCH | MATCH_EXACT | 1 | none |
| 20260804182833 | 020_signup_cleanup_job | supabase/migrations/020_signup_cleanup_job.sql | MATCH | MATCH_EXACT | 1 | none |
| 20260804231003 | ensure_own_profile | supabase/migrations/021_ensure_own_profile.sql | MATCH | MATCH_EXACT | 1 | none |
| 20260807175927 | 022_fix_referral_try_qualify | supabase/migrations/022_fix_referral_try_qualify.sql | MATCH | MATCH_EXACT | 1 | none |
| 20260808065946 | harden_function_privileges | supabase/migrations/20260808064852_harden_function_privileges.sql | UNKNOWN | UNKNOWN | 0.27 | manual object-level diff against production; do not repair or re-run blindly |
| 20260808071731 | secure_social_profile_boundary | supabase/migrations/20260808070849_secure_social_profile_boundary.sql | MATCH | MATCH_EXACT | 1 | none |
| 20260808074952 | erase_account_personal_data | supabase/migrations/20260808073233_erase_account_personal_data.sql | MATCH | MATCH_EXACT | 1 | none |
| 20260808084551 | harden_anonymous_ingestion | supabase/migrations/20260808081000_harden_anonymous_ingestion.sql | UNKNOWN | MATCH_SEMANTIC | 0.95 | reviewer confirms; then record as LEGACY_EQUIVALENT in the ledger (formatting-only difference) |
| 20260808122646 | harden_referral_qualification | supabase/migrations/20260808093000_harden_referral_qualification.sql | MATCH | MATCH_EXACT | 1 | none |
| 20260808133923 | harden_economy_claim_mission | - | PROD_ONLY | UNKNOWN | 0 | manual object-level diff against production; do not repair or re-run blindly |
| 20260808134006 | harden_economy_grant_story_energy | - | PROD_ONLY | UNKNOWN | 0 | manual object-level diff against production; do not repair or re-run blindly |
| 20260808134007 | harden_economy_claim_league_week_reward | supabase/migrations/20260808130000_harden_economy_reward_trust.sql | PROD_ONLY | PARTIAL_EQUIVALENT | 0.51 | repo file and production chunk overlap fully on one side; reviewer confirms the remainder, then record the mapping in the ledger |
| 20260808134009 | harden_economy_add_league_weekly_xp | supabase/migrations/20260808130000_harden_economy_reward_trust.sql | PROD_ONLY | PARTIAL_EQUIVALENT | 0.51 | repo file and production chunk overlap fully on one side; reviewer confirms the remainder, then record the mapping in the ledger |
| 20260808134010 | harden_economy_grant_lesson_reward | - | PROD_ONLY | UNKNOWN | 0 | manual object-level diff against production; do not repair or re-run blindly |
| 20260808134045 | admin_roles_user_id | supabase/migrations/20260808130200_admin_roles_user_id.sql | UNKNOWN | MATCH_SEMANTIC | 0.95 | reviewer confirms; then record as LEGACY_EQUIVALENT in the ledger (formatting-only difference) |
| 20260808134047 | harden_subscription_event_ordering | supabase/migrations/20260808130100_harden_subscription_event_ordering.sql | UNKNOWN | PARTIAL_EQUIVALENT | 0.83 | repo file and production chunk overlap fully on one side; reviewer confirms the remainder, then record the mapping in the ledger |
| 20260808134325 | profiles_social_columns | supabase/migrations/005_social.sql | PROD_ONLY | PARTIAL_EQUIVALENT | 0.56 | repo file and production chunk overlap fully on one side; reviewer confirms the remainder, then record the mapping in the ledger |
| 20260808134407 | abuse_controls_ip_email_snapshot | supabase/migrations/20260808150000_abuse_controls_ip_email_snapshot.sql | UNKNOWN | MATCH_SEMANTIC | 0.95 | reviewer confirms; then record as LEGACY_EQUIVALENT in the ledger (formatting-only difference) |
| 20260808134423 | economy_anti_cheat_qi | supabase/migrations/20260808140000_economy_anti_cheat_qi.sql | UNKNOWN | UNKNOWN | 0 | extract the applied SQL from supabase_migrations.schema_migrations (read-only) into --prod-sql-dir and rerun |
| 20260808134424 | harden_economy_reward_trust | supabase/migrations/20260808130000_harden_economy_reward_trust.sql | UNKNOWN | UNKNOWN | 0 | extract the applied SQL from supabase_migrations.schema_migrations (read-only) into --prod-sql-dir and rerun |
| 20260808174114 | revoke_economy_user_is_pro_client | supabase/migrations/20260808160000_revoke_economy_user_is_pro_client.sql | MATCH | MATCH_EXACT | 1 | none |
| 20260808183305 | harden_client_reward_claims | supabase/migrations/20260808170000_harden_client_reward_claims.sql | MATCH | MATCH_EXACT | 1 | none |
| 20260809161017 | require_referral_reward_review | supabase/migrations/20260809160306_require_referral_reward_review.sql | MATCH | MATCH_EXACT | 1 | none |
| 20260809161213 | index_referral_review_reviewer | supabase/migrations/20260809161134_index_referral_review_reviewer.sql | MATCH | MATCH_EXACT | 1 | none |
| 20260810175737 | beta_experience_telemetry | supabase/migrations/20260810170000_beta_experience_telemetry.sql | MATCH | MATCH_EXACT | 1 | none |
| 20260924140545 | rc2_2_11_username_identifier_login | supabase/pending/rc2-2-11-username-identifier.sql | MATCH | MATCH_EXACT | 1 | none |
| 20261007013220 | jev_feedback_triage | supabase/migrations/20261007120000_jev_feedback_triage.sql | MATCH | MATCH_EXACT | 1 | none |
| - | initial_schema | supabase/migrations/001_initial_schema.sql | REPO_ONLY | UNKNOWN | 0 | manual object-level diff against production; do not repair or re-run blindly |
| - | client_snapshot | supabase/migrations/002_client_snapshot.sql | REPO_ONLY | UNKNOWN | 0 | manual object-level diff against production; do not repair or re-run blindly |
| - | profile_trigger | supabase/migrations/003_profile_trigger.sql | REPO_ONLY | UNKNOWN | 0 | manual object-level diff against production; do not repair or re-run blindly |
| - | leagues | supabase/migrations/004_leagues.sql | REPO_ONLY | UNKNOWN | 0 | manual object-level diff against production; do not repair or re-run blindly |
| - | social | supabase/migrations/005_social.sql | REPO_ONLY | PARTIAL_EQUIVALENT | 0.56 | repo file and production chunk overlap fully on one side; reviewer confirms the remainder, then record the mapping in the ledger |
| - | economy_server | supabase/migrations/006_economy_server.sql | REPO_ONLY | UNKNOWN | 0 | manual object-level diff against production; do not repair or re-run blindly |
| - | internal_test_pro | supabase/migrations/007_internal_test_pro.sql | REPO_ONLY | UNKNOWN | 0 | manual object-level diff against production; do not repair or re-run blindly |
| - | server_entitlement_rpc | supabase/migrations/008_server_entitlement_rpc.sql | REPO_ONLY | UNKNOWN | 0 | manual object-level diff against production; do not repair or re-run blindly |
| - | profile_admin | supabase/migrations/009_profile_admin.sql | REPO_ONLY | UNKNOWN | 0 | manual object-level diff against production; do not repair or re-run blindly |
| - | beta_feedback | supabase/migrations/010_beta_feedback.sql | REPO_ONLY | UNKNOWN | 0 | manual object-level diff against production; do not repair or re-run blindly |
| - | production_help_telemetry | supabase/migrations/20260812180000_production_help_telemetry.sql | REPO_ONLY | UNKNOWN | 0 | manual object-level diff against production; do not repair or re-run blindly |
| - | pearl_pro_economy | supabase/migrations/20260813180000_pearl_pro_economy.sql | REPO_ONLY | UNKNOWN | 0 | manual object-level diff against production; do not repair or re-run blindly |
| - | mastery_pass_telemetry | supabase/migrations/20260814010000_mastery_pass_telemetry.sql | REPO_ONLY | UNKNOWN | 0 | manual object-level diff against production; do not repair or re-run blindly |
| - | business_foundation | supabase/migrations/20260825043000_business_foundation.sql | REPO_ONLY | UNKNOWN | 0 | manual object-level diff against production; do not repair or re-run blindly |
| - | business_operational_hardening | supabase/migrations/20260825062000_business_operational_hardening.sql | REPO_ONLY | UNKNOWN | 0 | manual object-level diff against production; do not repair or re-run blindly |
| - | placement_onboarding | supabase/migrations/20260826230000_placement_onboarding.sql | REPO_ONLY | UNKNOWN | 0 | manual object-level diff against production; do not repair or re-run blindly |
| - | placement_onboarding_handoff | supabase/migrations/20260827023000_placement_onboarding_handoff.sql | REPO_ONLY | UNKNOWN | 0 | manual object-level diff against production; do not repair or re-run blindly |
| - | api_role_table_grants | supabase/migrations/20260828013000_api_role_table_grants.sql | REPO_ONLY | UNKNOWN | 0 | manual object-level diff against production; do not repair or re-run blindly |
| - | least_privilege_api_grants | supabase/migrations/20260828020000_least_privilege_api_grants.sql | REPO_ONLY | UNKNOWN | 0 | manual object-level diff against production; do not repair or re-run blindly |
| - | progress_mastery_monotonic | supabase/migrations/20260828030000_progress_mastery_monotonic.sql | REPO_ONLY | UNKNOWN | 0 | manual object-level diff against production; do not repair or re-run blindly |
| - | progress_mastery_monotonic_clamp | supabase/migrations/20260828032249_progress_mastery_monotonic_clamp.sql | REPO_ONLY | UNKNOWN | 0 | manual object-level diff against production; do not repair or re-run blindly |
| - | family_plan_foundation | supabase/migrations/20260914120000_family_plan_foundation.sql | REPO_ONLY | UNKNOWN | 0 | manual object-level diff against production; do not repair or re-run blindly |
| - | business_seat_integrity | supabase/migrations/20260914180000_business_seat_integrity.sql | REPO_ONLY | UNKNOWN | 0 | manual object-level diff against production; do not repair or re-run blindly |
| - | family_invite_flow | supabase/migrations/20260914200000_family_invite_flow.sql | REPO_ONLY | UNKNOWN | 0 | manual object-level diff against production; do not repair or re-run blindly |
| - | family_entitlement | supabase/migrations/20260914210000_family_entitlement.sql | REPO_ONLY | UNKNOWN | 0 | manual object-level diff against production; do not repair or re-run blindly |
| - | rc2-3-10-league-memberships-policy-recursion | supabase/pending/rc2-3-10-league-memberships-policy-recursion.sql | REPO_ONLY | UNKNOWN | 0 | manual object-level diff against production; do not repair or re-run blindly |
| - | rc2-3-10-telemetry-retention | supabase/pending/rc2-3-10-telemetry-retention.sql | REPO_ONLY | UNKNOWN | 0 | manual object-level diff against production; do not repair or re-run blindly |

## Evidence for entries not proven exact

### 20260804032109 subscription_event_ordering (UNKNOWN)

- production SQL 20260804032109_subscription_event_ordering.sql matches no repo file structurally
- closest by name supabase/migrations/014_subscription_event_ordering.sql: cannot prove equivalence: 3 shared, 0 only in a, 0 only in b, 1 changed; objects with the same identity but different attributes: function:public.apply_subscription_event(p_user_id uuid,p_customer_id text,p_subscription_id text,p_status text,p_price_id text,p_current_period_start timestamptz,p_current_period_end timestamptz,p_cancel_at_period_end boolean,p_event_created bigint)
- name or description alone is not evidence

### 20260804032252 pedagogy_consent_rpc_gate (PARTIAL_EQUIVALENT)

- production SQL 20260804032252_pedagogy_consent_rpc_gate.sql vs supabase/migrations/012_pedagogy_consent_rpc_gate.sql
- all 11 structural objects of a are present with identical attributes in b (12 objects)
- 1 objects exist only in b

### 20260804082814 referrals_mvp (UNKNOWN)

- production SQL file 20260804082814_referrals_mvp.sql is a placeholder
- prior ledger state UNKNOWN: history row is a placeholder (52 chars): real SQL was applied outside supabase_migrations
- name or description alone is not evidence

### 20260804083127 017_referrals (PARTIAL_EQUIVALENT)

- production SQL 20260804083127_017_referrals.sql vs supabase/migrations/017_referrals.sql
- all 81 structural objects of a are present with identical attributes in b (82 objects)
- 1 objects exist only in b

### 20260808065946 harden_function_privileges (UNKNOWN)

- production SQL 20260808065946_harden_function_privileges.sql matches no repo file structurally
- closest by name supabase/migrations/20260808064852_harden_function_privileges.sql: cannot prove equivalence: 9 shared, 1 only in a, 1 only in b, 0 changed
- name or description alone is not evidence

### 20260808084551 harden_anonymous_ingestion (MATCH_SEMANTIC)

- production SQL 20260808084551_harden_anonymous_ingestion.sql vs supabase/migrations/20260808081000_harden_anonymous_ingestion.sql
- structural hash c8b4ad68d183f9e4 equal
- 75 structural objects identical (kind, schema, name, attributes) in the same order
- normalized hashes differ only by comment or whitespace-level formatting

### 20260808133923 harden_economy_claim_mission (UNKNOWN)

- production SQL 20260808133923_harden_economy_claim_mission.sql matches no repo file structurally
- name or description alone is not evidence

### 20260808134006 harden_economy_grant_story_energy (UNKNOWN)

- production SQL 20260808134006_harden_economy_grant_story_energy.sql matches no repo file structurally
- name or description alone is not evidence

### 20260808134007 harden_economy_claim_league_week_reward (PARTIAL_EQUIVALENT)

- production SQL 20260808134007_harden_economy_claim_league_week_reward.sql vs supabase/migrations/20260808130000_harden_economy_reward_trust.sql
- all 1 structural objects of a are present with identical attributes in b (60 objects)
- 59 objects exist only in b

### 20260808134009 harden_economy_add_league_weekly_xp (PARTIAL_EQUIVALENT)

- production SQL 20260808134009_harden_economy_add_league_weekly_xp.sql vs supabase/migrations/20260808130000_harden_economy_reward_trust.sql
- all 1 structural objects of a are present with identical attributes in b (60 objects)
- 59 objects exist only in b

### 20260808134010 harden_economy_grant_lesson_reward (UNKNOWN)

- production SQL 20260808134010_harden_economy_grant_lesson_reward.sql matches no repo file structurally
- name or description alone is not evidence

### 20260808134045 admin_roles_user_id (MATCH_SEMANTIC)

- production SQL 20260808134045_admin_roles_user_id.sql vs supabase/migrations/20260808130200_admin_roles_user_id.sql
- structural hash e4c86c9bb47689a9 equal
- 12 structural objects identical (kind, schema, name, attributes) in the same order
- normalized hashes differ only by comment or whitespace-level formatting

### 20260808134047 harden_subscription_event_ordering (PARTIAL_EQUIVALENT)

- production SQL 20260808134047_harden_subscription_event_ordering.sql vs supabase/migrations/20260808130100_harden_subscription_event_ordering.sql
- all 5 structural objects of a are present with identical attributes in b (6 objects)
- 1 objects exist only in b

### 20260808134325 profiles_social_columns (PARTIAL_EQUIVALENT)

- production SQL 20260808134325_profiles_social_columns.sql vs supabase/migrations/005_social.sql
- all 6 structural objects of a are present with identical attributes in b (42 objects)
- 36 objects exist only in b

### 20260808134407 abuse_controls_ip_email_snapshot (MATCH_SEMANTIC)

- production SQL 20260808134407_abuse_controls_ip_email_snapshot.sql vs supabase/migrations/20260808150000_abuse_controls_ip_email_snapshot.sql
- structural hash 89acdaf7435a7eb8 equal
- 18 structural objects identical (kind, schema, name, attributes) in the same order
- normalized hashes differ only by comment or whitespace-level formatting

### 20260808134423 economy_anti_cheat_qi (UNKNOWN)

- production SQL file 20260808134423_economy_anti_cheat_qi.sql is a placeholder
- prior ledger state UNKNOWN: history row is a placeholder (140 chars): real SQL was applied outside supabase_migrations
- name or description alone is not evidence

### 20260808134424 harden_economy_reward_trust (UNKNOWN)

- production SQL file 20260808134424_harden_economy_reward_trust.sql is a placeholder
- prior ledger state UNKNOWN: history row is a placeholder (84 chars): real SQL was applied outside supabase_migrations
- name or description alone is not evidence

### repo-only initial_schema (UNKNOWN)

- 0/133 structural objects found in production SQL
- missing from production SQL: column:public.profiles.birth_date, column:public.profiles.created_at, column:public.profiles.id, column:public.profiles.name, column:public.profiles.native_language, ...

### repo-only client_snapshot (UNKNOWN)

- 0/3 structural objects found in production SQL
- missing from production SQL: column:public.user_progress.client_snapshot_version, column:public.user_progress.client_snapshot, policy:public.profiles.profiles_insert_own

### repo-only profile_trigger (UNKNOWN)

- 0/3 structural objects found in production SQL
- missing from production SQL: drop_trigger:auth.users.on_auth_user_created, function:public.handle_new_user(), trigger:auth.users.on_auth_user_created

### repo-only leagues (UNKNOWN)

- 0/77 structural objects found in production SQL
- missing from production SQL: column:public.league_memberships.current_week_key, column:public.league_memberships.joined_at, column:public.league_memberships.league_tier_id, column:public.league_memberships.promoted_last_week, column:public.league_memberships.rank_position, ...

### repo-only social (PARTIAL_EQUIVALENT)

- production migration 20260808134325_profiles_social_columns is PARTIAL_EQUIVALENT to this file
- all 6 structural objects of a are present with identical attributes in b (42 objects)
- 36 objects exist only in b

### repo-only economy_server (UNKNOWN)

- 1/56 structural objects found in production SQL
- missing from production SQL: column:public.economy_ledger.amount, column:public.economy_ledger.created_at, column:public.economy_ledger.currency, column:public.economy_ledger.idempotency_key, column:public.economy_ledger.id, ...

### repo-only internal_test_pro (UNKNOWN)

- 2/3 structural objects found in production SQL
- missing from production SQL: function:public.economy_user_is_pro(p_user_id uuid)

### repo-only server_entitlement_rpc (UNKNOWN)

- 3/4 structural objects found in production SQL
- missing from production SQL: function:public.get_server_entitlement()

### repo-only profile_admin (UNKNOWN)

- 3/12 structural objects found in production SQL
- missing from production SQL: column:public.profiles.country, column:public.profiles.marketing_opt_in, column:public.profiles.phone, column:public.profiles.signup_source, comment:column public.profiles.country, ...

### repo-only beta_feedback (UNKNOWN)

- 7/75 structural objects found in production SQL
- missing from production SQL: column:public.beta_admins.created_at, column:public.beta_admins.email, column:public.beta_admins.user_id, column:public.beta_feedback.admin_note, column:public.beta_feedback.app_version, ...

### repo-only production_help_telemetry (UNKNOWN)

- 5/9 structural objects found in production SQL
- missing from production SQL: comment:function public.submit_beta_pedagogy_event(text,text,text,text,integer,jsonb,text,text,text,text), function:public.sanitize_pedagogy_metadata(p_event_type text,p_metadata jsonb), function:public.submit_beta_pedagogy_event(p_event_type text,p_route text default '',p_lesson_id text default null,p_exercise_kind text default null,p_exercise_index integer default null,p_metadata jsonb default '{}'::jsonb,p_local_profile_id text default null,p_client_dedupe_key text default null,p_client_context text default null,p_anon_session_token text default null), revoke:public.all on function public.sanitize_pedagogy_metadata(text,jsonb) from public

### repo-only pearl_pro_economy (UNKNOWN)

- 2/54 structural objects found in production SQL
- missing from production SQL: column:public.pearl_journey_phase_catalog.lesson_ids, column:public.pearl_journey_phase_catalog.phase_id, column:public.pearl_milestone_catalog.amount, column:public.pearl_milestone_catalog.enabled, column:public.pearl_milestone_catalog.evidence_kind, ...

### repo-only mastery_pass_telemetry (UNKNOWN)

- 5/9 structural objects found in production SQL
- missing from production SQL: comment:function public.submit_beta_pedagogy_event(text,text,text,text,integer,jsonb,text,text,text,text), function:public.sanitize_pedagogy_metadata(p_event_type text,p_metadata jsonb), function:public.submit_beta_pedagogy_event(p_event_type text,p_route text default '',p_lesson_id text default null,p_exercise_kind text default null,p_exercise_index integer default null,p_metadata jsonb default '{}'::jsonb,p_local_profile_id text default null,p_client_dedupe_key text default null,p_client_context text default null,p_anon_session_token text default null), revoke:public.all on function public.sanitize_pedagogy_metadata(text,jsonb) from public

### repo-only business_foundation (UNKNOWN)

- 3/184 structural objects found in production SQL
- missing from production SQL: column:public.business_funnel_events.created_at, column:public.business_funnel_events.cta_id, column:public.business_funnel_events.event_name, column:public.business_funnel_events.id, column:public.business_lead_rate_events.bucket, ...

### repo-only business_operational_hardening (UNKNOWN)

- 3/90 structural objects found in production SQL
- missing from production SQL: column:public.organization_entitlement_grants.access_source, column:public.organization_entitlement_grants.created_at, column:public.organization_entitlement_grants.created_by, column:public.organization_entitlement_grants.expires_at, column:public.organization_entitlement_grants.id, ...

### repo-only placement_onboarding (UNKNOWN)

- 0/38 structural objects found in production SQL
- missing from production SQL: column:public.placement_attempts.answers, column:public.placement_attempts.competency_summary, column:public.placement_attempts.completed_at, column:public.placement_attempts.confidence, column:public.placement_attempts.created_at, ...

### repo-only placement_onboarding_handoff (UNKNOWN)

- 0/38 structural objects found in production SQL
- missing from production SQL: column:public.placement_onboarding_drafts.answers, column:public.placement_onboarding_drafts.consumed_at, column:public.placement_onboarding_drafts.created_at, column:public.placement_onboarding_drafts.declared_experience, column:public.placement_onboarding_drafts.expires_at, ...

### repo-only api_role_table_grants (UNKNOWN)

- 0/45 structural objects found in production SQL
- missing from production SQL: alter_default_privileges:#4ccc963494d5, alter_default_privileges:#93cccd4ea014, alter_default_privileges:#f70caa9a32ea, grant:public.all on table public.profiles to anon, grant:public.all on table public.profiles to authenticated, ...

### repo-only least_privilege_api_grants (UNKNOWN)

- 0/94 structural objects found in production SQL
- missing from production SQL: grant:public.all on table public.profiles to service_role, grant:public.all on table public.subscriptions to service_role, grant:public.all on table public.transactions to service_role, grant:public.all on table public.user_economy to service_role, grant:public.all on table public.user_progress to service_role, ...

### repo-only progress_mastery_monotonic (UNKNOWN)

- 0/7 structural objects found in production SQL
- missing from production SQL: comment:function public.merge_progress_mastery_monotonic(), drop_trigger:public.user_progress.trg_progress_mastery_monotonic, function:public.merge_progress_mastery_monotonic(), revoke:public.all on function public.merge_progress_mastery_monotonic() from anon, revoke:public.all on function public.merge_progress_mastery_monotonic() from authenticated, ...

### repo-only progress_mastery_monotonic_clamp (UNKNOWN)

- 0/22 structural objects found in production SQL
- missing from production SQL: comment:function public.longyu_clamp_mastery_level(jsonb), comment:function public.longyu_mastery_entry_level(jsonb), comment:function public.longyu_merge_mastery_maps(jsonb,jsonb), comment:function public.merge_progress_mastery_monotonic(), drop_trigger:public.user_progress.trg_progress_mastery_monotonic, ...

### repo-only family_plan_foundation (UNKNOWN)

- 0/63 structural objects found in production SQL
- missing from production SQL: column:public.family_accounts.created_at, column:public.family_accounts.id, column:public.family_accounts.owner_user_id, column:public.family_accounts.status, column:public.family_accounts.subscription_id, ...

### repo-only business_seat_integrity (UNKNOWN)

- 0/33 structural objects found in production SQL
- missing from production SQL: column:public.organizations.contract_reference, column:public.organizations.timezone, comment:column public.organizations.contract_reference, comment:column public.organizations.timezone, comment:function public.get_business_members(uuid,integer,integer), ...

### repo-only family_invite_flow (UNKNOWN)

- 0/25 structural objects found in production SQL
- missing from production SQL: comment:function public.accept_family_invite(text), comment:function public.create_family_invite(text), comment:function public.get_family_overview(), comment:function public.remove_family_member(uuid), comment:function public.revoke_family_invite(uuid), ...

### repo-only family_entitlement (UNKNOWN)

- 3/16 structural objects found in production SQL
- missing from production SQL: comment:function public._user_family_entitlement(uuid), comment:function public.get_server_entitlement(), function:public._user_family_entitlement(p_user_id uuid), function:public.economy_user_is_pro(p_user_id uuid), function:public.get_server_entitlement(), ...

### repo-only rc2-3-10-league-memberships-policy-recursion (UNKNOWN)

- 0/6 structural objects found in production SQL
- missing from production SQL: drop_policy:public.league_memberships.league_memberships_select_peers, function:public.league_viewer_scope(), grant:public.execute on function public.league_viewer_scope() to authenticated, policy:public.league_memberships.league_memberships_select_peers, revoke:public.all on function public.league_viewer_scope() from anon, ...

### repo-only rc2-3-10-telemetry-retention (UNKNOWN)

- 0/16 structural objects found in production SQL
- missing from production SQL: column:public.telemetry_retention_runs.cutoff, column:public.telemetry_retention_runs.deleted_raw_rows, column:public.telemetry_retention_runs.dry_run, column:public.telemetry_retention_runs.id, column:public.telemetry_retention_runs.ran_at, ...

