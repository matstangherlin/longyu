import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { ensureEnvLocalFromExample, projectRoot } from "./lib/env-local.mjs";

const root = projectRoot();
const args = new Set(process.argv.slice(2));
const initEnv = args.has("--init-env");

function hasCli(binary) {
  if (process.platform === "win32") {
    const result = spawnSync("where.exe", [binary], { encoding: "utf8" });
    return result.status === 0;
  }
  const result = spawnSync("which", [binary], { encoding: "utf8" });
  return result.status === 0;
}

function isLinked() {
  return fs.existsSync(path.join(root, "supabase", ".temp", "project-ref"));
}

function section(title) {
  console.log(`\n${"─".repeat(60)}`);
  console.log(title);
  console.log("─".repeat(60));
}

function step(number, title, lines) {
  console.log(`\n${number}. ${title}`);
  for (const line of lines) console.log(`   ${line}`);
}

section("Longyu — setup Supabase + Stripe + Netlify");

if (initEnv) {
  const created = ensureEnvLocalFromExample();
  console.log(created ? "Criado .env.local a partir de .env.example." : ".env.local já existe ou .env.example ausente.");
}

step("A", "Criar projeto no Supabase", [
  "Abra https://supabase.com/dashboard e crie um projeto novo.",
  "Anote: Project URL, anon public key e service_role key (Settings → API).",
  "Anote também o project-ref (subdomínio da URL).",
]);

step("B", "Instalar Supabase CLI", [
  "Windows (scoop): scoop install supabase",
  "Ou: npm install -g supabase",
  "Docs: https://supabase.com/docs/guides/cli/getting-started",
  `Status local: ${hasCli("supabase") ? "CLI encontrada ✓" : "CLI NÃO encontrada — instale antes do deploy"}`,
]);

step("C", "Login e link do projeto", [
  "supabase login",
  "supabase link --project-ref <seu-project-ref>",
  "npm run configure:supabase-auth  # login imediato sem confirmar email",
  `Link local: ${isLinked() ? "projeto linkado ✓" : "ainda não linkado"}`,
]);

step("D", "Aplicar schema e publicar funções", [
  "Com access token em .env.local: npm run db:apply-api",
  "Ou: npm run deploy:backend -- --all (após supabase login + link)",
  "Dry-run: npm run deploy:backend -- --dry-run --all",
  "SQL manual: supabase/longyu_apply_all.sql no SQL Editor",
]);

step("E", "Secrets das Edge Functions", [
  "supabase secrets set \\",
  "  STRIPE_SECRET_KEY=sk_live_... \\",
  "  STRIPE_WEBHOOK_SECRET=whsec_... \\",
  "  STRIPE_PRICE_PRO_MONTHLY=price_... \\",
  "  SUPABASE_SERVICE_ROLE_KEY=<service_role>",
  "",
  "SUPABASE_URL e SUPABASE_ANON_KEY já existem no ambiente das functions.",
]);

step("F", "Stripe — produto e webhook", [
  "1. Crie produto/price recorrente (BRL) no Stripe Dashboard.",
  "2. Copie o price id para STRIPE_PRICE_PRO_MONTHLY.",
  "3. Developers → Webhooks → Add endpoint:",
  "   URL: https://<project-ref>.supabase.co/functions/v1/stripe-webhook",
  "4. Eventos:",
  "   - checkout.session.completed",
  "   - customer.subscription.updated",
  "   - customer.subscription.deleted",
  "   - invoice.paid",
  "   - invoice.payment_failed",
  "5. Copie o signing secret para STRIPE_WEBHOOK_SECRET.",
]);

step("G", "Desenvolvimento local (.env.local)", [
  "npm run setup:supabase -- --init-env",
  "Edite .env.local:",
  "  VITE_BACKEND_MODE=supabase",
  "  VITE_SUPABASE_URL=https://<project-ref>.supabase.co",
  "  VITE_SUPABASE_ANON_KEY=<anon-key>",
  "Teste: npm run dev → Conta → criar conta com email.",
]);

step("H", "Netlify (produção)", [
  "1. Conecte o repositório no Netlify.",
  "2. Build command: npm run build",
  "3. Publish directory: dist",
  "4. Environment variables (Site settings):",
  "     VITE_BACKEND_MODE=supabase",
  "     VITE_SUPABASE_URL=https://<project-ref>.supabase.co",
  "     VITE_SUPABASE_ANON_KEY=<anon-key>",
  "5. Após o deploy:",
  "     npm run configure:supabase-auth -- --add-prod-url https://<seu-site>.netlify.app",
  "6. Deploy → abra no celular (360px) e teste jornada + conta.",
]);

step("I", "Verificação automática", [
  "Com .env.local preenchido:",
  "  npm run verify:production",
  "Smoke manual:",
  "  - Criar conta → login → restaurar/sync progresso",
  "  - Exportar pacote LGPD",
  "  - Checkout Pro (modo teste Stripe) → entitlement no app",
]);

section("Comandos úteis");
console.log("  npm run setup:supabase -- --init-env");
console.log("  npm run deploy:backend -- --all");
console.log("  npm run verify:production");
console.log("  npm run ci");

console.log("\nPronto. Siga A → I na ordem. Use --init-env para criar .env.local.\n");
