/**
 * V4.7.8B FASE B plan only. Never writes to MandarimProject.
 * `--apply` is refused until a later remessa is explicitly authorized.
 */
import { V478_MISSING_EDGES, V478_PENDING_MIGRATIONS } from "./lib/v478-backend-rc.mjs";
import {
  V478B_APPROVAL_TOKEN,
  V478B_BACKUP_GATE,
  V478B_INSEPARABLE_PAIRS,
  V478B_MAIN_SHA,
  V478B_PRODUCTION_PROJECT_ID,
  V478B_REMESSA_STATUS,
  V478B_WATERMARK_VERSION,
} from "./lib/v478b-human-gate.mjs";

const args = new Set(process.argv.slice(2));

if (args.has("--apply") || args.has("--deploy") || args.has("--write")) {
  console.error("REFUSED: FASE B writes are not enabled in this remessa.");
  console.error(`Need exact chat token ${V478B_APPROVAL_TOKEN}, confirmed backup, and CI green.`);
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
  backup_gate: V478B_BACKUP_GATE,
  approval_token_required: V478B_APPROVAL_TOKEN,
  pending_migrations: V478_PENDING_MIGRATIONS,
  inseparable_pairs: V478B_INSEPARABLE_PAIRS,
  missing_edge_functions: V478_MISSING_EDGES,
  runbook: "docs/reports/v478b-fase-b-runbook.md",
  note: "This output is not permission to apply. Hosted scoreboard stays NOT_RUN.",
};

console.log(JSON.stringify(plan, null, 2));
