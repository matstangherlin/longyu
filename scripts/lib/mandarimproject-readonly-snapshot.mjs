/**
 * Read-only snapshot of MandarimProject captured via MCP (list_migrations,
 * list_edge_functions, get_project). Zero writes. Refresh by re-reading
 * production — never apply this as DDL.
 */
export const MANDARIMPROJECT_READONLY_CAPTURED_AT = "2026-08-28T02:20:00Z";

export const MANDARIMPROJECT_READONLY_MIGRATIONS = [
  { version: "20260804032032", name: "pedagogy_analytics_consent" },
  { version: "20260804032109", name: "subscription_event_ordering" },
  { version: "20260804032252", name: "pedagogy_consent_rpc_gate" },
  { version: "20260804032353", name: "pedagogy_rpc_hardening" },
  { version: "20260804032737", name: "fix_apply_subscription_event_rowcount" },
  { version: "20260804042502", name: "fix_leagues_cohort_finalize" },
  { version: "20260804082814", name: "referrals_mvp" },
  { version: "20260804083127", name: "017_referrals" },
  { version: "20260804171838", name: "018_signup_rate_limits" },
  { version: "20260804175935", name: "turnstile_secret_vault_rpc" },
  { version: "20260804182833", name: "020_signup_cleanup_job" },
  { version: "20260804231003", name: "ensure_own_profile" },
  { version: "20260807175927", name: "022_fix_referral_try_qualify" },
  { version: "20260808065946", name: "harden_function_privileges" },
  { version: "20260808071731", name: "secure_social_profile_boundary" },
  { version: "20260808074952", name: "erase_account_personal_data" },
  { version: "20260808084551", name: "harden_anonymous_ingestion" },
  { version: "20260808122646", name: "harden_referral_qualification" },
  { version: "20260808133923", name: "harden_economy_claim_mission" },
  { version: "20260808134006", name: "harden_economy_grant_story_energy" },
  { version: "20260808134007", name: "harden_economy_claim_league_week_reward" },
  { version: "20260808134009", name: "harden_economy_add_league_weekly_xp" },
  { version: "20260808134010", name: "harden_economy_grant_lesson_reward" },
  { version: "20260808134045", name: "admin_roles_user_id" },
  { version: "20260808134047", name: "harden_subscription_event_ordering" },
  { version: "20260808134325", name: "profiles_social_columns" },
  { version: "20260808134407", name: "abuse_controls_ip_email_snapshot" },
  { version: "20260808134423", name: "economy_anti_cheat_qi" },
  { version: "20260808134424", name: "harden_economy_reward_trust" },
  { version: "20260808174114", name: "revoke_economy_user_is_pro_client" },
  { version: "20260808183305", name: "harden_client_reward_claims" },
  { version: "20260809161017", name: "require_referral_reward_review" },
  { version: "20260809161213", name: "index_referral_review_reviewer" },
  { version: "20260810175737", name: "beta_experience_telemetry" },
];

export const MANDARIMPROJECT_READONLY_EDGES = [
  { slug: "create-checkout-session", version: 10, status: "ACTIVE", verify_jwt: true },
  { slug: "create-billing-portal", version: 9, status: "ACTIVE", verify_jwt: true },
  { slug: "stripe-webhook", version: 11, status: "ACTIVE", verify_jwt: false },
  { slug: "delete-account", version: 10, status: "ACTIVE", verify_jwt: true },
  { slug: "create-account", version: 8, status: "ACTIVE", verify_jwt: false },
  { slug: "issue-anon-ingestion-session", version: 3, status: "ACTIVE", verify_jwt: false },
];

export const MANDARIMPROJECT_MISSING_PROFILE_COLUMNS = [
  "country_code",
  "interface_locale",
  "instruction_locale",
];

export const MANDARIMPROJECT_MISSING_TABLES = [
  "placement_attempts",
  "placement_onboarding_drafts",
  "business_leads",
  "pearl_milestone_catalog",
  "organizations",
  "organization_members",
];

export const MANDARIMPROJECT_MISSING_ECONOMY_COLUMNS = ["pearl_ledger"];

export const MANDARIMPROJECT_MISSING_RPCS = [
  "commit_placement_result",
  "save_placement_onboarding_draft",
  "claim_pearl_milestone",
  "merge_progress_mastery_monotonic",
];
