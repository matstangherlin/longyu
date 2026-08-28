# SECURITY DEFINER audit (Longyu)

Generated at: 2026-08-28T01:06:41.149Z

Static pass over `supabase/migrations` (latest `create or replace` per signature). Live ephemeral audit runs in CI (`npm run rehearse:ephemeral`) and overwrites findings from the applied schema.

| Function | Args | search_path in creator header | File |
| --- | --- | --- | --- |
| `handle_new_user` | `` | yes | `016_fix_leagues_cohort_finalize.sql` |
| `iso_week_key` | `p_at timestamptz default now(` | yes | `004_leagues.sql` |
| `ensure_league_membership` | `p_user_id uuid default auth.uid(` | yes | `20260808064852_harden_function_privileges.sql` |
| `finalize_league_week_for_user` | `p_user_id uuid` | yes | `016_fix_leagues_cohort_finalize.sql` |
| `sync_league_week` | `p_user_id uuid default auth.uid(` | yes | `20260808064852_harden_function_privileges.sql` |
| `add_league_weekly_xp` | `p_amount integer, p_source_key text` | yes | `20260808170000_harden_client_reward_claims.sql` |
| `get_league_standings` | `` | yes | `004_leagues.sql` |
| `claim_league_week_reward` | `p_week_key text` | yes | `20260808130000_harden_economy_reward_trust.sql` |
| `sync_profile_public_stats` | `` | yes | `20260808150000_abuse_controls_ip_email_snapshot.sql` |
| `search_public_profiles` | `search_query text` | yes | `005_social.sql` |
| `get_public_profile_by_username` | `target_username text` | yes | `005_social.sql` |
| `economy_constants` | `` | yes | `006_economy_server.sql` |
| `economy_ensure_row` | `p_user_id uuid` | yes | `006_economy_server.sql` |
| `economy_row_to_json` | `p_row public.user_economy` | yes | `20260813180000_pearl_pro_economy.sql` |
| `economy_insert_ledger` | `p_user_id uuid, p_operation text, p_amount integer, p_currency text, p_source_id text, p_idempotency_key text, p_metadata jsonb default '{}'::jsonb` | yes | `006_economy_server.sql` |
| `economy_mission_reward` | `p_scope text, p_mission_id text` | yes | `006_economy_server.sql` |
| `consume_charge` | `p_activity_type text, p_idempotency_key text` | yes | `20260808140000_economy_anti_cheat_qi.sql` |
| `spend_qi` | `p_amount integer, p_reason text, p_idempotency_key text` | yes | `006_economy_server.sql` |
| `grant_lesson_reward` | `p_lesson_id text, p_attempt_id text, p_stars integer default 3, p_no_skip boolean default true` | yes | `20260808170000_harden_client_reward_claims.sql` |
| `grant_story_energy` | `p_story_id text, p_day_key text` | yes | `20260808170000_harden_client_reward_claims.sql` |
| `claim_mission` | `p_scope text, p_mission_id text, p_period_key text, p_metric_value integer default 0` | yes | `20260808140000_economy_anti_cheat_qi.sql` |
| `open_chest` | `p_chest_type text, p_opening_id text` | yes | `006_economy_server.sql` |
| `migrate_local_economy` | `p_payload jsonb, p_idempotency_key text` | yes | `006_economy_server.sql` |
| `economy_user_is_pro` | `p_user_id uuid` | yes | `20260825062000_business_operational_hardening.sql` |
| `get_server_entitlement` | `` | yes | `20260825062000_business_operational_hardening.sql` |
| `is_beta_admin` | `` | yes | `20260808130200_admin_roles_user_id.sql` |
| `beta_feedback_rate_limited` | `p_user_id uuid, p_local_profile_id text` | yes | `010_beta_feedback.sql` |
| `submit_beta_feedback` | `p_category text, p_message text, p_route text default '', p_lesson_id text default null, p_exercise_kind text default null, p_exercise_index integer default null, p_app_version text default '', p_browser text default '', p_viewport text default '', p_local_profile_id text default null, p_client_dedupe_key text default null` | yes | `20260808081000_harden_anonymous_ingestion.sql` |
| `submit_beta_pedagogy_event` | `p_event_type text, p_route text default '', p_lesson_id text default null, p_exercise_kind text default null, p_exercise_index integer default null, p_metadata jsonb default '{}'::jsonb, p_local_profile_id text default null, p_client_dedupe_key text default null` | yes | `012_pedagogy_consent_rpc_gate.sql` |
| `update_beta_feedback_admin` | `p_id uuid, p_status text, p_admin_note text default null` | yes | `010_beta_feedback.sql` |
| `beta_pedagogy_context_digest` | `p_client_context text` | yes | `013_pedagogy_rpc_hardening.sql` |
| `beta_pedagogy_event_rate_limited` | `p_user_id uuid, p_local_profile_id text` | yes | `013_pedagogy_rpc_hardening.sql` |
| `beta_pedagogy_event_type_rate_limited` | `p_user_id uuid, p_local_profile_id text, p_context_digest text, p_event_type text, p_lesson_id text, p_scene_id text` | yes | `013_pedagogy_rpc_hardening.sql` |
| `sanitize_pedagogy_metadata` | `p_event_type text, p_metadata jsonb` | yes | `20260814010000_mastery_pass_telemetry.sql` |
| `beta_pedagogy_touch_anon_session` | `p_token text, p_context_digest text` | yes | `013_pedagogy_rpc_hardening.sql` |
| `cleanup_beta_pedagogy_events` | `p_retain_days integer default 90` | yes | `20260808081000_harden_anonymous_ingestion.sql` |
| `submit_beta_pedagogy_event` | `p_event_type text, p_route text default '', p_lesson_id text default null, p_exercise_kind text default null, p_exercise_index integer default null, p_metadata jsonb default '{}'::jsonb, p_local_profile_id text default null, p_client_dedupe_key text default null, p_client_context text default null, p_anon_session_token text default null` | yes | `20260808081000_harden_anonymous_ingestion.sql` |
| `apply_subscription_event` | `p_user_id uuid, p_customer_id text, p_subscription_id text, p_status text, p_price_id text, p_current_period_start timestamptz, p_current_period_end timestamptz, p_cancel_at_period_end boolean, p_event_created bigint` | yes | `015_fix_apply_subscription_event_rowcount.sql` |
| `week_ends_at` | `p_at timestamptz default now(` | yes | `016_fix_leagues_cohort_finalize.sql` |
| `finalize_stale_league_cohorts` | `` | yes | `016_fix_leagues_cohort_finalize.sql` |
| `_referral_random_code` | `` | yes | `017_referrals.sql` |
| `_user_stripe_pro_active` | `p_user_id uuid` | yes | `017_referrals.sql` |
| `_user_stripe_pro_period_end` | `p_user_id uuid` | yes | `017_referrals.sql` |
| `_user_active_grant_end` | `p_user_id uuid` | yes | `017_referrals.sql` |
| `user_has_entitlement_grant` | `p_user_id uuid` | yes | `017_referrals.sql` |
| `_referral_progress_from_snapshot` | `p_user_id uuid` | yes | `017_referrals.sql` |
| `ensure_referral_code` | `` | yes | `017_referrals.sql` |
| `attribute_referral` | `p_code text` | yes | `017_referrals.sql` |
| `_referral_try_qualify` | `p_referral_id uuid` | yes | `20260809160306_require_referral_reward_review.sql` |
| `_referral_grant_reward` | `p_referral_id uuid` | yes | `017_referrals.sql` |
| `process_referral_pipeline` | `` | yes | `20260809160306_require_referral_reward_review.sql` |
| `get_referral_dashboard` | `` | yes | `017_referrals.sql` |
| `check_and_record_signup_rate` | `p_ip_hash text, p_email_hash text` | yes | `018_signup_rate_limits.sql` |
| `admin_cleanup_unconfirmed_signups` | `p_older_than interval default interval '14 days', p_dry_run boolean default true, p_limit integer default 100` | yes | `018_signup_rate_limits.sql` |
| `_edge_get_turnstile_secret` | `` | yes | `019_turnstile_vault_secret.sql` |
| `run_signup_cleanup_job` | `p_dry_run boolean default true, p_older_than interval default interval '14 days', p_limit integer default 100` | yes | `020_signup_cleanup_job.sql` |
| `ensure_own_profile` | `p_name text default null, p_birth_date date default null, p_country text default null, p_signup_source text default null, p_marketing_opt_in boolean default null, p_onboarding_completed boolean default null` | yes | `20260827023000_placement_onboarding_handoff.sql` |
| `erase_account_personal_data_before_auth_delete` | `` | yes | `20260808073233_erase_account_personal_data.sql` |
| `beta_anon_consume_ingestion_quota` | `p_rate_bucket_key text, p_scope text, p_window_seconds integer, p_origin_limit integer, p_global_limit integer` | yes | `20260808081000_harden_anonymous_ingestion.sql` |
| `issue_beta_anon_ingestion_session` | `p_rate_bucket_key text` | yes | `20260808081000_harden_anonymous_ingestion.sql` |
| `beta_anon_resolve_ingestion_session` | `p_token text` | yes | `20260808081000_harden_anonymous_ingestion.sql` |
| `beta_submit_feedback_core` | `p_category text, p_message text, p_route text, p_lesson_id text, p_exercise_kind text, p_exercise_index integer, p_app_version text, p_browser text, p_viewport text, p_local_profile_id text, p_client_dedupe_key text, p_anon_session_id uuid, p_trusted_rate_key text` | yes | `20260808081000_harden_anonymous_ingestion.sql` |
| `submit_beta_feedback` | `p_category text, p_message text, p_anon_session_token text, p_route text default '', p_lesson_id text default null, p_exercise_kind text default null, p_exercise_index integer default null, p_app_version text default '', p_browser text default '', p_viewport text default '', p_local_profile_id text default null, p_client_dedupe_key text default null` | yes | `20260808081000_harden_anonymous_ingestion.sql` |
| `start_referral_lesson_session` | `p_lesson_id text` | yes | `20260808093000_harden_referral_qualification.sql` |
| `complete_referral_lesson_session` | `p_session_id uuid` | yes | `20260808093000_harden_referral_qualification.sql` |
| `_referral_verified_progress` | `p_user_id uuid, p_since timestamptz` | yes | `20260808093000_harden_referral_qualification.sql` |
| `economy_period_key_acceptable` | `p_scope text, p_period_key text` | yes | `20260808130000_harden_economy_reward_trust.sql` |
| `apply_subscription_event` | `p_user_id uuid, p_customer_id text, p_subscription_id text, p_status text, p_price_id text, p_current_period_start timestamptz, p_current_period_end timestamptz, p_cancel_at_period_end boolean, p_event_created bigint, p_event_id text default null` | yes | `20260808130100_harden_subscription_event_ordering.sql` |
| `economy_period_bounds` | `p_scope text, p_period_key text, out p_start timestamptz, out p_end timestamptz` | yes | `20260808140000_economy_anti_cheat_qi.sql` |
| `canonicalize_email` | `p_email text` | yes | `20260808150000_abuse_controls_ip_email_snapshot.sql` |
| `start_story_energy_session` | `p_story_id text` | yes | `20260808170000_harden_client_reward_claims.sql` |
| `league_xp_server_amount` | `p_source_key text` | yes | `20260808170000_harden_client_reward_claims.sql` |
| `review_referral_qualification` | `p_referral_id uuid, p_approved boolean, p_note text` | yes | `20260809160306_require_referral_reward_review.sql` |
| `claim_pearl_milestone` | `p_milestone_id text` | yes | `20260813180000_pearl_pro_economy.sql` |
| `is_organization_member` | `p_org_id uuid` | yes | `20260825062000_business_operational_hardening.sql` |
| `is_organization_admin` | `p_org_id uuid` | yes | `20260825062000_business_operational_hardening.sql` |
| `_user_organization_entitlement` | `p_user_id uuid` | yes | `20260825062000_business_operational_hardening.sql` |
| `check_and_record_business_lead_rate` | `p_ip_hash text, p_email_hash text` | yes | `20260825062000_business_operational_hardening.sql` |
| `organization_seat_entitlement` | `p_org_id uuid` | yes | `20260825062000_business_operational_hardening.sql` |
| `organization_active_seat_count` | `p_org_id uuid` | yes | `20260825062000_business_operational_hardening.sql` |
| `organization_seats_within_entitlement` | `p_org_id uuid` | yes | `20260825062000_business_operational_hardening.sql` |
| `check_and_record_business_funnel_rate` | `p_ip_hash text, p_event_name text` | yes | `20260825062000_business_operational_hardening.sql` |
| `commit_placement_result` | `p_user_id uuid, p_placement_version integer, p_declared_experience text, p_goal text, p_answers jsonb, p_score_summary jsonb, p_competency_summary jsonb, p_foundation_proofs jsonb, p_recommended_lesson_id text, p_mastered_by_placement text[], p_confidence numeric, p_idempotency_key text default null, p_learning_goal text default null` | yes | `20260827023000_placement_onboarding_handoff.sql` |
| `save_placement_onboarding_draft` | `p_user_id uuid, p_placement_version integer, p_declared_experience text, p_goal text, p_answers jsonb, p_ttl_hours integer default 168` | yes | `20260827023000_placement_onboarding_handoff.sql` |
