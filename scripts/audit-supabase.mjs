/**
 * Auditoria read-only do projeto Supabase via Management API.
 */
import { mergedEnv, readEnvFile } from "./lib/env-local.mjs";

const env = mergedEnv();
const ref = env.SUPABASE_PROJECT_REF ?? "drjcfalvlbbeblmmyhwj";
const token = env.SUPABASE_ACCESS_TOKEN;

if (!token) {
  console.error("SUPABASE_ACCESS_TOKEN ausente em .env.local");
  process.exit(1);
}

const headers = { Authorization: `Bearer ${token}` };

async function get(path) {
  const response = await fetch(`https://api.supabase.com/v1/projects/${ref}${path}`, { headers });
  const text = await response.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* ignore */
  }
  return { ok: response.ok, status: response.status, json, text };
}

console.log(`== audit:supabase (${ref}) ==\n`);

const project = await get("");
if (project.ok) {
  console.log(`Projeto: ${project.json?.name ?? ref}`);
  console.log(`Status: ${project.json?.status ?? "?"}`);
  console.log(`Região: ${project.json?.region ?? "?"}`);
} else {
  console.log(`Projeto: HTTP ${project.status}`);
}

const auth = await get("/config/auth");
if (auth.ok) {
  const redirects = auth.json?.uri_allow_list ?? "";
  const prod = "lucky-croissant-eeed26.netlify.app";
  console.log(`\nAuth:`);
  console.log(`  mailer_autoconfirm: ${auth.json?.mailer_autoconfirm}`);
  console.log(`  disable_signup: ${auth.json?.disable_signup}`);
  console.log(`  site_url: ${auth.json?.site_url}`);
  console.log(`  redirect Netlify: ${String(redirects).includes(prod) ? "OK" : "FALTA"}`);
} else {
  console.log(`\nAuth config: HTTP ${auth.status}`);
}

const functions = await get("/functions");
if (functions.ok && Array.isArray(functions.json)) {
  console.log(`\nEdge Functions (${functions.json.length}):`);
  for (const fn of functions.json) {
    console.log(`  - ${fn.slug ?? fn.name} (${fn.status ?? "?"})`);
  }
} else {
  console.log(`\nEdge Functions: HTTP ${functions.status}`);
}

const advisors = await get("/advisors/security");
if (advisors.ok && Array.isArray(advisors.json)) {
  const open = advisors.json.filter((a) => !a.resolution);
  console.log(`\nSecurity advisors abertos: ${open.length}`);
  for (const item of open.slice(0, 5)) {
    console.log(`  - [${item.level}] ${item.title ?? item.name}`);
  }
} else {
  console.log(`\nSecurity advisors: HTTP ${advisors.status}`);
}

const prodEnv = readEnvFile(".env.production");
const anon = prodEnv.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY || "";
console.log(`\nAnon key em .env.production: ${anon.length} chars (${anon.split(".").length} partes JWT)`);
