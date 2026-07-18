import { readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { mergedEnv, projectRoot } from "./lib/env-local.mjs";

const root = projectRoot();
const env = mergedEnv();
const ref = env.SUPABASE_PROJECT_REF ?? "drjcfalvlbbeblmmyhwj";
const token = env.SUPABASE_ACCESS_TOKEN;

if (!token) {
  console.error("SUPABASE_ACCESS_TOKEN ausente.");
  console.error("Defina em .env.local ou no secret do GitHub Actions.");
  process.exit(1);
}

const sqlPath = path.join(root, "supabase/migrations/010_beta_feedback.sql");
const sql = readFileSync(sqlPath, "utf8");
const url = `https://api.supabase.com/v1/projects/${ref}/database/query`;

console.log(`Aplicando 010_beta_feedback.sql em ${ref}…`);

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
  const already =
    response.status === 400 &&
    (body.includes("already exists") || body.includes("duplicate"));
  if (!already) {
    console.error(`Erro ${response.status}:`, body.slice(0, 2000));
    process.exit(1);
  }
  console.log("↷ migration já parcialmente aplicada — ok idempotente");
}

console.log("OK: beta_feedback + pedagogy events aplicados.");
if (body && body !== "[]" && body !== "{}") console.log(body.slice(0, 500));
