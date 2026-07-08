import { readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { mergedEnv, projectRoot } from "./lib/env-local.mjs";

const root = projectRoot();
const env = mergedEnv();
const ref = env.SUPABASE_PROJECT_REF ?? "drjcfalvlbbeblmmyhwj";
const token = env.SUPABASE_ACCESS_TOKEN;
const fileArg = process.argv[2] ?? path.join(root, "supabase", "longyu_apply_all.sql");

if (!token) {
  console.error("SUPABASE_ACCESS_TOKEN ausente.");
  console.error("");
  console.error("1. Abra https://supabase.com/dashboard/account/tokens");
  console.error("2. Generate new token → copie o valor sbp_...");
  console.error("3. Adicione em .env.local: SUPABASE_ACCESS_TOKEN=sbp_...");
  console.error("4. Rode: npm run db:apply-api");
  process.exit(1);
}

const sql = readFileSync(fileArg, "utf8");
const url = `https://api.supabase.com/v1/projects/${ref}/database/query`;

const response = await fetch(url, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ query: sql }),
});

const body = await response.text();
if (!response.ok) {
  console.error(`Erro ${response.status}:`, body.slice(0, 2000));
  process.exit(1);
}

console.log("SQL aplicado com sucesso.");
if (body && body !== "[]" && body !== "{}") console.log(body.slice(0, 500));
