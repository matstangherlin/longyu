import fs from "node:fs";
import path from "node:path";
import { projectRoot } from "./lib/env-local.mjs";
import { buildMigrationManifest, edgeSourceCatalog, sha256File } from "./lib/schema-canonical.mjs";
import { localMigrationFiles, localSchemaHash } from "./lib/migration-drift.mjs";
import { journeyFingerprint } from "./lib/report-meta.mjs";
import { V477_CRITICAL_RPCS, V477_GRANT_MATRIX, V477_ANON_TABLE_JUSTIFICATION } from "./lib/v477-constants.mjs";
import {
  LONGYU_BACKEND_PLACEMENT_VERSION,
  LONGYU_BACKEND_RC,
  LONGYU_BACKEND_RC_CHANNEL,
  LONGYU_MAIN_SHA_AT_FREEZE,
  LONGYU_V477_HEAD,
  V478_REMESSA_STATUS,
} from "./lib/v478-backend-rc.mjs";
import {
  V489_BACKEND_RC,
  V489_BASE_MAIN_SHA,
  V489_DECISION,
  V489_PRODUCTION_WATERMARK,
} from "./lib/v489-production-preflight.mjs";

const root = projectRoot();
const backendDir = path.join(root, "docs/backend");
fs.mkdirSync(backendDir, { recursive: true });

const manifest = buildMigrationManifest(root);
fs.writeFileSync(path.join(backendDir, "migration-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);

const rpcContract = {
  remessa: "V4.7.8",
  note: "CI fails if a listed RPC signature drifts without updating this file in the same PR.",
  rpcs: V477_CRITICAL_RPCS,
};
fs.writeFileSync(path.join(backendDir, "rpc-contract.json"), `${JSON.stringify(rpcContract, null, 2)}\n`);

const edge = {
  remessa: "V4.7.8",
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
  remessa: "V4.7.8",
  anon: V477_ANON_TABLE_JUSTIFICATION,
  authenticated: V477_GRANT_MATRIX,
};
fs.writeFileSync(path.join(backendDir, "grant-surface.json"), `${JSON.stringify(grants, null, 2)}\n`);

const files = localMigrationFiles(root);
const backendRc = {
  remessa: "V4.7.8",
  LONGYU_BACKEND_RC,
  channel: LONGYU_BACKEND_RC_CHANNEL,
  remessa_status: V478_REMESSA_STATUS,
  main_sha_at_freeze: LONGYU_MAIN_SHA_AT_FREEZE,
  v477_head: LONGYU_V477_HEAD,
  journey_fingerprint: journeyFingerprint(root),
  placement_version: LONGYU_BACKEND_PLACEMENT_VERSION,
  migration_chain_sha256: localSchemaHash(files),
  migration_manifest_sha256: sha256File(path.join(backendDir, "migration-manifest.json")),
  rpc_contract_sha256: sha256File(path.join(backendDir, "rpc-contract.json")),
  edge_contract_sha256: sha256File(path.join(backendDir, "edge-contract.json")),
  grant_surface_sha256: sha256File(path.join(backendDir, "grant-surface.json")),
  canonical_schema_hash: "NOT_RUN",
  note: "canonical_schema_hash stays NOT_RUN until ephemeral CI. Hosted keys stay NOT_RUN until approved apply.",
};
fs.writeFileSync(path.join(backendDir, "v478-backend-rc.json"), `${JSON.stringify(backendRc, null, 2)}\n`);

const v489BackendRc = {
  remessa: "V4.8.9",
  LONGYU_BACKEND_RC: V489_BACKEND_RC,
  status: V489_DECISION,
  base_main_sha: V489_BASE_MAIN_SHA,
  production_watermark: V489_PRODUCTION_WATERMARK,
  journey_fingerprint: journeyFingerprint(root),
  placement_version: LONGYU_BACKEND_PLACEMENT_VERSION,
  migration_chain_sha256: localSchemaHash(files),
  migration_manifest_sha256: sha256File(path.join(backendDir, "migration-manifest.json")),
  rpc_contract_sha256: sha256File(path.join(backendDir, "rpc-contract.json")),
  edge_contract_sha256: sha256File(path.join(backendDir, "edge-contract.json")),
  grant_surface_sha256: sha256File(path.join(backendDir, "grant-surface.json")),
  canonical_schema_hash: "NOT_RUN",
  hosted_mutations: "FORBIDDEN_IN_V4.8.9",
  note: "Pre-apply identity only. A code or contract change requires a new identity; no hosted readiness is inferred.",
};
fs.writeFileSync(path.join(backendDir, "v489-backend-rc.json"), `${JSON.stringify(v489BackendRc, null, 2)}\n`);

console.log("OK: wrote docs/backend/{migration-manifest,rpc-contract,edge-contract,grant-surface,v478-backend-rc,v489-backend-rc}.json");
