/** V4.7.6 — migrations operacionais a aplicar SOMENTE em staging isolado. */
export const V476_OPERATIONAL_MIGRATIONS = [
  "20260812180000_production_help_telemetry.sql",
  "20260813180000_pearl_pro_economy.sql",
  "20260814010000_mastery_pass_telemetry.sql",
  "20260825043000_business_foundation.sql",
  "20260825062000_business_operational_hardening.sql",
  "20260826230000_placement_onboarding.sql",
  "20260827023000_placement_onboarding_handoff.sql",
];

export const V476_REQUIRED_TABLES = [
  "placement_attempts",
  "placement_onboarding_drafts",
  "business_leads",
  "pearl_ledger",
];

export const V476_REQUIRED_PROFILE_COLUMNS = [
  "country_code",
  "interface_locale",
  "instruction_locale",
  "native_language",
  "target_language",
  "onboarding_completed",
];

export const V476_REQUIRED_EDGE_SLUGS = [
  "create-account",
  "commit-placement",
  "finalize-onboarding",
  "create-checkout-session",
  "create-billing-portal",
  "stripe-webhook",
  "delete-account",
  "issue-anon-ingestion-session",
  "submit-business-lead",
];

/** Names only. Never log values. */
export const V476_SECRET_CATALOG = [
  { name: "LONGYU_STAGING_PROJECT_ID", kind: "required_for_scripts" },
  { name: "STAGING_SUPABASE_URL", kind: "required_for_live" },
  { name: "STAGING_SUPABASE_ANON_KEY", kind: "required_for_live" },
  { name: "STAGING_SUPABASE_SERVICE_ROLE_KEY", kind: "required_for_live" },
  { name: "SUPABASE_ACCESS_TOKEN", kind: "required_for_mgmt" },
  { name: "VITE_TURNSTILE_SITE_KEY", kind: "optional_until_public_signup" },
  { name: "TURNSTILE_SECRET_KEY", kind: "optional_until_public_signup" },
  { name: "STRIPE_SECRET_KEY", kind: "test_mode_only" },
  { name: "STRIPE_WEBHOOK_SECRET", kind: "test_mode_only" },
  { name: "STRIPE_PRICE_PRO_MONTHLY", kind: "test_mode_only" },
  { name: "STRIPE_PRICE_PRO_ANNUAL", kind: "test_mode_only" },
  { name: "BUSINESS_LEAD_NOTIFY_WEBHOOK_URL", kind: "optional" },
  { name: "BUSINESS_LEAD_NOTIFY_TOKEN", kind: "optional" },
  { name: "LONGYU_QA_EMAIL", kind: "required_for_auth_live" },
  { name: "LONGYU_QA_PASSWORD", kind: "required_for_auth_live" },
];

export const V476_PRODUCTION_WATERMARK = {
  version: "20260810175737",
  name: "beta_experience_telemetry",
};

export const V476_SCOREBOARD_KEYS = [
  "STAGING_READY",
  "AUTH_READY",
  "PLACEMENT_READY",
  "SYNC_READY",
  "SECURITY_STAGING_READY",
];
