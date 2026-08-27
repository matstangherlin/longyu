/**
 * Portão V4.7.6 — código + guarda. Não inventa STAGING_READY=PASS.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  LONGYU_INTENDED_STAGING_PROJECT_ID,
  LONGYU_PRODUCTION_PROJECT_ID,
  extractProjectRef,
  foreignProductName,
  isForeignProductProjectId,
  isProductionProjectId,
  requireStagingProjectId,
} from "./lib/staging-guard.mjs";

const root = path.resolve(import.meta.dirname, "..");
const errors = [];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function fail(message) {
  errors.push(message);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function runScript(script, env, extraArgs = []) {
  return spawnSync(process.execPath, [path.join(root, script), ...extraArgs], {
    cwd: root,
    env: { ...process.env, ...env },
    encoding: "utf8",
  });
}

assert(isProductionProjectId(LONGYU_PRODUCTION_PROJECT_ID), "MandarimProject é produção");
assert(foreignProductName("ylofdottauzcqcifnnpm") === "atomurus", "atomurus é produto estrangeiro");
assert(isForeignProductProjectId("https://ylofdottauzcqcifnnpm.supabase.co"), "URL atomurus recusada");
assert(!isForeignProductProjectId(LONGYU_INTENDED_STAGING_PROJECT_ID), "preview não é atomurus");

let threw = false;
try {
  requireStagingProjectId({ LONGYU_STAGING_PROJECT_ID: LONGYU_PRODUCTION_PROJECT_ID });
} catch {
  threw = true;
}
assert(threw, "requireStagingProjectId recusa produção");

threw = false;
try {
  requireStagingProjectId({ LONGYU_STAGING_PROJECT_ID: "ylofdottauzcqcifnnpm" });
} catch (error) {
  threw = true;
  assert(String(error.message).includes("atomurus"), "mensagem cita atomurus");
}
assert(threw, "requireStagingProjectId recusa atomurus");

assert(
  extractProjectRef("https://wpnmygzxqvmpdlcuwrjp.supabase.co") === LONGYU_INTENDED_STAGING_PROJECT_ID,
  "preview URL resolve"
);

const prodLive = runScript("scripts/v476-live-validation.mjs", {
  LONGYU_STAGING_PROJECT_ID: LONGYU_PRODUCTION_PROJECT_ID,
  SUPABASE_ACCESS_TOKEN: "",
});
assert(prodLive.status === 2, "v476 live recusa produção (exit 2)");
assert(/HARD FAIL/.test(`${prodLive.stdout}\n${prodLive.stderr}`), "v476 live HARD FAIL em produção");

const atomurusLive = runScript("scripts/v476-live-validation.mjs", {
  LONGYU_STAGING_PROJECT_ID: "ylofdottauzcqcifnnpm",
  SUPABASE_ACCESS_TOKEN: "",
});
assert(atomurusLive.status === 2, "v476 live recusa atomurus (exit 2)");
assert(/atomurus/.test(`${atomurusLive.stdout}\n${atomurusLive.stderr}`), "v476 live cita atomurus");

const previewBlocked = runScript("scripts/v476-live-validation.mjs", {
  LONGYU_STAGING_PROJECT_ID: LONGYU_INTENDED_STAGING_PROJECT_ID,
  SUPABASE_ACCESS_TOKEN: "",
});
assert(previewBlocked.status === 2, "v476 live BLOCKED sem ACTIVE_HEALTHY/token");
const previewOut = `${previewBlocked.stdout}\n${previewBlocked.stderr}`;
assert(/BLOCKED/.test(previewOut), "preview sem token é BLOCKED");
assert(!/"STAGING_READY": "PASS"/.test(previewOut), "runner não imprime STAGING_READY PASS");

const applyBlocked = runScript(
  "scripts/v476-live-validation.mjs",
  {
    LONGYU_STAGING_PROJECT_ID: LONGYU_INTENDED_STAGING_PROJECT_ID,
    SUPABASE_ACCESS_TOKEN: "",
  },
  ["--apply"]
);
assert(applyBlocked.status === 2, "--apply sem healthy não aplica");
assert(!/OK: migrations de staging aplicadas/.test(`${applyBlocked.stdout}\n${applyBlocked.stderr}`), "não aplica DDL");

const prodMigrate = runScript("scripts/apply-staging-migrations.mjs", {
  LONGYU_STAGING_PROJECT_ID: LONGYU_PRODUCTION_PROJECT_ID,
  SUPABASE_ACCESS_TOKEN: "sbp_fake",
});
assert(prodMigrate.status === 2, "migrate:staging recusa produção");

const atomurusMigrate = runScript("scripts/apply-staging-migrations.mjs", {
  LONGYU_STAGING_PROJECT_ID: "ylofdottauzcqcifnnpm",
  SUPABASE_ACCESS_TOKEN: "sbp_fake",
});
assert(atomurusMigrate.status === 2, "migrate:staging recusa atomurus");

const prodSchema = runScript("scripts/assert-staging-schema.mjs", {
  LONGYU_STAGING_PROJECT_ID: LONGYU_PRODUCTION_PROJECT_ID,
  SUPABASE_ACCESS_TOKEN: "sbp_fake",
});
assert(prodSchema.status === 2, "assert schema recusa produção");

const prodSecrets = runScript("scripts/audit-staging-secrets.mjs", {
  LONGYU_STAGING_PROJECT_ID: LONGYU_PRODUCTION_PROJECT_ID,
});
assert(prodSecrets.status === 2, "audit secrets recusa produção");

const liveStripe = runScript("scripts/audit-staging-secrets.mjs", {
  LONGYU_STAGING_PROJECT_ID: LONGYU_INTENDED_STAGING_PROJECT_ID,
  STRIPE_SECRET_KEY: "sk_live_this_is_not_a_real_secret_for_tests",
});
assert(liveStripe.status === 2, "audit recusa Stripe Live");
assert(
  !/sk_live_this_is_not_a_real_secret_for_tests/.test(`${liveStripe.stdout}\n${liveStripe.stderr}`),
  "audit não imprime o secret"
);

const secretsOk = runScript("scripts/audit-staging-secrets.mjs", {
  LONGYU_STAGING_PROJECT_ID: LONGYU_INTENDED_STAGING_PROJECT_ID,
});
assert(secretsOk.status === 0, "audit sem Live sai 0");
assert(/STRIPE_SECRET_KEY=MISSING/.test(secretsOk.stdout), "Stripe ausente classificado MISSING");
assert(/BUSINESS_LEAD_NOTIFY_WEBHOOK_URL=NOT_REQUIRED/.test(secretsOk.stdout), "webhook business opcional");

const placement = read("supabase/functions/commit-placement/index.ts");
assert(placement.includes("evaluatePlacementEvidence"), "commit-placement recalcula no servidor");
assert(!/body\.(score|skippedLessonIds|masteredByPlacement)/.test(placement), "não lê score/skip/mastery do client");
assert(placement.includes("p_mastered_by_placement: mastered"), "mastery vem da analysis do servidor");
assert(placement.includes("p_recommended_lesson_id: analysis.placement.targetLessonId"), "entry vem da analysis");

const clientCommit = read("src/services/placementCommit.ts");
assert(clientCommit.includes("answers: input.answers.map"), "client envia evidência, não mastery");
assert(!/skippedLessonIds/.test(clientCommit), "client commit não envia skippedLessonIds");

const report = read("docs/reports/v476-staging-live-validation.md");
assert(report.includes("STAGING_READY"), "relatório tem STAGING_READY");
assert(report.includes("AUTH_READY"), "relatório tem AUTH_READY");
assert(report.includes("PLACEMENT_READY"), "relatório tem PLACEMENT_READY");
assert(report.includes("SYNC_READY"), "relatório tem SYNC_READY");
assert(report.includes("SECURITY_STAGING_READY"), "relatório tem SECURITY_STAGING_READY");
assert(/STAGING_READY[^\n]*BLOCKED/.test(report), "STAGING_READY BLOCKED");
assert(!/STAGING_READY[^\n]*PASS/.test(report), "não inventa STAGING_READY PASS");
assert(!/AUTH_READY[^\n]*PASS/.test(report), "não inventa AUTH_READY PASS");
assert(!/READY_FOR_CLOSED_BETA_BR[^\n]*PASS/.test(report), "não marca closed beta");
assert(!/PHYSICAL_QA_READY[^\n]*PASS/.test(report), "não marca PHYSICAL_QA");
assert(!/PAYMENTS_READY[^\n]*PASS/.test(report), "não marca PAYMENTS");
assert(report.includes("2 project limit"), "bloqueio Free documentado");
assert(report.includes("PRE-001"), "PRE-001 documentado");
assert(report.includes("drjcfalvlbbeblmmyhwj"), "produção citada como HARD FAIL");
assert(report.includes("ylofdottauzcqcifnnpm"), "atomurus citado");
assert(report.includes("wpnmygzxqvmpdlcuwrjp"), "preview citado");
assert(report.includes("#203"), "dependência da #203");

const applySrc = read("scripts/apply-staging-migrations.mjs");
assert(applySrc.includes("requireHealthyStagingStatus"), "migrate exige ACTIVE_HEALTHY");
assert(applySrc.includes("fetchSupabaseProject"), "migrate confirma o projeto remoto");
const deploySrc = read("scripts/deploy-staging-functions.mjs");
assert(deploySrc.includes("requireHealthyStagingStatus"), "deploy exige ACTIVE_HEALTHY");

const pkg = JSON.parse(read("package.json"));
assert(pkg.scripts["test:v476-live-validation"], "script test:v476-live-validation");
assert(pkg.scripts["v476:live"], "script v476:live");
assert(pkg.scripts["validate:beta"].includes("test:v476-live-validation"), "validate:beta inclui v476");

if (errors.length) {
  console.error("FAIL test:v476-live-validation:");
  for (const item of errors) console.error(`  - ${item}`);
  process.exit(1);
}

console.log("OK: test:v476-live-validation (guarda + relatório honesto; live permanece BLOCKED)");
