/**
 * V4.7.7 contract constants. Longyu-only. No foreign product IDs.
 */
export const V477_SCOREBOARD_KEYS = [
  "MIGRATION_HISTORY_UNDERSTOOD",
  "HISTORICAL_MIGRATIONS_FROZEN",
  "CANONICAL_SCHEMA_READY",
  "GRANT_SURFACE_READY",
  "RLS_MATRIX_READY",
  "RPC_CONTRACT_READY",
  "EDGE_CONTRACT_READY",
  "SYNC_MONOTONICITY_READY",
  "PRODUCTION_DEPLOYMENT_PLAN_READY",
  "LOCAL_AUTH_FLOW_READY",
];

export const V477_SENSITIVE_TABLES = [
  "profiles",
  "user_progress",
  "user_srs",
  "user_economy",
  "subscriptions",
  "transactions",
  "placement_attempts",
  "placement_onboarding_drafts",
  "organizations",
  "organization_members",
  "user_chests",
  "user_missions",
  "user_achievements",
  "economy_ledger",
  "business_leads",
  "pearl_milestone_catalog",
];

/** Remote-only MandarimProject versions. Class A/B/C/D. No UNKNOWN. */
export const V477_REMOTE_ONLY_CLASS = {
  20260804082814: {
    name: "referrals_mvp",
    class: "C",
    label: "SUPERSEDED",
    represented_by: "017_referrals.sql",
    purpose: "First referrals apply on hosted; immediately followed by 017_referrals.",
    objects: ["referrals", "referral_codes"],
  },
  20260804175935: {
    name: "turnstile_secret_vault_rpc",
    class: "A",
    label: "RENAMED_EQUIVALENT",
    represented_by: "019_turnstile_vault_secret.sql",
    purpose: "Vault lookup _edge_get_turnstile_secret for create-account.",
    objects: ["_edge_get_turnstile_secret"],
  },
  20260808133923: {
    name: "harden_economy_claim_mission",
    class: "A",
    label: "ALREADY_IN_LOCAL_CHAIN",
    represented_by: "20260808130000_harden_economy_reward_trust.sql",
    purpose: "Hosted split of claim_mission hardening; local file keeps the same RPC.",
    objects: ["claim_mission"],
  },
  20260808134006: {
    name: "harden_economy_grant_story_energy",
    class: "A",
    label: "ALREADY_IN_LOCAL_CHAIN",
    represented_by: "20260808130000_harden_economy_reward_trust.sql",
    purpose: "Hosted split of grant_story_energy hardening.",
    objects: ["grant_story_energy"],
  },
  20260808134007: {
    name: "harden_economy_claim_league_week_reward",
    class: "A",
    label: "ALREADY_IN_LOCAL_CHAIN",
    represented_by: "20260808130000_harden_economy_reward_trust.sql",
    purpose: "Hosted split of claim_league_week_reward hardening.",
    objects: ["claim_league_week_reward"],
  },
  20260808134009: {
    name: "harden_economy_add_league_weekly_xp",
    class: "A",
    label: "ALREADY_IN_LOCAL_CHAIN",
    represented_by: "20260808130000_harden_economy_reward_trust.sql",
    purpose: "Hosted split of add_league_weekly_xp hardening.",
    objects: ["add_league_weekly_xp"],
  },
  20260808134010: {
    name: "harden_economy_grant_lesson_reward",
    class: "A",
    label: "ALREADY_IN_LOCAL_CHAIN",
    represented_by: "20260808130000_harden_economy_reward_trust.sql",
    purpose: "Hosted split of grant_lesson_reward hardening.",
    objects: ["grant_lesson_reward"],
  },
  20260808134325: {
    name: "profiles_social_columns",
    class: "A",
    label: "ALREADY_IN_LOCAL_CHAIN",
    represented_by: "005_social.sql",
    purpose: "Hosted add of username/avatar/public stats; local 005_social.sql.",
    objects: ["profiles.username", "profiles.avatar_key", "profiles.show_in_search"],
  },
};

