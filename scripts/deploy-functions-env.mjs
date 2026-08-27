import { spawnSync } from "node:child_process";
import process from "node:process";
import { mergedEnv, projectRoot } from "./lib/env-local.mjs";
import { LONGYU_EDGE_FUNCTIONS } from "./lib/edge-functions.mjs";
import { isProductionProjectId } from "./lib/staging-guard.mjs";

const root = projectRoot();
const env = mergedEnv();

function run(cmd, args) {
  const result = spawnSync(cmd, args, {
    cwd: root,
    stdio: "inherit",
    shell: process.platform === "win32",
    env: { ...process.env, ...env },
  });
  return result.status ?? 1;
}

const token = env.SUPABASE_ACCESS_TOKEN;
const ref = env.SUPABASE_PROJECT_REF ?? "drjcfalvlbbeblmmyhwj";

if (!token) {
  console.error("SUPABASE_ACCESS_TOKEN ausente em .env.local");
  process.exit(1);
}

if (env.LONGYU_STAGING_ONLY === "true" && isProductionProjectId(ref)) {
  console.error("RECUSADO: deploy:functions com LONGYU_STAGING_ONLY não aponta para produção.");
  console.error("Use: npm run deploy:staging-functions");
  process.exit(2);
}

if (run("npx", ["supabase", "login", "--token", token]) !== 0) process.exit(1);
if (run("npx", ["supabase", "link", "--project-ref", ref, "--yes"]) !== 0) process.exit(1);

if (run("npx", ["supabase", "functions", "deploy", ...LONGYU_EDGE_FUNCTIONS]) !== 0) process.exit(1);
