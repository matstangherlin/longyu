import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { projectRoot } from "./lib/env-local.mjs";

const root = projectRoot();
const migrationName = fs
  .readdirSync(path.join(root, "supabase", "migrations"))
  .find((name) => name.endsWith("_harden_function_privileges.sql"));

const failures = [];
const assert = (condition, message) => {
  if (condition) console.log(`ok: ${message}`);
  else failures.push(message);
};

assert(Boolean(migrationName), "migration harden_function_privileges existe");

const migration = migrationName
  ? fs.readFileSync(path.join(root, "supabase", "migrations", migrationName), "utf8")
  : "";
const anonymousIngestionMigration = fs.readFileSync(
  path.join(
    root,
    "supabase",
    "migrations",
    "20260808081000_harden_anonymous_ingestion.sql"
  ),
  "utf8"
);
const seed = fs.readFileSync(path.join(root, "scripts", "seed-test-account.mjs"), "utf8");
const verify = fs.readFileSync(path.join(root, "scripts", "verify-test-account.mjs"), "utf8");
const adminUi = fs.readFileSync(path.join(root, "src", "lib", "feedback.ts"), "utf8");
const deployWorkflow = fs.readFileSync(
  path.join(root, ".github", "workflows", "apply-beta-feedback.yml"),
  "utf8"
);
const legacyBetaDeploy = fs.readFileSync(
  path.join(root, "scripts", "apply-beta-feedback-sql.mjs"),
  "utf8"
);
const testAccountSql = fs.readFileSync(
  path.join(root, "scripts", "apply-test-account-sql.mjs"),
  "utf8"
);
const migrationApi = fs.readFileSync(
  path.join(root, "scripts", "apply-migrations-api.mjs"),
  "utf8"
);
const migrationBundle = fs.readFileSync(
  path.join(root, "scripts", "apply-migrations-sql.mjs"),
  "utf8"
);

assert(
  /revoke execute on all functions in schema public from public, anon, authenticated;/i.test(
    migration
  ),
  "migration revoga funcoes existentes de PUBLIC/anon/authenticated"
);
assert(
  /alter default privileges in schema public\s+revoke execute on functions from public, anon, authenticated;/i.test(
    migration
  ),
  "migration fecha grants futuros por default"
);

const anonBlock = migration.split("-- Endpoints anonimos intencionais.")[1]?.split(
  "-- API autenticada do produto."
)[0] ?? "";
const authenticatedBlock = migration.split("-- API autenticada do produto.")[1] ?? "";

for (const fn of ["submit_beta_feedback", "submit_beta_pedagogy_event"]) {
  assert(anonBlock.includes(`public.${fn}(`), `${fn} permanece disponivel para anon`);
}
assert(
  anonBlock.includes("public.issue_beta_pedagogy_anon_session(") &&
    /revoke execute on function public\.issue_beta_pedagogy_anon_session\(text\)[\s\S]*?from public, anon, authenticated/i.test(
      anonymousIngestionMigration
    ),
  "issuer anon legado e explicitamente fechado pela migration atual"
);
assert(
  /grant execute on function public\.issue_beta_anon_ingestion_session\(text\) to service_role/i.test(
    anonymousIngestionMigration
  ),
  "issuer atual fica restrito a service_role"
);

for (const fn of [
  "get_server_entitlement",
  "get_server_economy",
  "get_public_profiles_by_ids",
  "sync_league_week",
  "get_league_standings",
  "update_beta_feedback_admin",
  "is_beta_admin",
  "ensure_own_profile",
]) {
  assert(
    authenticatedBlock.includes(`public.${fn}(`),
    `${fn} permanece disponivel para authenticated`
  );
}

for (const fn of [
  "_edge_get_turnstile_secret",
  "admin_cleanup_unconfirmed_signups",
  "run_signup_cleanup_job",
  "check_and_record_signup_rate",
  "apply_subscription_event",
  "economy_insert_ledger",
  "economy_ledger_exists",
  "_user_email_hash",
  "_referral_grant_reward",
]) {
  assert(!anonBlock.includes(`public.${fn}(`), `${fn} nao e reaberta para anon`);
  assert(
    !authenticatedBlock.includes(`public.${fn}(`),
    `${fn} nao e reaberta para authenticated`
  );
}

assert(
  migration.includes("p_user_id is distinct from auth.uid()"),
  "RPCs de liga rejeitam UUID de outro usuario"
);
assert(
  /delete from public\.beta_admins[\s\S]+teste@longyu\.app/i.test(migration),
  "migration remove a conta QA de beta_admins"
);
assert(
  !/teste@longyu\.app/.test(adminUi),
  "frontend nao apresenta painel admin para a conta QA"
);

for (const [label, source] of [
  ["seed", seed],
  ["verify", verify],
]) {
  assert(!source.includes("teste999"), `${label} nao contem a senha historica`);
  assert(source.includes("LONGYU_QA_EMAIL"), `${label} exige LONGYU_QA_EMAIL`);
  assert(source.includes("LONGYU_QA_PASSWORD"), `${label} exige LONGYU_QA_PASSWORD`);
}
assert(!seed.includes("Senha: ${TEST_PASSWORD}"), "seed nunca imprime a senha QA");

assert(!/^\s*pull_request\s*:/m.test(deployWorkflow), "workflow de producao nao roda em PR");
assert(/^\s*workflow_dispatch\s*:/m.test(deployWorkflow), "workflow permanece manual");
assert(/^\s*environment:\s*production\s*$/m.test(deployWorkflow), "workflow usa environment production");
assert(
  deployWorkflow.includes("npm run db:apply-api"),
  "workflow aplica apenas migrations pendentes pelo ledger"
);
assert(
  legacyBetaDeploy.includes('import("./apply-migrations-api.mjs")') &&
    !legacyBetaDeploy.includes("010_beta_feedback.sql"),
  "atalho legado nao reaplica migration historica"
);
assert(
  !testAccountSql.includes("supabase/migrations/"),
  "seed QA nao reaplica migrations historicas"
);
assert(
  migrationApi.includes("/^\\d+_.+\\.sql$/"),
  "aplicador inclui migrations com timestamp"
);
assert(
  migrationBundle.includes("readdirSync(migrationsDir)") &&
    !migrationBundle.includes('"010_beta_feedback.sql"'),
  "bundle SQL descobre todas as migrations sem lista obsoleta"
);

if (failures.length) {
  console.error("validate:security-boundaries FALHOU:");
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log("OK: fronteiras de seguranca preservadas e privilegiadas fechadas.");
