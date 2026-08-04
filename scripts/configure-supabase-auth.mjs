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

function readAllFlags(name) {
  const values = [];
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg.startsWith(`${name}=`)) {
      values.push(arg.slice(name.length + 1));
      continue;
    }
    if (arg === name && args[i + 1]) {
      values.push(args[i + 1]);
      i += 1;
    }
  }
  return values;
}

function normalizeUrl(raw) {
  if (!raw) return undefined;
  const trimmed = raw.trim().replace(/\/$/, "");
  if (!trimmed) return undefined;
  if (!/^https?:\/\//i.test(trimmed)) return `https://${trimmed}`;
  return trimmed;
}

const extraUrls = [
  ...readAllFlags("--add-prod-url"),
  env.LONGYU_PROD_URL,
  env.NETLIFY_SITE_URL,
  env.URL,
]
  .map(normalizeUrl)
  .filter(Boolean);

const siteUrl =
  normalizeUrl(readFlag("--site-url")) ??
  extraUrls[0] ??
  "http://localhost:5173";

const redirectEntries = new Set([
  "http://localhost:5173/**",
  "http://127.0.0.1:5173/**",
  "http://localhost:4173/**",
  "http://127.0.0.1:4173/**",
  "https://longyu.com.br/**",
  "https://www.longyu.com.br/**",
  "https://longyu.netlify.app/**",
  "https://singular-meringue-7838cd.netlify.app/**",
  `${siteUrl}/**`,
]);
for (const url of extraUrls) {
  redirectEntries.add(`${url}/**`);
}

if (!token) {
  console.error("SUPABASE_ACCESS_TOKEN ausente em .env.local");
  process.exit(1);
}

const body = {
  site_url: siteUrl,
  uri_allow_list: [...redirectEntries].join(","),
  // Confirmação de email obrigatória (requerida pelo programa de indicação).
  mailer_autoconfirm: false,
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

console.log("Auth configurado com confirmação de email obrigatória.");
console.log("mailer_autoconfirm: false");
console.log("site_url:", body.site_url);
console.log("redirects:", body.uri_allow_list);
console.log("Redirect de confirmação no app: /confirmar-email");
