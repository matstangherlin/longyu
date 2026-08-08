import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { projectRoot } from "./lib/env-local.mjs";

const root = projectRoot();
const failures = [];
const assert = (condition, message) => {
  if (condition) console.log(`ok: ${message}`);
  else failures.push(message);
};

const migrationName = fs
  .readdirSync(path.join(root, "supabase", "migrations"))
  .find((name) => name.endsWith("_abuse_controls_ip_email_snapshot.sql"));
const migration = migrationName
  ? fs.readFileSync(path.join(root, "supabase", "migrations", migrationName), "utf8")
  : "";
const createAccount = fs.readFileSync(
  path.join(root, "supabase", "functions", "create-account", "index.ts"),
  "utf8"
);
const anonSession = fs.readFileSync(
  path.join(root, "supabase", "functions", "issue-anon-ingestion-session", "index.ts"),
  "utf8"
);
const securityYml = fs.readFileSync(
  path.join(root, ".github", "workflows", "security.yml"),
  "utf8"
);
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const lock = JSON.parse(fs.readFileSync(path.join(root, "package-lock.json"), "utf8"));

assert(Boolean(migrationName), "migration abuse_controls existe");
assert(/canonicalize_email/i.test(migration), "SQL canonicalize_email existe");
assert(
  /digest\(public\.canonicalize_email/i.test(migration),
  "_user_email_hash usa e-mail canônico"
);
assert(
  /revoke all on function public\.is_beta_admin\(\) from public, anon, authenticated/i.test(
    migration
  ),
  "is_beta_admin revoga anon explicitamente"
);
assert(/user_progress_client_snapshot_size/i.test(migration), "cap de tamanho no snapshot");
assert(/profiles_league_tier_allowed/i.test(migration), "league_tier com allowlist");

assert(
  !/headers\.get\(\s*["']cf-connecting-ip["']\s*\)/i.test(createAccount),
  "create-account não confia em cf-connecting-ip"
);
assert(
  !/headers\.get\(\s*["']cf-connecting-ip["']\s*\)/i.test(anonSession),
  "anon-ingestion não confia em cf-connecting-ip"
);
assert(/parts\.length - 1/i.test(createAccount), "create-account usa hop direito do XFF");
assert(/hops\.length - 1/i.test(anonSession), "anon-ingestion usa hop direito do XFF");
assert(/canonicalizeEmail/i.test(createAccount), "create-account canonicaliza e-mail");
assert(
  /TURNSTILE_ALLOW_SKIP/i.test(createAccount) &&
    /captcha_unavailable/i.test(createAccount),
  "Turnstile é fail-closed sem secret"
);
assert(
  !/Sem secret configurado: não bloqueia/i.test(createAccount),
  "não resta fail-open antigo do Turnstile"
);

assert(
  /audit-level=moderate/.test(securityYml) && !/audit-level=high/.test(securityYml),
  "CI npm audit usa moderate"
);

const routerVersion =
  lock.packages?.["node_modules/react-router"]?.version ??
  pkg.dependencies?.["react-router-dom"];
assert(
  typeof routerVersion === "string" &&
    (routerVersion.startsWith("7.18") || routerVersion.startsWith("^7.18")),
  `react-router >= 7.18 (atual: ${routerVersion})`
);

if (failures.length) {
  console.error("test:abuse-controls FALHOU:");
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log("OK: controles de abuso (IP, Turnstile, e-mail, snapshot, audit) no lugar.");
