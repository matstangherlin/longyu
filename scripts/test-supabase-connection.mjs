import { mergedEnv } from "./lib/env-local.mjs";

const env = mergedEnv();
const url = env.VITE_SUPABASE_URL?.replace(/\/$/, "");
const anon = env.VITE_SUPABASE_ANON_KEY;

if (!url || !anon) {
  console.error("VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY ausentes.");
  process.exit(1);
}

const checks = [
  ["REST /rest/v1/", `${url}/rest/v1/`],
  ["Auth settings", `${url}/auth/v1/settings`],
  ["Auth health", `${url}/auth/v1/health`],
];

console.log("== test:supabase-connection ==\n");

for (const [label, endpoint] of checks) {
  try {
    const response = await fetch(endpoint, {
      headers: {
        apikey: anon,
        Authorization: `Bearer ${anon}`,
      },
    });
    console.log(`${response.ok || response.status === 401 ? "OK" : "FAIL"}: ${label} → HTTP ${response.status}`);
  } catch (error) {
    console.log(`FAIL: ${label} → ${error instanceof Error ? error.message : error}`);
  }
}

const token = env.SUPABASE_ACCESS_TOKEN;
const ref = env.SUPABASE_PROJECT_REF ?? "drjcfalvlbbeblmmyhwj";

if (token) {
  const mgmt = await fetch(`https://api.supabase.com/v1/projects/${ref}/config/auth`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (mgmt.ok) {
    const auth = await mgmt.json();
    const redirects = auth.uri_allow_list ?? "";
    const prod = "lucky-croissant-eeed26.netlify.app";
    if (String(redirects).includes(prod)) {
      console.log(`Redirect Netlify (Management API): inclui ${prod} ✓`);
    } else {
      console.log(`Redirect Netlify: NÃO inclui ${prod}`);
    }
    console.log(`mailer_autoconfirm: ${auth.mailer_autoconfirm ? "true" : "false"}`);
  } else {
    console.log(`Management API auth config: HTTP ${mgmt.status}`);
  }
} else {
  console.log("SUPABASE_ACCESS_TOKEN ausente — não foi possível verificar redirects via Management API.");
}

console.log("\nSupabase está online. O site Netlify precisa das VITE_* no build (ver configure:netlify).");
