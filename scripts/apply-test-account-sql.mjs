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
  process.exit(1);
}

const files = [
  path.join(root, "supabase/migrations/006_economy_server.sql"),
  path.join(root, "supabase/migrations/007_internal_test_pro.sql"),
  path.join(root, "supabase/migrations/008_server_entitlement_rpc.sql"),
  path.join(root, "supabase/seed/test-account.sql"),
];

const sql = files.map((file) => readFileSync(file, "utf8")).join("\n\n");
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

console.log("OK: SQL da conta de teste + entitlement RPC aplicados.");
if (body && body !== "[]") console.log(body.slice(0, 500));
