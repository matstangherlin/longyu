import fs from "node:fs";
import path from "node:path";
import { projectRoot } from "./lib/env-local.mjs";
import { buildMigrationManifest, edgeSourceCatalog } from "./lib/schema-canonical.mjs";
import { V477_CRITICAL_RPCS, V477_GRANT_MATRIX, V477_ANON_TABLE_JUSTIFICATION } from "./lib/v477-constants.mjs";

const root = projectRoot();
const backendDir = path.join(root, "docs/backend");
fs.mkdirSync(backendDir, { recursive: true });

const manifest = buildMigrationManifest(root);
fs.writeFileSync(path.join(backendDir, "migration-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);

const rpcContract = {
  remessa: "V4.7.7",
  note: "CI fails if a listed RPC signature drifts without updating this file in the same PR.",
  rpcs: V477_CRITICAL_RPCS,
};
fs.writeFileSync(path.join(backendDir, "rpc-contract.json"), `${JSON.stringify(rpcContract, null, 2)}\n`);

const edge = {
  remessa: "V4.7.7",
  note: "source_sha256 covers files under supabase/functions/<slug>. Compare with MandarimProject version numbers plus this hash.",
  functions: edgeSourceCatalog(root).map((row) => ({
    ...row,
    request_schema: "see index.ts",
    response_schema: "see index.ts",
    required_secrets: row.slug.includes("stripe")
      ? ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"]
      : row.slug === "create-account" || row.slug === "submit-business-lead"
        ? ["TURNSTILE_SECRET_KEY (or TURNSTILE_ALLOW_SKIP=1 locally)"]
        : [],
    db: row.slug === "commit-placement" || row.slug === "finalize-onboarding"
      ? ["commit_placement_result"]
      : row.slug === "create-account"
        ? ["save_placement_onboarding_draft", "profiles"]
        : row.slug === "stripe-webhook"
          ? ["apply_subscription_event", "transactions", "subscriptions"]
          : [],
    idempotency: row.slug.includes("placement") || row.slug === "finalize-onboarding" ? "RPC idempotency_key" : "handler-specific",
    external: row.slug.includes("stripe") ? ["Stripe"] : row.slug.includes("create-account") || row.slug === "submit-business-lead" ? ["Turnstile"] : [],
  })),
};
fs.writeFileSync(path.join(backendDir, "edge-contract.json"), `${JSON.stringify(edge, null, 2)}\n`);

const grants = {
  remessa: "V4.7.7",
  anon: V477_ANON_TABLE_JUSTIFICATION,
  authenticated: V477_GRANT_MATRIX,
};
fs.writeFileSync(path.join(backendDir, "grant-surface.json"), `${JSON.stringify(grants, null, 2)}\n`);

console.log("OK: wrote docs/backend/{migration-manifest,rpc-contract,edge-contract,grant-surface}.json");
