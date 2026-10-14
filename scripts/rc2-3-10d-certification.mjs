#!/usr/bin/env node
/**
 * RC2.3.10D gate — validate current tree; test kills critical mutation classes.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { journeyFingerprint } from "./lib/report-meta.mjs";
import {
  checkBatchAReadyHonesty,
  checkApplyAllowlist,
  checkNoHistoryRewrite,
  checkCloudCertRequiresSha,
  checkSnapshotOmitsEmail,
  checkCommitPlacementNotReachable,
  checkJevLearnerOff,
  checkCurriculumFingerprint,
  checkMonetizationFrozen,
  checkOldLeaguesNotAllowlisted,
} from "./lib/rc2-3-10d-gates.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
const readJson = (rel) => JSON.parse(read(rel));

function validate() {
  const errors = [];
  const ready = readJson("docs/launch/rc2-3-10c-batch-a-ready.json");
  errors.push(...checkBatchAReadyHonesty(ready).map((e) => `ready:${e}`));
  errors.push(...checkApplyAllowlist().map((e) => `allowlist:${e}`));
  errors.push(...checkOldLeaguesNotAllowlisted(read("scripts/lib/production-migration-allowlist.mjs")).map((e) => `allowlist:${e}`));
  errors.push(...checkNoHistoryRewrite(read("scripts/apply-production-migration.mjs")).map((e) => `apply:${e}`));
  errors.push(...checkSnapshotOmitsEmail(read("src/lib/progressSnapshot.ts")).map((e) => `privacy:${e}`));
  errors.push(...checkCommitPlacementNotReachable(read("src/services/placementCommit.ts")).map((e) => `placement:${e}`));
  errors.push(...checkJevLearnerOff(read("src/lib/featureFlags.ts")).map((e) => `jev:${e}`));
  errors.push(...checkCurriculumFingerprint(journeyFingerprint(root)).map((e) => `curriculum:${e}`));
  errors.push(...checkMonetizationFrozen(read("supabase/functions/stripe-webhook/index.ts")).map((e) => `stripe:${e}`));

  const ledgerSafe = readJson("docs/launch/rc2-3-10d-batch-a-ledger-safe.json");
  if (ledgerSafe.status !== "BATCH_A_LEDGER_SAFE_TO_PROCEED") errors.push("ledger:NOT_SAFE");

  if (!/isCommitPlacementEdgeAvailable/.test(read("src/services/placementCommit.ts"))) {
    errors.push("reachable:COMMIT_PLACEMENT_STILL_REACHABLE");
  }

  const closure = fs.existsSync(path.join(root, "docs/reports/rc2-3-10d-closure.md"))
    ? read("docs/reports/rc2-3-10d-closure.md")
    : "";
  errors.push(...checkCloudCertRequiresSha(closure, null).map((e) => `closure:${e}`));

  if (errors.length) {
    console.error("FAIL validate:rc2-3-10d");
    for (const e of errors) console.error(" -", e);
    process.exit(1);
  }
  console.log("PASS validate:rc2-3-10d");
}

function kill(label, code, errors) {
  if (!errors.includes(code)) {
    console.error(`SURVIVED ${label}: expected ${code} in [${errors.join(",")}]`);
    return false;
  }
  console.log(`KILLED ${label}: ${code}`);
  return true;
}

function test() {
  let ok = true;
  const must = (label, code, errors) => {
    if (!kill(label, code, errors)) ok = false;
  };

  const ready = readJson("docs/launch/rc2-3-10c-batch-a-ready.json");
  const falsePass = {
    ...ready,
    computed: { status: "PASS", blockers: [] },
    request: { ...ready.request, backup: { verified: false } },
  };
  must("1 ready false PASS", "READY_FALSE_PASS", checkBatchAReadyHonesty(falsePass));

  must(
    "2 backup claim incomplete",
    "BATCH_A_PASS_WITHOUT_BACKUP",
    checkBatchAReadyHonesty({
      computed: { status: "BLOCKED" },
      request: { backup: { verified: true } },
    })
  );

  must(
    "3 history rewrite",
    "MIGRATION_HISTORY_REWRITE",
    checkNoHistoryRewrite("delete from supabase_migrations.schema_migrations;")
  );
  must(
    "5 old leagues allowlist",
    "OLD_LEAGUES_IN_ALLOWLIST",
    checkOldLeaguesNotAllowlisted('file: "supabase/migrations/004_leagues.sql"')
  );
  must(
    "13 snapshot email",
    "NEW_SNAPSHOT_STORES_EMAIL",
    checkSnapshotOmitsEmail("account: { id, name, email, authMode, createdAt, updatedAt }")
  );
  must(
    "9 reachable commit-placement",
    "COMMIT_PLACEMENT_STILL_REACHABLE",
    checkCommitPlacementNotReachable("export async function commitPlacementToServer(){ await invoke(\"commit-placement\") }")
  );
  must("20 jev learner", "JEV_LEARNER_RUNTIME_ENABLED", checkJevLearnerOff("fetch('https://api.typesafe.ai/v1')"));
  must("46 fingerprint", "CURRICULUM_FINGERPRINT_CHANGED", checkCurriculumFingerprint("deadbeefdead"));
  must("22 stripe live", "STRIPE_LIVE_KEY", checkMonetizationFrozen("const k='sk_live_abc'"));
  must("43 monetization", "MONETIZATION_ACTIVATED", checkMonetizationFrozen("MONETIZATION_ACTIVATED=true"));
  must(
    "41 cloud pass no sha",
    "CLOUD_PASS_WITHOUT_CERTIFIED_SHA",
    checkCloudCertRequiresSha("cloud.certification = PASS", null)
  );

  if (!ok) process.exit(1);
  console.log("PASS test:rc2-3-10d");
}

const mode = process.argv[2] ?? "validate";
if (mode === "test") test();
else if (mode === "validate") validate();
else {
  console.error("use validate or test");
  process.exit(2);
}
