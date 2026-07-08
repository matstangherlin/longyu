import { mergedEnv } from "./lib/env-local.mjs";

const env = mergedEnv();
const ref = env.SUPABASE_PROJECT_REF ?? "drjcfalvlbbeblmmyhwj";
const token = env.SUPABASE_ACCESS_TOKEN;

const args = process.argv.slice(2);

function readFlag(name) {
  const withEq = args.find((arg) => arg.startsWith(`${name}=`));
  if (withEq) return withEq.slice(name.length + 1);
  const index = args.indexOf(name);
  if (index >= 0 && args[index + 1]) return args[index + 1];
  return undefined;
}

function normalizeUrl(raw) {
  if (!raw) return undefined;
  const trimmed = raw.trim().replace(/\/$/, "");
  if (!/^https?:\/\//i.test(trimmed)) return `https://${trimmed}`;
  return trimmed;
}

const addProdUrl = normalizeUrl(
  readFlag("--add-prod-url") ?? env.LONGYU_PROD_URL ?? env.NETLIFY_SITE_URL ?? env.URL
);
const siteUrl = normalizeUrl(readFlag("--site-url") ?? (addProdUrl && args.includes("--prod") ? addProdUrl : undefined)) ?? "http://localhost:5173";

const redirectEntries = [
  "http://localhost:5173/**",
  "http://127.0.0.1:5173/**",
  "http://localhost:4173/**",
  "http://127.0.0.1:4173/**",
];
if (addProdUrl) redirectEntries.push(`${addProdUrl}/**`);

if (!token) {
  console.error("SUPABASE_ACCESS_TOKEN ausente em .env.local");
  process.exit(1);
}

const body = {
  site_url: siteUrl,
  uri_allow_list: redirectEntries.join(","),
  mailer_autoconfirm: true,
  disable_signup: false,
};

const response = await fetch(`https://api.supabase.com/v1/projects/${ref}/config/auth`, {
  method: "PATCH",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify(body),
});

const text = await response.text();
if (!response.ok) {
  console.error(`Erro ${response.status}:`, text.slice(0, 1500));
  process.exit(1);
}

console.log("Auth configurado para contas imediatas (sem confirmação de email).");
console.log("site_url:", body.site_url);
console.log("redirects:", body.uri_allow_list);
if (addProdUrl) {
  console.log("\nProdução incluída nos redirects:", addProdUrl);
} else {
  console.log("\nDica: após deploy no Netlify, rode:");
  console.log("  npm run configure:supabase-auth -- --add-prod-url https://seu-site.netlify.app");
}
