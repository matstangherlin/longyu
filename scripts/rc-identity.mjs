#!/usr/bin/env node
/**
 * Identidade imutável da RC. QA posterior deve citar versão + SHA + fingerprints.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { currentCommitSha, journeyFingerprint } from "./lib/report-meta.mjs";
import { edgeFunctionCatalog, LONGYU_EDGE_FUNCTIONS } from "./lib/edge-functions.mjs";

const root = process.cwd();
const rcSrc = readFileSync(path.join(root, "src/lib/releaseCandidate.ts"), "utf8");

function constString(name) {
  const match = rcSrc.match(new RegExp(`export const ${name} = "([^"]+)"`));
  if (!match) throw new Error(`const string ausente: ${name}`);
  return match[1];
}
function constNumber(name) {
  const match = rcSrc.match(new RegExp(`export const ${name} = (\\d+)`));
  if (!match) throw new Error(`const number ausente: ${name}`);
  return Number(match[1]);
}

const identity = {
  LONGYU_RC: constString("LONGYU_RC_VERSION"),
  git_sha: currentCommitSha(root),
  journey_fingerprint: journeyFingerprint(root),
  placement_version: constNumber("EXPECTED_PLACEMENT_VERSION"),
  schema_expected_version: constNumber("EXPECTED_PROGRESS_SCHEMA_VERSION"),
  store_version: constNumber("EXPECTED_STORE_VERSION"),
  edge_functions: edgeFunctionCatalog(),
  edge_slugs: LONGYU_EDGE_FUNCTIONS,
};

console.log(JSON.stringify(identity, null, 2));
