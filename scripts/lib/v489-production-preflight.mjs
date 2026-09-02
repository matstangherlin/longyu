/**
 * V4.8.9 production backend preflight. This module is evidence and policy only.
 * It deliberately contains no credential lookup or hosted mutation capability.
 */
export const V489_BACKEND_RC = "backend-rc-v489-preapply";
export const V489_BASE_MAIN_SHA = "02bf2f1803ffbde0e17efc00dbf3f0cde5b71163";
export const V489_PRODUCTION_PROJECT_ID = "drjcfalvlbbeblmmyhwj";
export const V489_PRODUCTION_WATERMARK = "20260810175737";
export const V489_READONLY_CAPTURED_AT = "2026-09-01T23:48:15.668474Z";

export const V489_PENDING_MIGRATIONS = [
  { file: "20260812180000_production_help_telemetry.sql", risk: "R1", group: "telemetry" },
  { file: "20260813180000_pearl_pro_economy.sql", risk: "R3", group: "economy" },
  { file: "20260814010000_mastery_pass_telemetry.sql", risk: "R1", group: "telemetry" },
  { file: "20260825043000_business_foundation.sql", risk: "R2", group: "business" },
  { file: "20260825062000_business_operational_hardening.sql", risk: "R2", group: "business" },
  { file: "20260826230000_placement_onboarding.sql", risk: "R3", group: "auth-placement" },
  { file: "20260827023000_placement_onboarding_handoff.sql", risk: "R3", group: "auth-placement" },
  { file: "20260828013000_api_role_table_grants.sql", risk: "R3", group: "grants" },
  { file: "20260828020000_least_privilege_api_grants.sql", risk: "R3", group: "grants" },
  { file: "20260828030000_progress_mastery_monotonic.sql", risk: "R4", group: "sync-mastery" },
  { file: "20260828032249_progress_mastery_monotonic_clamp.sql", risk: "R4", group: "sync-mastery" },
];

export const V489_INSEPARABLE_PAIRS = [
  ["20260828013000_api_role_table_grants.sql", "20260828020000_least_privilege_api_grants.sql"],
  ["20260828030000_progress_mastery_monotonic.sql", "20260828032249_progress_mastery_monotonic_clamp.sql"],
];

export const V489_PRODUCTION_COUNTS = Object.freeze({
  auth_users: 11,
  profiles: 11,
  onboarding_completed: 9,
  user_progress: 10,
  user_srs: 0,
  user_economy: 9,
  subscriptions: 1,
  active_subscriptions: 1,
  entitlement_grants: 1,
  transactions: 0,
  beta_pedagogy_events: 618,
  beta_feedback: 5,
});

export const V489_EDGE_INVENTORY = [
  { slug: "create-checkout-session", version: 10, verify_jwt: true, classification: "COMMERCIAL_REQUIRED" },
  { slug: "create-billing-portal", version: 9, verify_jwt: true, classification: "COMMERCIAL_REQUIRED" },
  { slug: "stripe-webhook", version: 11, verify_jwt: false, classification: "COMMERCIAL_REQUIRED" },
  { slug: "delete-account", version: 10, verify_jwt: true, classification: "CORE_LAUNCH_REQUIRED" },
  { slug: "create-account", version: 8, verify_jwt: false, classification: "CORE_LAUNCH_REQUIRED" },
  { slug: "issue-anon-ingestion-session", version: 3, verify_jwt: false, classification: "CORE_LAUNCH_REQUIRED" },
  { slug: "commit-placement", version: null, verify_jwt: true, classification: "CORE_LAUNCH_REQUIRED" },
  { slug: "finalize-onboarding", version: null, verify_jwt: true, classification: "CORE_LAUNCH_REQUIRED" },
  { slug: "submit-business-lead", version: null, verify_jwt: false, classification: "BUSINESS_OPTIONAL" },
];

export const V489_SCOREBOARD = Object.freeze({
  PRODUCTION_INVENTORY_READY: "PASS",
  MIGRATION_DELTA_READY: "PASS",
  EDGE_DELTA_READY: "PASS",
  NEW_LOGICAL_BACKUP_READY: "BLOCKED",
  BACKUP_RESTORE_VERIFIED: "BLOCKED",
  EPHEMERAL_SCHEMA_READY: "NOT_RUN",
  EPHEMERAL_RLS_READY: "NOT_RUN",
  EPHEMERAL_AUTH_READY: "NOT_RUN",
  EPHEMERAL_PLACEMENT_READY: "NOT_RUN",
  EPHEMERAL_SYNC_READY: "NOT_RUN",
  EPHEMERAL_RECOVERY_READY: "NOT_RUN",
  PHYSICAL_QA_READY: "NOT_PROMOTED",
  PRODUCTION_APPLY_READY: "BLOCKED",
  READY_FOR_PUBLIC_BETA: "NOT_PROMOTED",
});

export const V489_DECISION = "BLOCKED_BEFORE_PRODUCTION_APPLY";
export const V489_PRODUCTION_WRITE_BOUNDARY = "PRODUCTION_WRITE_BOUNDARY_REACHED";