/** Local-only files vs MandarimProject watermark. */
export const V477_LOCAL_ONLY_CLASS = {
  "001_initial_schema.sql": {
    class: "LOCAL_REPLAY_ONLY",
    purpose: "Reconstructs baseline tables/RLS that production already has without matching timestamps.",
    objects: ["profiles", "user_progress", "user_economy", "user_srs", "subscriptions", "transactions"],
  },
  "002_client_snapshot.sql": {
    class: "LOCAL_REPLAY_ONLY",
    purpose: "client_snapshot column + profiles insert policy.",
    objects: ["user_progress.client_snapshot"],
  },
  "003_profile_trigger.sql": {
    class: "LOCAL_REPLAY_ONLY",
    purpose: "handle_new_user on auth.users.",
    objects: ["handle_new_user"],
  },
  "004_leagues.sql": {
    class: "LOCAL_REPLAY_ONLY",
    purpose: "League tables and RPCs already on production.",
    objects: ["league_memberships", "add_league_weekly_xp"],
  },
  "005_social.sql": {
    class: "LOCAL_REPLAY_ONLY",
    purpose: "Social columns/view; hosted applied as profiles_social_columns.",
    objects: ["profiles.username", "public_profiles"],
  },
  "006_economy_server.sql": {
    class: "LOCAL_REPLAY_ONLY",
    purpose: "economy_ledger + reward RPCs already on production.",
    objects: ["economy_ledger", "grant_lesson_reward"],
  },
  "007_internal_test_pro.sql": {
    class: "SUPERSEDED",
    purpose: "Early economy_user_is_pro; later migrations rewrite the function on both sides.",
    objects: ["economy_user_is_pro"],
  },
  "008_server_entitlement_rpc.sql": {
    class: "LOCAL_REPLAY_ONLY",
    purpose: "get_server_entitlement exists on production.",
    objects: ["get_server_entitlement"],
  },
  "009_profile_admin.sql": {
    class: "LOCAL_REPLAY_ONLY",
    purpose: "profiles.country / signup_source / marketing_opt_in exist on production.",
    objects: ["profiles.country", "profiles.signup_source"],
  },
  "010_beta_feedback.sql": {
    class: "LOCAL_REPLAY_ONLY",
    purpose: "beta_feedback / beta_admins / submit RPCs exist on production.",
    objects: ["beta_feedback", "submit_beta_feedback"],
  },
  "019_turnstile_vault_secret.sql": {
    class: "RENAMED_EQUIVALENT",
    purpose: "Same RPC as hosted turnstile_secret_vault_rpc.",
    objects: ["_edge_get_turnstile_secret"],
  },
  "20260812180000_production_help_telemetry.sql": {
    class: "NOT_YET_DEPLOYED",
    purpose: "Help telemetry events; pending MandarimProject apply.",
    objects: ["submit_beta_pedagogy_event help kinds"],
  },
  "20260813180000_pearl_pro_economy.sql": {
    class: "NOT_YET_DEPLOYED",
    purpose: "Pearl catalog + claim_pearl_milestone + pearl_ledger column.",
    objects: ["pearl_milestone_catalog", "user_economy.pearl_ledger"],
  },
  "20260814010000_mastery_pass_telemetry.sql": {
    class: "NOT_YET_DEPLOYED",
    purpose: "mastery_pass_* pedagogy event kinds.",
    objects: ["submit_beta_pedagogy_event"],
  },
  "20260825043000_business_foundation.sql": {
    class: "NOT_YET_DEPLOYED",
    purpose: "Organizations + business_leads.",
    objects: ["organizations", "business_leads"],
  },
  "20260825062000_business_operational_hardening.sql": {
    class: "NOT_YET_DEPLOYED",
    purpose: "Business RLS/helpers hardening.",
    objects: ["is_organization_member"],
  },
  "20260826230000_placement_onboarding.sql": {
    class: "NOT_YET_DEPLOYED",
    purpose: "placement_attempts + commit_placement_result.",
    objects: ["placement_attempts", "commit_placement_result"],
  },
  "20260827023000_placement_onboarding_handoff.sql": {
    class: "NOT_YET_DEPLOYED",
    purpose: "Drafts, locales, finalize handoff.",
    objects: ["placement_onboarding_drafts", "save_placement_onboarding_draft"],
  },
  "20260828013000_api_role_table_grants.sql": {
    class: "NOT_YET_DEPLOYED",
    purpose: "Ephemeral Data API grants (hosted already has platform defaults).",
    objects: ["table privileges"],
  },
  "20260828020000_least_privilege_api_grants.sql": {
    class: "NOT_YET_DEPLOYED",
    purpose: "Tighten anon/authenticated grants after 20260828013000.",
    objects: ["table privileges"],
  },
  "20260828030000_progress_mastery_monotonic.sql": {
    class: "NOT_YET_DEPLOYED",
    purpose: "Server-side GREATEST mastery merge on user_progress updates.",
    objects: ["merge_progress_mastery_monotonic"],
  },
};

