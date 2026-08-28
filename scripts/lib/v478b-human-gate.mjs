/**
 * V4.7.8B human-gate identity. Zero MandarimProject writes until the exact token.
 * Backend RC stays v4.7.8-rc.1.
 *
 * Backup on Free Plan is a manual logical dump (not PITR). Human remessa
 * 2026-08-28 confirmed the five off-repo files + local restore rehearsal.
 * This module still never calls apply or Edge deploy.
 */
export const V478B_REMESSA = "V4.7.8B";
export const V478B_REMESSA_STATUS = "READY_FOR_HUMAN_APPLY_APPROVAL";
export const V478B_MAIN_SHA = "3223d4379b5ab4af118a8d88773186e965c504b5";
export const V478B_PRODUCTION_PROJECT_ID = "drjcfalvlbbeblmmyhwj";
export const V478B_PRODUCTION_PROJECT_NAME = "MandarimProject";
export const V478B_WATERMARK_VERSION = "20260810175737";
export const V478B_WATERMARK_NAME = "beta_experience_telemetry";
export const V478B_CAPTURED_AT = "2026-08-28T11:00:47Z";
export const V478B_APPROVAL_TOKEN = "APPROVE_MANDARINPROJECT_BACKEND_UPGRADE";

/** Official CLI dump filenames. Keep off GitHub / off this repository. */
export const V478B_MANUAL_LOGICAL_DUMP_FILES = [
  "roles.sql",
  "schema.sql",
  "data.sql",
  "history_schema.sql",
  "history_data.sql",
];

export const V478B_BACKUP_TYPE = "MANUAL_LOGICAL";
/** Calendar date of the off-repo dump. Exact UTC second was not transmitted. */
export const V478B_BACKUP_CREATED_AT = "2026-08-28";
export const V478B_MANUAL_LOGICAL_BACKUP_CREATED = "PASS";
export const V478B_MANUAL_LOGICAL_BACKUP_VERIFIED = "PASS";
export const V478B_AUTH_RECOVERY_SCOPE = "OUT_OF_SCOPE_THIS_MIGRATION";
export const V478B_BACKUP_STILL_VALID = "PASS";
export const V478B_CI_HEAD_READY = "PASS";
export const V478B_PRODUCTION_DELTA_REFRESHED = "PASS";

export const V478B_CRITICAL_ROW_COUNTS = Object.freeze({
  profiles: 11,
  user_progress: 10,
  user_srs: 0,
  user_economy: 9,
  subscriptions: 1,
  transactions: 0,
});

export const V478B_RESTORED_COUNTS = Object.freeze({ ...V478B_CRITICAL_ROW_COUNTS });

export function v478bBackupRecoveryGateStatus({
  created = V478B_MANUAL_LOGICAL_BACKUP_CREATED,
  verified = V478B_MANUAL_LOGICAL_BACKUP_VERIFIED,
} = {}) {
  if (created === "PASS" && verified === "PASS") {
    return "PASS_WITH_MANUAL_LOGICAL_BACKUP";
  }
  return "WAITING_MANUAL_LOGICAL_BACKUP";
}

export const V478B_BACKUP_RECOVERY_GATE = v478bBackupRecoveryGateStatus();
/** Scoreboard / plan alias of BACKUP_RECOVERY_GATE. */
export const V478B_BACKUP_GATE = V478B_BACKUP_RECOVERY_GATE;

export function isV478bManualLogicalBackupReady() {
  return (
    V478B_MANUAL_LOGICAL_BACKUP_CREATED === "PASS" &&
    V478B_MANUAL_LOGICAL_BACKUP_VERIFIED === "PASS"
  );
}

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
