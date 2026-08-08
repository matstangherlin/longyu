import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { projectRoot } from "./lib/env-local.mjs";

const root = projectRoot();
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");
const failures = [];
const assert = (condition, message) => {
  if (condition) console.log(`ok: ${message}`);
  else failures.push(message);
};

const migrationName = fs
  .readdirSync(path.join(root, "supabase", "migrations"))
  .find((name) => name.endsWith("_erase_account_personal_data.sql"));
const migration = migrationName ? read("supabase", "migrations", migrationName) : "";
const shared = read("supabase", "functions", "_shared", "accountDeletion.ts");
const edge = read("supabase", "functions", "delete-account", "index.ts");
const webhook = read("supabase", "functions", "stripe-webhook", "index.ts");
const privacy = read("src", "services", "privacyService.ts");
const auth = read("src", "services", "authService.ts");
const accountPage = read("src", "features", "account", "AccountPage.tsx");
const settingsPage = read("src", "features", "settings", "SettingsPage.tsx");

assert(Boolean(migrationName), "migration de apagamento pessoal existe");
assert(
  /ACCOUNT_DELETION_CONFIRMATION_TEXT\s*=\s*"EXCLUIR CONTA"/.test(shared),
  "frase de confirmação está centralizada"
);
assert(
  /return \{ confirmationText: ACCOUNT_DELETION_CONFIRMATION_TEXT \}/.test(shared),
  "payload compartilhado usa confirmationText"
);
assert(!/\bconfirm\s*:\s*true\b/.test(`${privacy}\n${auth}`), "clientes não usam contrato antigo");
assert(
  privacy.includes('functions.invoke<AccountDeletionResponse>("delete-account"') &&
    privacy.includes("accountDeletionRequestBody(confirmationText)"),
  "privacyService valida e envia o contrato compartilhado"
);
assert(
  auth.includes("requestAccountDeletion(confirmationText)") &&
    !auth.includes('functions.invoke("delete-account"'),
  "authService delega ao único cliente de exclusão"
);
for (const [label, source] of [
  ["conta", accountPage],
  ["ajustes", settingsPage],
]) {
  assert(source.includes("window.prompt("), `${label} exige confirmação digitada`);
  assert(source.includes("ACCOUNT_DELETION_CONFIRMATION_TEXT"), `${label} usa a frase compartilhada`);
}

assert(edge.includes('../_shared/accountDeletion.ts'), "Edge Function usa o contrato compartilhado");
assert(
  /admin\.auth\.admin\.deleteUser\(user\.id, false\)/.test(edge),
  "Edge Function executa hard delete explícito"
);
assert(!/admin\.from\([\s\S]*?\.delete\(\)/.test(edge), "Edge Function não faz limpeza parcial avulsa");

assert(
  /before delete on auth\.users/i.test(migration) &&
    /execute function public\.erase_account_personal_data_before_auth_delete\(\)/i.test(migration),
  "limpeza participa da transação de auth.users"
);
for (const table of ["beta_feedback", "beta_pedagogy_events", "referral_email_blocks"]) {
  assert(new RegExp(`delete from public\\.${table}`, "i").test(migration), `migration apaga ${table}`);
}
for (const column of [
  "user_id",
  "stripe_checkout_session_id",
  "stripe_payment_intent_id",
  "stripe_invoice_id",
  "stripe_subscription_id",
]) {
  assert(new RegExp(`${column}\\s*=\\s*null`, "i").test(migration), `ledger remove ${column}`);
}
assert(
  migration.includes('"retentionPurpose":"billing_reconciliation"'),
  "ledger documenta retenção financeira mínima"
);
assert(
  /revoke all on function public\.erase_account_personal_data_before_auth_delete\(\) from public/i.test(migration),
  "função de trigger não é endpoint público"
);

assert(
  !/metadata:\s*(session|invoice)\s+as unknown/i.test(webhook),
  "webhook não persiste objetos Stripe completos"
);
for (const safeField of ["payment_status", "billing_reason", "attempt_count", "paid"]) {
  assert(webhook.includes(safeField), `webhook mantém somente campo mínimo ${safeField}`);
}
assert(
  webhook.includes('throw new Error("transaction_persist_failed")'),
  "falha ao gravar ledger faz o webhook falhar e ser repetido"
);

if (failures.length) {
  console.error("validate:account-deletion-security FALHOU:");
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log("OK: exclusão de conta é confirmada, transacional e minimiza dados retidos.");
