import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const viteEntry = path.join(root, "node_modules", "vite", "bin", "vite.js");
// The runner keeps the ESM Vite config in native mode. This avoids esbuild
// walking protected parent directories on the Windows desktop checkout.
const extraArgs = ["--configLoader", "runner", ...process.argv.slice(2)];

// Alinha VITE_APP_VERSION com package.json quando a env não foi definida no CI/Netlify.
if (!process.env.VITE_APP_VERSION?.trim()) {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
    if (pkg.version) process.env.VITE_APP_VERSION = String(pkg.version);
  } catch {
    /* ignore */
  }
}

if (!process.env.VITE_APP_ENV?.trim()) {
  // Build de produção local/CI sem contexto Netlify → Production Beta.
  process.env.VITE_APP_ENV = "production_beta";
}

// RC2.2 — candidate QA sem VITE_SITE_URL cairia no default de PRODUÇÃO
// (scripts/seo-prerender.mjs), publicando canonical/OG/sitemap apontando para o
// site principal a partir de um host de QA. Deriva da URL do próprio deploy.
if (!process.env.VITE_SITE_URL?.trim()) {
  const appEnv = String(process.env.VITE_APP_ENV ?? "").trim().toLowerCase().replace(/-/g, "_");
  const isCandidate = ["qa_candidate", "rc2_candidate", "candidate", "qa"].includes(appEnv);
  const deployUrl = String(process.env.DEPLOY_PRIME_URL || process.env.DEPLOY_URL || "").trim();
  if (isCandidate && deployUrl) process.env.VITE_SITE_URL = deployUrl;
}

if (!process.env.VITE_COMMIT_SHA?.trim()) {
  const git = spawnSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" });
  if (git.status === 0) process.env.VITE_COMMIT_SHA = git.stdout.trim();
}

const result = spawnSync(process.execPath, [viteEntry, "build", ...extraArgs], {
  cwd: root,
  stdio: "inherit",
  env: process.env,
});

if ((result.status ?? 1) !== 0) {
  process.exit(result.status ?? 1);
}

// Public deploy identity (no secrets): commitSha / env label / version.
try {
  const dist = path.join(root, "dist");
  fs.mkdirSync(dist, { recursive: true });
  const identity = {
    commitSha: process.env.VITE_COMMIT_SHA || "",
    appVersion: process.env.VITE_APP_VERSION || "",
    environment: process.env.VITE_APP_ENV || "",
    builtAt: new Date().toISOString(),
  };
  fs.writeFileSync(path.join(dist, "version.json"), `${JSON.stringify(identity, null, 2)}\n`);
} catch {
  /* non-fatal */
}

// Meta tags por rota pública + sitemap.xml no dist/.
const prerender = spawnSync(process.execPath, [path.join(root, "scripts", "seo-prerender.mjs")], {
  cwd: root,
  stdio: "inherit",
  env: process.env,
});

process.exit(prerender.status ?? 1);
