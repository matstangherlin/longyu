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

const requiredRedirects = [
  "http://localhost:5173/**",
  "http://127.0.0.1:5173/**",
  "http://localhost:4173/**",
  "http://127.0.0.1:4173/**",
  "https://longyu.com.br/**",
  "https://www.longyu.com.br/**",
  "https://longyu.netlify.app/**",
  "https://singular-meringue-7838cd.netlify.app/**",
  "https://singular-meringue-7838cd.netlify.app/auth/callback",
  "longyu.noba.com://auth/callback",
  `${siteUrl}/**`,
  ...extraUrls.map((url) => `${url}/**`),
];

if (!token) {
  console.error("SUPABASE_ACCESS_TOKEN ausente em .env.local");
  process.exit(1);
}

if (!args.includes("--confirm-merge")) {
  console.error("REFUSING_REPLACE_ALL: passe --confirm-merge. O script lê a allowlist atual e só adiciona o que falta.");
  process.exit(6);
}

const currentResponse = await fetch(`https://api.supabase.com/v1/projects/${ref}/config/auth`, {
  headers: { Authorization: `Bearer ${token}` },
});
const currentText = await currentResponse.text();
if (!currentResponse.ok) {
  console.error(`READ_FAILED ${currentResponse.status}:`, currentText.slice(0, 500));
  process.exit(1);
}
const current = JSON.parse(currentText);
const existing = String(current.uri_allow_list ?? "")
  .split(",")
  .map((entry) => entry.trim())
  .filter(Boolean);
const redirectEntries = new Set([...existing, ...requiredRedirects]);
const merged = [...redirectEntries];
const added = merged.filter((entry) => !existing.includes(entry));

const body = {
  site_url: current.site_url || siteUrl,
  uri_allow_list: merged.join(","),
  mailer_autoconfirm: false,
  disable_signup: current.disable_signup ?? false,
};

console.log("preserved:", existing.length, "added:", added.join(" | ") || "(none)");

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
