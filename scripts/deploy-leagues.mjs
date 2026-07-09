/**
 * Aplica a migration 004 (Ligas) no Supabase remoto.
 * Requer SUPABASE_ACCESS_TOKEN em .env.local ou variável de ambiente.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { mergedEnv, projectRoot } from "./lib/env-local.mjs";

const root = projectRoot();
const env = mergedEnv();
const ref = env.SUPABASE_PROJECT_REF ?? "drjcfalvlbbeblmmyhwj";
const token = env.SUPABASE_ACCESS_TOKEN;
const sqlFile = path.join(root, "supabase", "migrations", "004_leagues.sql");

if (!token) {
  console.error("SUPABASE_ACCESS_TOKEN ausente.");
  console.error("");
  console.error("1. Gere em https://supabase.com/dashboard/account/tokens");
  console.error("2. Exporte: export SUPABASE_ACCESS_TOKEN=sbp_...");
  console.error("3. Rode: npm run deploy:leagues");
  console.error("");
  console.error("Alternativa: cole supabase/migrations/004_leagues.sql no SQL Editor do Supabase.");
  process.exit(1);
}

const sql = readFileSync(sqlFile, "utf8");
const migrationUrl = `https://api.supabase.com/v1/projects/${ref}/database/migrations`;
const queryUrl = `https://api.supabase.com/v1/projects/${ref}/database/query`;

console.log(`Aplicando Ligas em ${ref}…`);

async function applyViaMigrations() {
  const response = await fetch(migrationUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: sql, name: "004_leagues" }),
  });
  const body = await response.text();
  if (response.ok) return { ok: true, body };
  const alreadyApplied =
    response.status === 400 &&
    (body.includes("already exists") || body.includes("duplicate key"));
  if (alreadyApplied) return { ok: true, body: "already applied" };
  return { ok: false, status: response.status, body };
}

async function applyViaQuery() {
  const response = await fetch(queryUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: sql }),
  });
  const body = await response.text();
  return { ok: response.ok, status: response.status, body };
}

const viaMigration = await applyViaMigrations();
if (!viaMigration.ok) {
  console.log(`Migrations API falhou (${viaMigration.status}), tentando database/query…`);
  const viaQuery = await applyViaQuery();
  if (!viaQuery.ok) {
    console.error(`Erro ${viaQuery.status}:`, viaQuery.body.slice(0, 3000));
    process.exit(1);
  }
}

console.log("OK: migration 004_leagues aplicada.");
console.log("Verifique: npm run verify:leagues");