export const V477_HISTORICAL_EDITS = [
  {
    file: "012_pedagogy_consent_rpc_gate.sql",
    kind: "FRESH_REPLAY_ONLY",
    summary:
      "DROP VIEW admin_user_overview then CREATE VIEW. CREATE OR REPLACE cannot rename columns (42P16) on ephemeral replay. Semantic view body matches hosted; MandarimProject history unchanged.",
  },
];

export const V477_CRITICAL_RPCS = [
  {
    name: "commit_placement_result",
    args: "p_user_id uuid, p_placement_version integer, p_declared_experience text, p_goal text, p_answers jsonb, p_score_summary jsonb, p_competency_summary jsonb, p_foundation_proofs jsonb, p_recommended_lesson_id text, p_mastered_by_placement text[], p_confidence numeric, p_idempotency_key text, p_learning_goal text",
    security: "definer",
    grants: ["service_role"],
    caller: "edge:commit-placement, edge:finalize-onboarding",
    idempotency: "p_idempotency_key unique per user",
    domain: "placement",
  },
  {
    name: "save_placement_onboarding_draft",
    args: "p_user_id uuid, p_placement_version integer, p_declared_experience text, p_goal text, p_answers jsonb, p_ttl_hours integer",
    security: "definer",
    grants: ["service_role"],
    caller: "edge:create-account",
    idempotency: "upsert by user_id",
    domain: "onboarding",
  },
  {
    name: "ensure_own_profile",
    args: "p_name text, p_birth_date date, p_country text, p_signup_source text, p_marketing_opt_in boolean, p_onboarding_completed boolean",
    security: "definer",
    grants: ["authenticated"],
    caller: "src/services/authService.ts",
    idempotency: "upsert profiles id",
    domain: "onboarding",
  },
  {
    name: "grant_lesson_reward",
    args: "p_lesson_id text, p_attempt_id text, p_stars integer, p_no_skip boolean",
    security: "definer",
    grants: ["authenticated"],
    caller: "src/lib/economyServerBridge.ts",
    idempotency: "economy_ledger key lesson-reward:<lesson_id>",
    domain: "economy",
  },
  {
    name: "claim_mission",
    args: "p_scope text, p_mission_id text, p_period_key text, p_metric_value integer",
    security: "definer",
    grants: ["authenticated"],
    caller: "src/lib/economyServerBridge.ts",
    idempotency: "ledger per user/scope/mission/period",
    domain: "economy",
  },
  {
    name: "claim_pearl_milestone",
    args: "p_milestone_id text",
    security: "definer",
    grants: ["authenticated"],
    caller: "src/lib/economyServerBridge.ts",
    idempotency: "pearl claim unique",
    domain: "economy",
  },
  {
    name: "add_league_weekly_xp",
    args: "p_amount integer, p_source_key text",
    security: "definer",
    grants: ["authenticated"],
    caller: "src/services/leagueService.ts",
    idempotency: "league_xp_events source_key",
    domain: "economy",
  },
  {
    name: "apply_subscription_event",
    args: "p_user_id uuid, p_customer_id text, p_subscription_id text, p_status text, p_price_id text, p_current_period_start timestamp with time zone, p_current_period_end timestamp with time zone, p_cancel_at_period_end boolean, p_event_created bigint, p_event_id text",
    security: "definer",
    grants: ["service_role"],
    caller: "edge:stripe-webhook",
    idempotency: "stripe event id",
    domain: "subscription",
  },
  {
    name: "get_server_entitlement",
    args: "",
    security: "definer",
    grants: ["authenticated"],
    caller: "src/services/entitlementService.ts",
    idempotency: "read-only",
    domain: "subscription",
  },
  {
    name: "attribute_referral",
    args: "p_code text",
    security: "definer",
    grants: ["authenticated"],
    caller: "src/services/referralService.ts",
    idempotency: "invitee unique",
    domain: "referral",
  },
];

