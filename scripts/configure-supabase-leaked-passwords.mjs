/**
 * Habilita a proteção Have I Been Pwned sem alterar URLs ou outras opções Auth.
 * A Supabase disponibiliza o recurso nos planos Pro e superiores.
 *
 * Uso:
 *   npm run configure:supabase-leaked-passwords -- --apply
 *
 * Requer SUPABASE_ACCESS_TOKEN e SUPABASE_PROJECT_REF explícitos.
 */
import process from "node:process";
import { mergedEnv } from "./lib/env-local.mjs";

const env = mergedEnv();
const token = String(env.SUPABASE_ACCESS_TOKEN ?? "");
const projectRef = String(env.SUPABASE_PROJECT_REF ?? "").trim();
const apply = process.argv.slice(2).includes("--apply");

if (!token || !projectRef) {
  console.error("SUPABASE_ACCESS_TOKEN e SUPABASE_PROJECT_REF explícitos são obrigatórios.");
  process.exit(2);
}

const endpoint = `https://api.supabase.com/v1/projects/${encodeURIComponent(projectRef)}/config/auth`;
const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
const currentResponse = await fetch(endpoint, { headers });
const currentText = await currentResponse.text();
if (!currentResponse.ok) {
  console.error(`Falha ao consultar Auth (${currentResponse.status}): ${currentText.slice(0, 500)}`);
  process.exit(1);
}

const current = JSON.parse(currentText);
if (current.password_hibp_enabled === true) {
  console.log(`Proteção contra senhas comprometidas já está ativa em ${projectRef}.`);
  process.exit(0);
}
if (!apply) {
  console.log(`Proteção ainda desativada em ${projectRef}.`);
  console.log("Rode novamente com --apply depois de confirmar que a organização usa plano Pro ou superior.");
  process.exit(2);
}

const response = await fetch(endpoint, {
  method: "PATCH",
  headers,
  body: JSON.stringify({ password_hibp_enabled: true }),
});
const responseText = await response.text();
if (!response.ok) {
  console.error(`Falha ao habilitar proteção (${response.status}): ${responseText.slice(0, 700)}`);
  process.exit(1);
}

const updated = JSON.parse(responseText);
if (updated.password_hibp_enabled !== true) {
  console.error("A API respondeu sem confirmar password_hibp_enabled=true.");
  process.exit(1);
}
console.log(`Proteção contra senhas comprometidas habilitada em ${projectRef}.`);
