/**
 * V4.7.8B FASE B plan only. Never writes to MandarimProject.
 * `--apply` is refused until a later remessa is explicitly authorized.
 */
import { V478_MISSING_EDGES, V478_PENDING_MIGRATIONS } from "./lib/v478-backend-rc.mjs";
import {
  V478B_APPROVAL_TOKEN,
  V478B_AUTH_RECOVERY_SCOPE,
  V478B_BACKUP_CREATED_AT,
  V478B_BACKUP_GATE,
  V478B_BACKUP_RECOVERY_GATE,
  V478B_BACKUP_TYPE,
  V478B_CRITICAL_ROW_COUNTS,
  V478B_INSEPARABLE_PAIRS,
  V478B_MAIN_SHA,
  V478B_MANUAL_LOGICAL_BACKUP_CREATED,
  V478B_MANUAL_LOGICAL_BACKUP_VERIFIED,
  V478B_MANUAL_LOGICAL_DUMP_FILES,
  V478B_PRODUCTION_PROJECT_ID,
  V478B_REMESSA_STATUS,
  V478B_WATERMARK_VERSION,
  isV478bManualLogicalBackupReady,
} from "./lib/v478b-human-gate.mjs";

const args = new Set(process.argv.slice(2));

if (args.has("--apply") || args.has("--deploy") || args.has("--write")) {
  console.error("REFUSED: FASE B writes are not enabled in this remessa.");
  console.error(`Need exact chat token ${V478B_APPROVAL_TOKEN}.`);
  console.error(
    `Need MANUAL_LOGICAL_BACKUP_CREATED=PASS and MANUAL_LOGICAL_BACKUP_VERIFIED=PASS (now ${V478B_MANUAL_LOGICAL_BACKUP_CREATED}/${V478B_MANUAL_LOGICAL_BACKUP_VERIFIED}; BACKUP_RECOVERY_GATE=${V478B_BACKUP_RECOVERY_GATE}).`
  );
  console.error("This script is plan-only. It never calls apply or Edge deploy.");
  process.exit(2);
}

const plan = {
  remessa: "V4.7.8B",
  remessa_status: V478B_REMESSA_STATUS,
  production_writes: "ZERO",
  project_id: V478B_PRODUCTION_PROJECT_ID,
  MAIN_SHA: V478B_MAIN_SHA,
  watermark: V478B_WATERMARK_VERSION,
  backup_type: V478B_BACKUP_TYPE,
  backup_created_at: V478B_BACKUP_CREATED_AT,
  manual_logical_backup_created: V478B_MANUAL_LOGICAL_BACKUP_CREATED,
  manual_logical_backup_verified: V478B_MANUAL_LOGICAL_BACKUP_VERIFIED,
  backup_recovery_gate: V478B_BACKUP_RECOVERY_GATE,
  backup_gate: V478B_BACKUP_GATE,
  auth_recovery_scope: V478B_AUTH_RECOVERY_SCOPE,
  critical_row_counts: V478B_CRITICAL_ROW_COUNTS,
  dump_files_off_repo: V478B_MANUAL_LOGICAL_DUMP_FILES,
  pitr: false,
  manual_logical_backup_ready: isV478bManualLogicalBackupReady(),
  approval_token_required: V478B_APPROVAL_TOKEN,
  pending_migrations: V478_PENDING_MIGRATIONS,
  inseparable_pairs: V478B_INSEPARABLE_PAIRS,
  missing_edge_functions: V478_MISSING_EDGES,
  runbook: "docs/reports/v478b-fase-b-runbook.md",
  note: "This output is not permission to apply. Hosted scoreboard stays NOT_RUN. Not PITR; RPO is dump created_at.",
};

console.log(JSON.stringify(plan, null, 2));
