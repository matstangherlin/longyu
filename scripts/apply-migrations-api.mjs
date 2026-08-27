/**
 * Aplica migrations via Management API.
 * PERIGO: o default de SUPABASE_PROJECT_REF é MandarimProject de produção.
 * Staging: use `npm run migrate:staging` (exige LONGYU_STAGING_PROJECT_ID e recusa produção).
 */
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { mergedEnv, projectRoot } from "./lib/env-local.mjs";
import { isProductionProjectId } from "./lib/staging-guard.mjs";

const root = projectRoot();
const env = mergedEnv();
const ref = env.SUPABASE_PROJECT_REF ?? "drjcfalvlbbeblmmyhwj";
const token = env.SUPABASE_ACCESS_TOKEN;

if (env.LONGYU_STAGING_ONLY === "true" && isProductionProjectId(ref)) {
  console.error("RECUSADO: db:apply-api com LONGYU_STAGING_ONLY não aponta para produção.");
  console.error("Use: npm run migrate:staging");
  process.exit(2);
}

if (!token) {
  console.error("SUPABASE_ACCESS_TOKEN ausente em .env.local");
  console.error("Gere em: https://supabase.com/dashboard/account/tokens");
  process.exit(1);
}

const migrationsDir = path.join(root, "supabase", "migrations");
const files = readdirSync(migrationsDir)
  .filter((f) => /^\d+_.+\.sql$/.test(f))
  .sort();

if (files.length === 0) {
  console.error("Nenhuma migration em supabase/migrations/");
  process.exit(1);
}

async function applyMigration(filename) {
  const sql = readFileSync(path.join(migrationsDir, filename), "utf8");
  const name = filename.replace(/\.sql$/, "");
  const url = `https://api.supabase.com/v1/projects/${ref}/database/migrations`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: sql, name }),
  });
  const body = await response.text();
  if (!response.ok) {
    const alreadyApplied =
      response.status === 400 &&
      (body.includes("already exists") || body.includes("duplicate key"));
    if (alreadyApplied) {
      console.log(`↷ ${filename} (já aplicada)`);
      return;
    }
    throw new Error(`${filename} → ${response.status}: ${body.slice(0, 1500)}`);
  }
  console.log(`✓ ${filename}`);
}

console.log(`Aplicando ${files.length} migrations em ${ref}…`);
for (const file of files) {
  await applyMigration(file);
}
console.log("Migrations aplicadas.");
