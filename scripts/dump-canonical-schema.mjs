/**
 * Dump canonical public schema from a running ephemeral stack.
 * Does not apply anything to MandarimProject.
 */
import fs from "node:fs";
import path from "node:path";
import { projectRoot } from "./lib/env-local.mjs";
import { loadEphemeralEnv, parseJsonCell, querySql } from "./lib/ephemeral-backend.mjs";
import { CANONICAL_SCHEMA_SQL, hashCanonicalSchema } from "./lib/schema-canonical.mjs";

const root = projectRoot();
const env = loadEphemeralEnv(root);
const payload = parseJsonCell(querySql(env, CANONICAL_SCHEMA_SQL));
if (!payload) {
  console.error("FAIL: canonical schema dump empty");
  process.exit(1);
}
const hash = hashCanonicalSchema(payload);
const outDir = path.join(root, "supabase/baseline");
fs.mkdirSync(outDir, { recursive: true });
const dump = { remessa: "V4.7.7", hash, payload };
fs.writeFileSync(path.join(outDir, "canonical-schema.json"), `${JSON.stringify(dump, null, 2)}\n`);
fs.writeFileSync(path.join(outDir, "LONGYU_BACKEND_SCHEMA_HASH"), `${hash}\n`);
console.log(`OK: LONGYU_BACKEND_SCHEMA_HASH=${hash}`);
console.log("wrote supabase/baseline/canonical-schema.json");
