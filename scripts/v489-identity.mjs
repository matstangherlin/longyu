#!/usr/bin/env node
import { currentCommitSha, journeyFingerprint } from "./lib/report-meta.mjs";
import { localMigrationFiles, localSchemaHash } from "./lib/migration-drift.mjs";
import { edgeSourceCatalog, sha256File } from "./lib/schema-canonical.mjs";
import { projectRoot } from "./lib/env-local.mjs";
import {
  V489_BACKEND_RC,
  V489_BASE_MAIN_SHA,
  V489_DECISION,
  V489_PRODUCTION_WATERMARK,
} from "./lib/v489-production-preflight.mjs";

const root = projectRoot();
console.log(JSON.stringify({
  LONGYU_BACKEND_RC: V489_BACKEND_RC,
  git_sha: currentCommitSha(root),
  base_main_sha: V489_BASE_MAIN_SHA,
  production_watermark: V489_PRODUCTION_WATERMARK,
  journey_fingerprint: journeyFingerprint(root),
  migration_chain_sha256: localSchemaHash(localMigrationFiles(root)),
  migration_manifest_sha256: sha256File(`${root}/docs/backend/migration-manifest.json`),
  rpc_contract_sha256: sha256File(`${root}/docs/backend/rpc-contract.json`),
  edge_contract_sha256: sha256File(`${root}/docs/backend/edge-contract.json`),
  edge_sources: edgeSourceCatalog(root).map(({ slug, source_sha256 }) => ({ slug, source_sha256 })),
  canonical_schema_hash: "NOT_RUN",
  decision: V489_DECISION,
}, null, 2));
