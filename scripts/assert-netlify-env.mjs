import process from "node:process";

const onNetlify = process.env.NETLIFY === "true" || Boolean(process.env.NETLIFY_DEV);
const isProduction = process.env.CONTEXT === "production" || process.env.NODE_ENV === "production";

if (!onNetlify || !isProduction) {
  process.exit(0);
}

const required = ["VITE_BACKEND_MODE", "VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY"];
const missing = required.filter((key) => !process.env[key]?.trim());

if (missing.length > 0) {
  console.error("\nERRO: deploy Netlify sem backend Supabase configurado.\n");
  console.error("Defina no painel Netlify → Site settings → Environment variables:");
  for (const key of required) {
    console.error(`  - ${key}`);
  }
  console.error("\nValores em .env.example / docs/DEPLOY_CHECKLIST.md");
  console.error("Depois: Deploys → Trigger deploy → Clear cache and deploy.\n");
  process.exit(1);
}

if (process.env.VITE_BACKEND_MODE !== "supabase") {
  console.error('ERRO: VITE_BACKEND_MODE deve ser "supabase" em produção.');
  process.exit(1);
}

const anonKey = process.env.VITE_SUPABASE_ANON_KEY?.trim() ?? "";
const jwtParts = anonKey.split(".");
if (jwtParts.length !== 3 || anonKey.length < 200) {
  console.error("ERRO: VITE_SUPABASE_ANON_KEY parece truncada ou inválida.");
  console.error("Rode: npm run sync:supabase-key (com SUPABASE_ACCESS_TOKEN em .env.local)");
  process.exit(1);
}

console.log("OK: variáveis VITE_* do Supabase presentes no build Netlify.");
