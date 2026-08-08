import fs from "node:fs";
import path from "node:path";
import { projectRoot } from "./lib/env-local.mjs";

const migrationsDir = path.join(projectRoot(), "supabase", "migrations");
const migrations = fs
  .readdirSync(migrationsDir)
  .filter((file) => /^\d+_.+\.sql$/.test(file))
  .sort();
const parts = migrations.map((file) => {
  const full = path.join(migrationsDir, file);
  return `-- ${file}\n${fs.readFileSync(full, "utf8")}`;
});

const combined = `${parts.join("\n\n")}\n`;

const out = path.join(projectRoot(), "supabase", "longyu_apply_all.sql");
fs.writeFileSync(out, combined, "utf8");
console.log(`OK: SQL combinado em ${out}`);
console.log("Cole no Supabase → SQL Editor → Run, ou use: npm run deploy:backend -- --db após supabase login");
