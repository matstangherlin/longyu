#!/usr/bin/env node
/** validate:rc2-3-8-auth-identity — RC2.3.8 auth & identity gate on real sources. */
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { loadAuthRuntime, runAuthGate } from "./lib/auth-identity-gates.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const rt = loadAuthRuntime(root);
const failures = runAuthGate(rt);
if (failures.length) {
  console.error("FAIL validate:rc2-3-8-auth-identity");
  for (const f of failures) console.error(`  - ${f.code} ${f.subject}: ${f.message}`);
  process.exit(1);
}
console.log(`PASS validate:rc2-3-8-auth-identity — ${rt.AUTH_PROVIDERS.length} métodos · PKCE · allowlist · claim idempotente · isolamento por conta · ${Object.keys(rt.shipped).length} arquivos distribuídos sem segredo`);
