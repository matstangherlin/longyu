/**
 * Portão V4.7.6R — guarda Longyu-only. Não inventa STAGING_READY=PASS.
 * Não conhece produtos fora do Longyu.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  BLOCKED_REMOTE_STAGING,
  LONGYU_PRODUCTION_PROJECT_ID,
  REFUSING_TO_USE_PRODUCTION_AS_STAGING,
  extractProjectRef,
  isProductionProjectId,
  requireRemoteRehearsalTarget,
  requireStagingProjectId,
} from "./lib/staging-guard.mjs";
import { parseJsonCell, jwtRole } from "./lib/ephemeral-backend.mjs";

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
assert(
  extractProjectRef("https://drjcfalvlbbeblmmyhwj.supabase.co") === LONGYU_PRODUCTION_PROJECT_ID,
  "extractProjectRef lê URL de produção"
);
assert(
  extractProjectRef("https://db.abcdefghijabcdefghij.supabase.co") === "abcdefghijabcdefghij",
  "extractProjectRef lê host db.*"
);

let threw = false;
try {
  requireStagingProjectId({ LONGYU_STAGING_PROJECT_ID: LONGYU_PRODUCTION_PROJECT_ID });
} catch (error) {
  threw = true;
  assert(
    String(error.message).includes(REFUSING_TO_USE_PRODUCTION_AS_STAGING),
    "produção usa REFUSING_TO_USE_PRODUCTION_AS_STAGING"
  );
}
assert(threw, "requireStagingProjectId recusa produção");

threw = false;
try {
  requireStagingProjectId({ LONGYU_STAGING_PROJECT_ID: "" });
} catch (error) {
  threw = true;
  assert(String(error.message).includes(BLOCKED_REMOTE_STAGING), "vazio usa BLOCKED_REMOTE_STAGING");
}
assert(threw, "requireStagingProjectId recusa ID vazio");

threw = false;
try {
  requireStagingProjectId({ LONGYU_STAGING_PROJECT_ID: "abcdefghijabcdefghij" });
} catch {
  threw = true;
}
assert(!threw, "staging isolado configurável é aceito (sem allowlist de outros produtos)");

threw = false;
try {
  requireRemoteRehearsalTarget({ LONGYU_TARGET_PROJECT_ID: LONGYU_PRODUCTION_PROJECT_ID });
} catch (error) {
  threw = true;
  assert(
    String(error.message).includes(REFUSING_TO_USE_PRODUCTION_AS_STAGING),
    "LONGYU_TARGET_PROJECT_ID recusa produção"
  );
}
assert(threw, "requireRemoteRehearsalTarget recusa produção");

threw = false;
try {
  requireRemoteRehearsalTarget({});
} catch (error) {
  threw = true;
  assert(String(error.message).includes(BLOCKED_REMOTE_STAGING), "alvo remoto ausente é BLOCKED");
}
assert(threw, "requireRemoteRehearsalTarget exige id");

const prodLive = runScript("scripts/v476-live-validation.mjs", {
  LONGYU_STAGING_PROJECT_ID: LONGYU_PRODUCTION_PROJECT_ID,
  SUPABASE_ACCESS_TOKEN: "",
});
assert(prodLive.status === 2, "v476 live recusa produção (exit 2)");
assert(
  new RegExp(REFUSING_TO_USE_PRODUCTION_AS_STAGING).test(`${prodLive.stdout}\n${prodLive.stderr}`),
  "v476 live REFUSING_TO_USE_PRODUCTION_AS_STAGING"
);

const missingLive = runScript("scripts/v476-live-validation.mjs", {
  LONGYU_STAGING_PROJECT_ID: "",
  SUPABASE_ACCESS_TOKEN: "",
});
assert(missingLive.status === 2, "v476 live BLOCKED sem staging remoto");
const missingOut = `${missingLive.stdout}\n${missingLive.stderr}`;
assert(missingOut.includes(BLOCKED_REMOTE_STAGING), "ausência é BLOCKED_REMOTE_STAGING");
assert(!/"STAGING_READY": "PASS"/.test(missingOut), "runner não imprime STAGING_READY PASS");
assert(!/EPHEMERAL_DB_READY/.test(missingOut), "live scoreboard não mistura EPHEMERAL_DB_READY");

const isolatedBlocked = runScript("scripts/v476-live-validation.mjs", {
  LONGYU_STAGING_PROJECT_ID: "abcdefghijabcdefghij",
  SUPABASE_ACCESS_TOKEN: "",
});
assert(isolatedBlocked.status === 2, "v476 live BLOCKED sem ACTIVE_HEALTHY/token");
assert(/BLOCKED/.test(`${isolatedBlocked.stdout}\n${isolatedBlocked.stderr}`), "isolado sem token é BLOCKED");

const applyBlocked = runScript(
  "scripts/v476-live-validation.mjs",
  {
    LONGYU_STAGING_PROJECT_ID: "abcdefghijabcdefghij",
    SUPABASE_ACCESS_TOKEN: "",
  },
  ["--apply"]
);
assert(applyBlocked.status === 2, "--apply sem healthy não aplica");
assert(
  !/OK: migrations de staging aplicadas/.test(`${applyBlocked.stdout}\n${applyBlocked.stderr}`),
  "não aplica DDL"
);

const prodMigrate = runScript("scripts/apply-staging-migrations.mjs", {
  LONGYU_STAGING_PROJECT_ID: LONGYU_PRODUCTION_PROJECT_ID,
  SUPABASE_ACCESS_TOKEN: "sbp_fake",
});
assert(prodMigrate.status === 2, "migrate:staging recusa produção");

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
  LONGYU_STAGING_PROJECT_ID: "abcdefghijabcdefghij",
  STRIPE_SECRET_KEY: "sk_live_this_is_not_a_real_secret_for_tests",
});
assert(liveStripe.status === 2, "audit recusa Stripe Live");
assert(
  !/sk_live_this_is_not_a_real_secret_for_tests/.test(`${liveStripe.stdout}\n${liveStripe.stderr}`),
  "audit não imprime o secret"
);

const secretsOk = runScript("scripts/audit-staging-secrets.mjs", {
  LONGYU_STAGING_PROJECT_ID: "abcdefghijabcdefghij",
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

const identityScripts = [
  "scripts/v476-placement-authority.mjs",
  "scripts/v476-auth-identity.mjs",
  "scripts/v476-sync-identity.mjs",
  "scripts/lib/v476-live-env.mjs",
];
for (const file of identityScripts) {
  assert(fs.existsSync(path.join(root, file)), `harness presente: ${file}`);
}

const prodPlace = runScript("scripts/v476-placement-authority.mjs", {
  LONGYU_STAGING_PROJECT_ID: LONGYU_PRODUCTION_PROJECT_ID,
});
assert(prodPlace.status === 2, "placement-authority recusa produção");

const isolatedAuth = runScript("scripts/v476-auth-identity.mjs", {
  LONGYU_STAGING_PROJECT_ID: "abcdefghijabcdefghij",
});
assert(isolatedAuth.status === 2, "auth-identity BLOCKED sem credenciais");

const isolatedSync = runScript("scripts/v476-sync-identity.mjs", {
  LONGYU_STAGING_PROJECT_ID: "abcdefghijabcdefghij",
});
assert(isolatedSync.status === 2, "sync-identity BLOCKED sem credenciais");
assert(/BLOCKED/.test(`${isolatedSync.stdout}\n${isolatedSync.stderr}`), "sync sem credenciais é BLOCKED");
assert(!/OK: v476-sync-identity/.test(`${isolatedSync.stdout}\n${isolatedSync.stderr}`), "sync não passa sem staging");

const identityBlocked = runScript(
  "scripts/v476-live-validation.mjs",
  {
    LONGYU_STAGING_PROJECT_ID: "abcdefghijabcdefghij",
    SUPABASE_ACCESS_TOKEN: "",
  },
  ["--identity"]
);
assert(identityBlocked.status === 2, "--identity sem healthy não cria usuários");

const report = read("docs/reports/v476-staging-live-validation.md");
assert(report.includes("LIVE_STAGING_VALIDATION"), "relatório separa live staging");
assert(report.includes("EPHEMERAL_BACKEND_VALIDATION"), "relatório aponta validação efêmera");
assert(report.includes("BLOCKED_REMOTE_STAGING"), "live remoto BLOCKED_REMOTE_STAGING");
assert(report.includes("MandarimProject"), "produção Longyu citada");
assert(report.includes("drjcfalvlbbeblmmyhwj"), "produção citada como HARD FAIL");
assert(!/STAGING_READY[^\n]*PASS/.test(report), "não inventa STAGING_READY PASS");
assert(!/AUTH_READY[^\n]*PASS/.test(report), "não inventa AUTH_READY PASS");
assert(!/READY_FOR_CLOSED_BETA_BR[^\n]*PASS/.test(report), "não marca closed beta");
assert(!/PHYSICAL_QA_READY[^\n]*PASS/.test(report), "não marca PHYSICAL_QA");
assert(!/PAYMENTS_READY[^\n]*PASS/.test(report), "não marca PAYMENTS");
assert(report.includes("REFUSING_TO_USE_PRODUCTION_AS_STAGING"), "token de guarda no relatório");
assert(report.includes("AUTH-013") || report.includes("e-mail real"), "e-mail real continua exigindo hosted");
assert(report.includes("FIXTURE"), "AUTH fixture ≠ e-mail real");
assert(report.includes("v476-placement-authority"), "harness Placement documentado");
assert(report.includes("OBS-027"), "OBS-027 teste de contrato documentado");
assert(!report.includes(["LONGYU_", "FOREIGN_PROJECTS"].join("")), "sem allowlist de outros produtos");
assert(!report.includes(["foreign", "ProductName"].join("")), "sem foreign product helper");
assert(!new RegExp(["REFUSING_FOREIGN_", "PRODUCT_AS_STAGING"].join("")).test(report), "sem token de produto estrangeiro");

const rehearsal = read("docs/reports/v476r-longyu-backend-rehearsal.md");
assert(rehearsal.includes("EPHEMERAL_DB_READY"), "scoreboard efêmero");
assert(rehearsal.includes("MIGRATION_CHAIN_READY"), "migration chain");
assert(rehearsal.includes("SCHEMA_READY"), "schema");
assert(rehearsal.includes("RLS_READY"), "rls");
assert(rehearsal.includes("RPC_READY"), "rpc");
assert(rehearsal.includes("EDGE_LOCAL_READY"), "edge local");
assert(rehearsal.includes("PRODUCTION_DELTA_KNOWN"), "production delta");
assert(!rehearsal.includes("STAGING_READY = PASS"), "efêmero não promove STAGING_READY");

const fromTable = parseJsonCell(`json_build_object\n[economy_columns] {"tables":["profiles"],"economy_columns":["pearl_ledger"]}`);
assert(fromTable?.tables?.[0] === "profiles", "parseJsonCell prefere objeto JSON, não o header [economy_columns]");
assert(fromTable?.economy_columns?.[0] === "pearl_ledger", "parseJsonCell lê economy_columns");
assert(parseJsonCell('{"ok":true}')?.ok === true, "parseJsonCell JSON limpo");
assert(
  jwtRole(
    `eyJhbGciOiJub25lIn0.${Buffer.from(JSON.stringify({ role: "service_role" })).toString("base64url")}.x`
  ) === "service_role",
  "jwtRole lê claim role"
);

const apiGrants = read("supabase/migrations/20260828013000_api_role_table_grants.sql");
assert(/grant all on table public\.user_progress to anon, authenticated, service_role/i.test(apiGrants), "ephemeral grants user_progress");
assert(/grant all on all tables in schema public to service_role/i.test(apiGrants), "ephemeral grants service_role em todas as tabelas");
assert(!/grant all on all tables in schema public to authenticated/i.test(apiGrants), "não reabre escrita authenticated em massa");
assert(/revoke insert, update, delete on table public\.user_economy from authenticated/i.test(apiGrants), "mantém economia sem write direto");

const applySrc = read("scripts/apply-staging-migrations.mjs");
assert(applySrc.includes("requireHealthyStagingStatus"), "migrate exige ACTIVE_HEALTHY");
assert(applySrc.includes("fetchSupabaseProject"), "migrate confirma o projeto remoto");
assert(applySrc.includes("requireRemoteRehearsalTarget"), "migrate exige alvo remoto explícito");
const deploySrc = read("scripts/deploy-staging-functions.mjs");
assert(deploySrc.includes("requireHealthyStagingStatus"), "deploy exige ACTIVE_HEALTHY");

const pkg = JSON.parse(read("package.json"));
assert(pkg.scripts["test:v476-live-validation"], "script test:v476-live-validation");
assert(pkg.scripts["v476:live"], "script v476:live");
assert(pkg.scripts["v476:placement-authority"], "script v476:placement-authority");
assert(pkg.scripts["v476:auth-identity"], "script v476:auth-identity");
assert(pkg.scripts["v476:sync-identity"], "script v476:sync-identity");
assert(pkg.scripts["rehearse:ephemeral"], "script rehearse:ephemeral");
assert(pkg.scripts["validate:beta"].includes("test:v476-live-validation"), "validate:beta inclui v476");
assert(pkg.scripts["validate:beta"].includes("test:backend-contract"), "validate:beta inclui V4.7.7 contract");
assert(pkg.scripts["validate:beta"].includes("test:ops-correlation-crypto"), "validate:beta inclui crypto");
assert(pkg.scripts["validate:beta"].includes("test:longyu-only-backend"), "validate:beta inclui longyu-only");

if (errors.length) {
  console.error("FAIL test:v476-live-validation:");
  for (const item of errors) console.error(`  - ${item}`);
  process.exit(1);
}

console.log("OK: test:v476-live-validation (Longyu-only; live remoto BLOCKED; efêmero separado)");
