/**
 * Garante que o bundle em dist/ não contém segredos óbvios.
 * Rode após `npm run build`.
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");

if (!fs.existsSync(dist)) {
  console.error("ERRO: dist/ não encontrado. Rode npm run build antes.");
  process.exit(1);
}

const patterns = [
  { name: "service_role JWT role", re: /"role"\s*:\s*"service_role"/i },
  { name: "service_role literal", re: /service_role[a-z0-9_-]{10,}/i },
  { name: "Stripe live secret", re: /sk_live_[A-Za-z0-9]{20,}/ },
  { name: "Stripe test secret", re: /sk_test_[A-Za-z0-9]{20,}/ },
  { name: "Stripe webhook secret", re: /whsec_[A-Za-z0-9]{20,}/ },
  { name: "Supabase service key marker", re: /SUPABASE_SERVICE_ROLE_KEY\s*[:=]\s*["']eyJ/i },
];

const errors = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
      continue;
    }
    if (!/\.(js|mjs|cjs|html|json|map)$/i.test(entry.name)) continue;
    // sourcemaps desligados no build; ainda assim varremos se existirem
    const text = fs.readFileSync(full, "utf8");
    for (const pattern of patterns) {
      if (pattern.re.test(text)) {
        errors.push(`${path.relative(root, full)}: possível ${pattern.name}`);
      }
    }
  }
}

walk(dist);

// Anon key JWT é pública por design — ok se aparecer.
// Bloqueamos só service_role / stripe secrets.

if (errors.length > 0) {
  console.error("ERRO: validate:frontend-secrets falhou.");
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}

console.log("OK: validate:frontend-secrets — nenhum segredo óbvio no dist/.");
