/**
 * V4.7.8 backend identity. Separate from LONGYU_RC_VERSION (v4.7.4-rc.1).
 * If backend SQL/contracts change after this freeze, bump to v4.7.8-rc.2.
 */
export const LONGYU_BACKEND_RC = "v4.7.8-rc.1";
export const LONGYU_BACKEND_RC_CHANNEL = "mandarimproject-controlled-upgrade";

/** origin/main when this remessa started. FASE 0 merge of #206 may move main later. */
export const LONGYU_MAIN_SHA_AT_FREEZE = "b2a5818af1182277ac61c699970b1e3e868ded12";

/** V4.7.7 contract freeze HEAD (#206). */
export const LONGYU_V477_HEAD = "1823d7d6a96c021eb7a55a5c94cf480ce4590a1d";

export const LONGYU_BACKEND_PLACEMENT_VERSION = 2;

/** Exact human token required before any MandarimProject write. This remessa never writes. */
export const V478_APPROVAL_TOKEN = "APPROVE_MANDARINPROJECT_BACKEND_UPGRADE";

export const V478_REMESSA_STATUS = "READY_FOR_CONTROLLED_UPGRADE";

export const V478_HOSTED_SCOREBOARD_KEYS = [
  "MANDARINPROJECT_SCHEMA_READY",
  "MANDARINPROJECT_GRANTS_READY",
  "MANDARINPROJECT_RLS_READY",
  "MANDARINPROJECT_EDGE_READY",
  "HOSTED_AUTH_READY",
  "HOSTED_PLACEMENT_READY",
  "HOSTED_SYNC_READY",
  "HOSTED_RECOVERY_READY",
  "HOSTED_SECURITY_READY",
];

export const V478_PENDING_MIGRATIONS = [
  "20260812180000_production_help_telemetry.sql",
  "20260813180000_pearl_pro_economy.sql",
  "20260814010000_mastery_pass_telemetry.sql",
  "20260825043000_business_foundation.sql",
  "20260825062000_business_operational_hardening.sql",
  "20260826230000_placement_onboarding.sql",
  "20260827023000_placement_onboarding_handoff.sql",
  "20260828013000_api_role_table_grants.sql",
  "20260828020000_least_privilege_api_grants.sql",
  "20260828030000_progress_mastery_monotonic.sql",
  "20260828032249_progress_mastery_monotonic_clamp.sql",
];

export const V478_MISSING_EDGES = [
  "commit-placement",
  "finalize-onboarding",
  "submit-business-lead",
];
