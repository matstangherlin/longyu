/**
 * V4.7.8B human-gate identity. Zero MandarimProject writes until the exact token.
 * Backend RC stays v4.7.8-rc.1 (no contract change in this remessa's STOP phase).
 */
export const V478B_REMESSA = "V4.7.8B";
export const V478B_REMESSA_STATUS = "WAITING_HUMAN_APPROVAL";
export const V478B_BACKUP_GATE = "BLOCKED_BACKUP_NOT_CONFIRMED";
export const V478B_MAIN_SHA = "3223d4379b5ab4af118a8d88773186e965c504b5";
export const V478B_PRODUCTION_PROJECT_ID = "drjcfalvlbbeblmmyhwj";
export const V478B_PRODUCTION_PROJECT_NAME = "MandarimProject";
export const V478B_WATERMARK_VERSION = "20260810175737";
export const V478B_WATERMARK_NAME = "beta_experience_telemetry";
export const V478B_CAPTURED_AT = "2026-08-28T05:14:56Z";
export const V478B_APPROVAL_TOKEN = "APPROVE_MANDARINPROJECT_BACKEND_UPGRADE";

export const V478B_HOSTED_SCOREBOARD_KEYS = [
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

/** Inseparable pairs: never leave production between the first and second file. */
export const V478B_INSEPARABLE_PAIRS = [
  [
    "20260828013000_api_role_table_grants.sql",
    "20260828020000_least_privilege_api_grants.sql",
  ],
  [
    "20260828030000_progress_mastery_monotonic.sql",
    "20260828032249_progress_mastery_monotonic_clamp.sql",
  ],
];
