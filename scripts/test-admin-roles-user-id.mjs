import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { projectRoot } from "./lib/env-local.mjs";

const root = projectRoot();
const failures = [];
const assert = (condition, message) => {
  if (condition) console.log(`ok: ${message}`);
  else failures.push(message);
};

const migrationName = fs
  .readdirSync(path.join(root, "supabase", "migrations"))
  .find((name) => name.endsWith("_admin_roles_user_id.sql"));
const migration = migrationName
  ? fs.readFileSync(path.join(root, "supabase", "migrations", migrationName), "utf8")
  : "";
const feedback = fs.readFileSync(path.join(root, "src", "lib", "feedback.ts"), "utf8");
const entitlementRpc = migration;

assert(Boolean(migrationName), "migration admin_roles_user_id existe");
assert(
  /select exists \(\s*select 1 from public\.beta_admins a where a\.user_id = auth\.uid\(\)/i.test(
    migration
  ),
  "is_beta_admin consulta só beta_admins"
);
assert(
  !/matheus\.stangherlin@hotmail\.com/.test(
    migration.split("create or replace function public.is_beta_admin()")[1] ?? ""
  ),
  "is_beta_admin não usa allowlist de e-mail"
);
assert(
  /delete from public\.beta_admins[\s\S]+teste@longyu\.app/i.test(migration),
  "QA continua fora de beta_admins"
);
assert(
  !/v_email in \('teste@longyu\.app'\)/i.test(entitlementRpc),
  "get_server_entitlement/economy_user_is_pro sem short-circuit por e-mail QA"
);
assert(
  /internal_test_longyu_pro/i.test(migration),
  "Pro de QA continua via assinatura interna seedada"
);
assert(
  /VITE_ADMIN_EMAILS/.test(feedback) &&
    !feedback.includes("matheus.stangherlin@hotmail.com") &&
    !feedback.includes("admin@longyu.app"),
  "frontend não hardcoda e-mails admin; usa só VITE_ADMIN_EMAILS"
);

if (failures.length) {
  console.error("test:admin-roles-user-id FALHOU:");
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log("OK: papéis admin/Pro deixam de depender de e-mail hard-coded no servidor.");
