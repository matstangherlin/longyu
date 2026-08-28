#!/usr/bin/env node
/**
 * Identidade do backend V4.7.8. QA deve citar LONGYU_BACKEND_RC + hashes + SHA.
 * Não altera LONGYU_RC_VERSION (v4.7.4-rc.1).
 */
import { currentCommitSha, journeyFingerprint } from "./lib/report-meta.mjs";
import { sha256File } from "./lib/schema-canonical.mjs";
import { localMigrationFiles, localSchemaHash } from "./lib/migration-drift.mjs";
import {
  LONGYU_BACKEND_PLACEMENT_VERSION,
  LONGYU_BACKEND_RC,
  LONGYU_BACKEND_RC_CHANNEL,
  LONGYU_MAIN_SHA_AT_FREEZE,
  LONGYU_V477_HEAD,
  V478_REMESSA_STATUS,
} from "./lib/v478-backend-rc.mjs";
import { projectRoot } from "./lib/env-local.mjs";

const root = projectRoot();
const files = localMigrationFiles(root);

const identity = {
  LONGYU_BACKEND_RC,
  channel: LONGYU_BACKEND_RC_CHANNEL,
  remessa_status: V478_REMESSA_STATUS,
  git_sha: currentCommitSha(root),
  main_sha_at_freeze: LONGYU_MAIN_SHA_AT_FREEZE,
  v477_head: LONGYU_V477_HEAD,
  journey_fingerprint: journeyFingerprint(root),
  placement_version: LONGYU_BACKEND_PLACEMENT_VERSION,
  migration_chain_sha256: localSchemaHash(files),
  migration_manifest_sha256: sha256File(`${root}/docs/backend/migration-manifest.json`),
  rpc_contract_sha256: sha256File(`${root}/docs/backend/rpc-contract.json`),
  edge_contract_sha256: sha256File(`${root}/docs/backend/edge-contract.json`),
  grant_surface_sha256: sha256File(`${root}/docs/backend/grant-surface.json`),
  canonical_schema_hash: "NOT_RUN",
  note: "canonical_schema_hash is filled by ephemeral rehearse:backend-contract / CI, never invented.",
};

console.log(JSON.stringify(identity, null, 2));
