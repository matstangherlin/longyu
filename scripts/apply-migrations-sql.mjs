import fs from "node:fs";
import path from "node:path";
import { projectRoot } from "./lib/env-local.mjs";

const migrations = [
  "001_initial_schema.sql",
  "002_client_snapshot.sql",
  "003_profile_trigger.sql",
  "004_leagues.sql",
  "006_economy_server.sql",
  "007_internal_test_pro.sql",
  "008_server_entitlement_rpc.sql",
  "010_beta_feedback.sql",
  "014_subscription_event_ordering.sql",
];
const parts = migrations.map((file) => {
  const full = path.join(projectRoot(), "supabase", "migrations", file);
  return `-- ${file}\n${fs.readFileSync(full, "utf8")}`;
});

const combined = `${parts.join("\n\n")}\n`;

const out = path.join(projectRoot(), "supabase", "longyu_apply_all.sql");
fs.writeFileSync(out, combined, "utf8");
console.log(`OK: SQL combinado em ${out}`);
console.log("Cole no Supabase → SQL Editor → Run, ou use: npm run deploy:backend -- --db após supabase login");
