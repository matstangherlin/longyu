/**
 * Setup completo da conta QA: SQL (se token disponível) + seed + verificação.
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { mergedEnv, projectRoot } from "./lib/env-local.mjs";

const root = projectRoot();
const env = mergedEnv();
const hasToken = Boolean(env.SUPABASE_ACCESS_TOKEN || env.SUPABASE_SERVICE_ROLE_KEY);

function run(label, script) {
  console.log(`\n== ${label} ==`);
  const result = spawnSync(process.execPath, [path.join(root, "scripts", script)], {
    cwd: root,
    stdio: "inherit",
    env: process.env,
  });
  if ((result.status ?? 1) !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log("== setup:test-account ==");

if (hasToken) {
  run("SQL Pro + RPCs", "apply-test-account-sql.mjs");
} else {
  console.log("\nSem SUPABASE_ACCESS_TOKEN — pulando SQL automático.");
  console.log("Opções:");
  console.log("  A) npm run browser:apply:test-account-sql  (login no VNC)");
  console.log("  B) Cole supabase/seed/test-account.sql no SQL Editor");
  console.log("  C) Defina SUPABASE_ACCESS_TOKEN e rode de novo");
}

run("Seed progresso", "seed-test-account.mjs");

if (hasToken) {
  run("Verificação", "verify-test-account.mjs");
} else {
  console.log("\nPule verificação completa até aplicar o SQL no Supabase.");
}

console.log("\nSetup concluído.");