export const V477_GRANT_MATRIX = [
  {
    table: "profiles",
    operation: "SELECT",
    sql_grant: "authenticated",
    rls: "profiles_select_own",
    use_case: "Read own profile",
  },
  {
    table: "profiles",
    operation: "INSERT",
    sql_grant: "authenticated",
    rls: "profiles_insert_own",
    use_case: "Client fallback profile insert",
  },
  {
    table: "profiles",
    operation: "UPDATE",
    sql_grant: "authenticated",
    rls: "profiles_update_own",
    use_case: "Update own profile fields",
  },
  {
    table: "user_progress",
    operation: "SELECT",
    sql_grant: "authenticated",
    rls: "user_progress_select_own",
    use_case: "Cloud pull",
  },
  {
    table: "user_progress",
    operation: "INSERT",
    sql_grant: "authenticated",
    rls: "user_progress_insert_own",
    use_case: "Cloud first push",
  },
  {
    table: "user_progress",
    operation: "UPDATE",
    sql_grant: "authenticated",
    rls: "user_progress_update_own",
    use_case: "Cloud sync upsert",
  },
  {
    table: "user_srs",
    operation: "SELECT",
    sql_grant: "authenticated",
    rls: "user_srs_select_own",
    use_case: "SRS pull",
  },
  {
    table: "user_srs",
    operation: "INSERT",
    sql_grant: "authenticated",
    rls: "user_srs_insert_own",
    use_case: "SRS write",
  },
  {
    table: "user_srs",
    operation: "UPDATE",
    sql_grant: "authenticated",
    rls: "user_srs_update_own",
    use_case: "SRS write",
  },
  {
    table: "subscriptions",
    operation: "SELECT",
    sql_grant: "authenticated",
    rls: "subscriptions_select_own",
    use_case: "Show own subscription",
  },
  {
    table: "transactions",
    operation: "SELECT",
    sql_grant: "authenticated",
    rls: "transactions_select_own",
    use_case: "Show own receipts",
  },
  {
    table: "placement_attempts",
    operation: "SELECT",
    sql_grant: "authenticated",
    rls: "placement_attempts_select_own",
    use_case: "Read own placement",
  },
  {
    table: "user_economy",
    operation: "SELECT",
    sql_grant: "authenticated",
    rls: "user_economy_select_own",
    use_case: "Read Qi/pearls; writes via RPC",
  },
];

export const V477_ANON_TABLE_JUSTIFICATION = [
  {
    table: "(none of the user-owned product tables)",
    privileges: [],
    justification:
      "Anonymous product flows use RPCs (submit_beta_feedback, submit_beta_pedagogy_event, issue_beta_anon_ingestion_session) and public Edge (create-account, submit-business-lead). Direct table DML for anon is not a supported use-case.",
  },
];
