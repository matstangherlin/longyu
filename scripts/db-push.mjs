import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { mergedEnv, projectRoot } from "./lib/env-local.mjs";

const root = projectRoot();
const env = mergedEnv();
const ref = env.SUPABASE_PROJECT_REF ?? "drjcfalvlbbeblmmyhwj";
const password = env.SUPABASE_DB_PASSWORD;
const accessToken = env.SUPABASE_ACCESS_TOKEN;

if (!password && !accessToken) {
  console.error("Defina SUPABASE_ACCESS_TOKEN ou SUPABASE_DB_PASSWORD para aplicar migrations.");
  console.error("");
  console.error("Opção A — access token (recomendado):");
  console.error("  https://supabase.com/dashboard/account/tokens → Generate new token");
  console.error('  .env.local: SUPABASE_ACCESS_TOKEN=sbp_...');
  console.error("  npm run db:apply-api");
  console.error("");
  console.error("Opção B — senha do banco:");
  console.error('  $env:SUPABASE_DB_PASSWORD="sua-senha"; npm run db:push');
  console.error("");
  console.error("Opção C — SQL Editor: abra supabase/longyu_apply_all.sql e clique Run.");
  process.exit(1);
}

const sqlFile = path.join(root, "supabase", "longyu_apply_all.sql");

function runSupabase(args) {
  return spawnSync("npx", ["supabase", ...args], {
    cwd: root,
    stdio: "inherit",
    shell: process.platform === "win32",
    env: { ...process.env, ...env, SUPABASE_ACCESS_TOKEN: accessToken ?? process.env.SUPABASE_ACCESS_TOKEN },
  });
}

if (accessToken) {
  if (accessToken) process.env.SUPABASE_ACCESS_TOKEN = accessToken;
  const link = runSupabase(["link", "--project-ref", ref, "--yes"]);
  if ((link.status ?? 1) !== 0) process.exit(link.status ?? 1);
  const query = runSupabase(["db", "query", "-f", sqlFile, "--linked", "--yes"]);
  process.exit(query.status ?? 1);
}

const host = `db.${ref}.supabase.co`;
const dbUrl = `postgresql://postgres:${encodeURIComponent(password)}@${host}:5432/postgres`;
const result = runSupabase(["db", "execute", "--db-url", dbUrl, "--file", sqlFile]);
process.exit(result.status ?? 1);
