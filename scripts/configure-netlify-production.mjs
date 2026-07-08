import process from "node:process";
import { mergedEnv } from "./lib/env-local.mjs";

const env = mergedEnv();
const token = env.NETLIFY_AUTH_TOKEN;
const siteId = env.NETLIFY_SITE_ID;
const siteName = env.NETLIFY_SITE_NAME ?? "singular-meringue-7838cd";

const viteVars = {
  VITE_BACKEND_MODE: env.VITE_BACKEND_MODE ?? "supabase",
  VITE_SUPABASE_URL: env.VITE_SUPABASE_URL,
  VITE_SUPABASE_ANON_KEY: env.VITE_SUPABASE_ANON_KEY,
};

const missing = Object.entries(viteVars)
  .filter(([, value]) => !value?.trim())
  .map(([key]) => key);

if (missing.length > 0) {
  console.error("Faltam variáveis em .env.local:", missing.join(", "));
  console.error("Preencha VITE_BACKEND_MODE, VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.");
  process.exit(1);
}

if (!token) {
  console.log("NETLIFY_AUTH_TOKEN não encontrado. Configure manualmente no painel:\n");
  console.log("Netlify → Site settings → Environment variables → Add variable\n");
  for (const [key, value] of Object.entries(viteVars)) {
    const preview = key.includes("KEY") ? `${value.slice(0, 12)}…` : value;
    console.log(`  ${key}=${preview}`);
  }
  console.log("\nDepois: Deploys → Trigger deploy → Clear cache and deploy site.");
  console.log("Auth Supabase: npm run configure:supabase-auth -- --add-prod-url https://SEU-SITE.netlify.app");
  process.exit(0);
}

async function api(path, options = {}) {
  const response = await fetch(`https://api.netlify.com/api/v1${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`${response.status} ${path}: ${text.slice(0, 800)}`);
  }
  return text ? JSON.parse(text) : null;
}

async function resolveSiteId() {
  if (siteId) return siteId;
  const sites = await api(`/sites?filter=all&name=${encodeURIComponent(siteName)}`);
  const site = Array.isArray(sites) ? sites.find((item) => item.name === siteName || item.ssl_url?.includes(siteName)) : null;
  if (!site?.id) throw new Error(`Site Netlify "${siteName}" não encontrado. Defina NETLIFY_SITE_ID em .env.local.`);
  return site.id;
}

async function setSiteEnv(id, key, value) {
  await api(`/sites/${id}/env/${encodeURIComponent(key)}`, {
    method: "PUT",
    body: JSON.stringify({
      key,
      values: [{ value, context: "all" }],
    }),
  });
}

async function triggerBuild(id) {
  await api(`/sites/${id}/builds`, {
    method: "POST",
    body: JSON.stringify({ clear_cache: true }),
  });
}

try {
  const id = await resolveSiteId();
  console.log(`Configurando variáveis no site ${siteName} (${id})…`);
  for (const [key, value] of Object.entries(viteVars)) {
    await setSiteEnv(id, key, value);
    console.log(`  OK ${key}`);
  }
  console.log("\nDisparando rebuild com cache limpo…");
  await triggerBuild(id);
  console.log("Build iniciado. Aguarde 1–2 min e abra o site de novo.");
  console.log("\nAuth Supabase (redirects):");
  console.log("  npm run configure:supabase-auth -- --add-prod-url https://singular-meringue-7838cd.netlify.app");
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
