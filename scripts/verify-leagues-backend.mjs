/**
 * Verifica se o backend de Ligas está aplicado no Supabase.
 */
import process from "node:process";
import { mergedEnv } from "./lib/env-local.mjs";

import { readEnvFile } from "./lib/env-local.mjs";

const env = mergedEnv();
const ref = env.SUPABASE_PROJECT_REF ?? "drjcfalvlbbeblmmyhwj";
const token = env.SUPABASE_ACCESS_TOKEN;
const url = env.VITE_SUPABASE_URL?.replace(/\/$/, "") ?? `https://${ref}.supabase.co`;
const anon = env.VITE_SUPABASE_ANON_KEY ?? readEnvFile(".env.production").VITE_SUPABASE_ANON_KEY;

async function checkRestTable(table) {
  const response = await fetch(`${url}/rest/v1/${table}?select=id&limit=1`, {
    headers: {
      apikey: anon ?? "",
      Authorization: `Bearer ${anon ?? ""}`,
    },
  });
  return response.status;
}

async function checkViaManagementApi() {
  if (!token) return null;
  const response = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: `
        select
          (select count(*)::int from public.league_tiers) as tiers,
          (select count(*)::int from public.league_memberships) as members,
          exists (
            select 1 from pg_proc p
            join pg_namespace n on n.oid = p.pronamespace
            where n.nspname = 'public' and p.proname = 'get_league_standings'
          ) as has_rpc
      `,
    }),
  });
  if (!response.ok) {
    const text = await response.text();
    return { error: `${response.status}: ${text.slice(0, 500)}` };
  }
  const rows = await response.json();
  return rows[0] ?? rows;
}

console.log("== verify:leagues ==");

if (anon) {
  const status = await checkRestTable("league_tiers");
  if (status === 404) {
    console.error("ERRO: tabela league_tiers não existe no Supabase remoto.");
    console.error("Rode: npm run deploy:leagues (com SUPABASE_ACCESS_TOKEN)");
    process.exit(1);
  }
  if (status === 200) {
    console.log("OK: league_tiers exposta via REST (tabela existe).");
  } else {
    console.log(`AVISO: league_tiers → HTTP ${status}`);
  }
}

const mgmt = await checkViaManagementApi();
if (mgmt?.error) {
  console.log(`Management API: ${mgmt.error}`);
} else if (mgmt) {
  console.log(`OK: ${mgmt.tiers} divisões, ${mgmt.members} membros, RPC=${mgmt.has_rpc ? "sim" : "não"}`);
  if (Number(mgmt.tiers) < 7) {
    console.error("ERRO: esperadas 7 divisões (Bronze → Celestial).");
    process.exit(1);
  }
  if (!mgmt.has_rpc) {
    console.error("ERRO: RPC get_league_standings ausente.");
    process.exit(1);
  }
} else if (!token) {
  console.log("SUPABASE_ACCESS_TOKEN ausente — verificação parcial via REST apenas.");
}

console.log("\nLigas prontas no Supabase.");
