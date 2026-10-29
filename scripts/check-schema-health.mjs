#!/usr/bin/env node
/**
 * Somente leitura. Recusa POST/PATCH/DELETE e service_role.
 *   SUPABASE_URL=… SUPABASE_ANON_KEY=… npm run check:schema-health
 *   npm run check:schema-health -- --json
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { formatTable, runSchemaHealth } from "./lib/schema-health.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "scripts/lib/expected-schema.json"), "utf8"));
const json = process.argv.includes("--json");
const baseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

try {
  const result = await runSchemaHealth({
    baseUrl,
    anonKey,
    manifest,
    fetchImpl: globalThis.fetch,
  });
  if (json) console.log(JSON.stringify(result, null, 2));
  else console.log(formatTable(result));
  process.exit(result.ok ? 0 : 1);
} catch (error) {
  console.error(error instanceof Error ? error.message : "schema-health falhou");
  process.exit(1);
}
