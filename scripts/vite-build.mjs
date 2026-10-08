import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { journeyFingerprint } from "./lib/report-meta.mjs";

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

// RC2.3.10 — provenance: o fingerprint curricular é calculado das MESMAS
// fontes que os gates hasheiam (scripts/lib/report-meta.mjs) e embutido no
// bundle e no version.json; o canal diz para onde o artefato foi feito.
if (!process.env.VITE_CURRICULUM_FINGERPRINT?.trim()) {
  process.env.VITE_CURRICULUM_FINGERPRINT = journeyFingerprint(root);
}
if (!process.env.VITE_BUILD_CHANNEL?.trim()) {
  // Netlify production context publica para o público; todo o resto é dev
  // até um workflow de release declarar o canal (android-release.yml).
  process.env.VITE_BUILD_CHANNEL = process.env.CONTEXT === "production" ? "production" : "dev";
}

// RC2.2.28 — dual SHA: source HEAD da PR ≠ merge sintético do workflow.
if (!process.env.VITE_SOURCE_HEAD_SHA?.trim()) {
  process.env.VITE_SOURCE_HEAD_SHA =
    process.env.GITHUB_EVENT_PULL_REQUEST_HEAD_SHA ||
    process.env.GITHUB_HEAD_SHA ||
    process.env.VITE_COMMIT_SHA ||
    "";
}
if (!process.env.VITE_WORKFLOW_SHA?.trim()) {
  process.env.VITE_WORKFLOW_SHA = process.env.GITHUB_SHA || process.env.VITE_COMMIT_SHA || "";
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
  // RC2.2.10B — mesma identidade canônica do Android (SHA é a autoridade;
  // builtAt é só informativo). Ver scripts/lib/release-identity.mjs.
  const commitSha = process.env.VITE_COMMIT_SHA || "";
  const sourceHeadSha = process.env.VITE_SOURCE_HEAD_SHA || commitSha;
  const workflowSha = process.env.VITE_WORKFLOW_SHA || process.env.GITHUB_SHA || commitSha;
  const branchName = spawnSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], { cwd: root, encoding: "utf8" });
  const identity = {
    schema: "longyu-build-identity/2",
    authority: "sha",
    commitSha,
    // RC2.2.28 — provenance dual (Part 25).
    sourceHeadSha,
    workflowSha,
    embeddedSourceHeadSha: sourceHeadSha,
    embeddedWorkflowSha: workflowSha,
    shortSha: /^[0-9a-f]{7,40}$/.test(commitSha) ? commitSha.slice(0, 7) : "",
    shortSourceHeadSha: /^[0-9a-f]{7,40}$/.test(sourceHeadSha) ? sourceHeadSha.slice(0, 7) : "",
    shortWorkflowSha: /^[0-9a-f]{7,40}$/.test(workflowSha) ? workflowSha.slice(0, 7) : "",
    branch: process.env.GITHUB_HEAD_REF || process.env.GITHUB_REF_NAME || process.env.BRANCH || (branchName.status === 0 ? branchName.stdout.trim() : ""),
    appVersion: process.env.VITE_APP_VERSION || "",
    curriculumFingerprint: process.env.VITE_CURRICULUM_FINGERPRINT || "",
    buildChannel: process.env.VITE_BUILD_CHANNEL || "",
    deviceQaBuild: process.env.VITE_DEVICE_QA === "true",
    testFixtures: process.env.VITE_USE_TEST_FIXTURES === "true",
    platform: "web",
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
