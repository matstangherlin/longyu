/**
 * V4.7.8 HOST-001…009 gate. Zero MandarimProject writes.
 * Hosted scoreboard stays NOT_RUN. Does not invent PHYSICAL_QA / PAYMENTS / closed-beta PASS.
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { projectRoot } from "./lib/env-local.mjs";
import { sha256File } from "./lib/schema-canonical.mjs";
import { localMigrationFiles, localSchemaHash, classifyMigrationDrift } from "./lib/migration-drift.mjs";
import { journeyFingerprint } from "./lib/report-meta.mjs";
import {
  LONGYU_BACKEND_PLACEMENT_VERSION,
  LONGYU_BACKEND_RC,
  LONGYU_MAIN_SHA_AT_FREEZE,
  LONGYU_V477_HEAD,
  V478_APPROVAL_TOKEN,
  V478_HOSTED_SCOREBOARD_KEYS,
  V478_PENDING_MIGRATIONS,
  V478_REMESSA_STATUS,
} from "./lib/v478-backend-rc.mjs";
import { V477_LOCAL_ONLY_CLASS } from "./lib/v477-constants.mjs";

const root = projectRoot();
const errors = [];
function assert(cond, message) {
  if (!cond) errors.push(message);
}

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

const identitySrc = read("src/lib/releaseCandidate.ts");
assert(identitySrc.includes('LONGYU_RC_VERSION = "v4.7.4-rc.1"'), "product RC stays v4.7.4-rc.1");
assert(identitySrc.includes("EXPECTED_PLACEMENT_VERSION = 2"), "placement version 2");

const backendRcSrc = read("scripts/lib/v478-backend-rc.mjs");
assert(backendRcSrc.includes(`LONGYU_BACKEND_RC = "${LONGYU_BACKEND_RC}"`), "backend RC const");
assert(LONGYU_BACKEND_RC === "v4.7.8-rc.1", "backend RC is v4.7.8-rc.1");
assert(LONGYU_BACKEND_PLACEMENT_VERSION === 2, "backend placement 2");
assert(LONGYU_MAIN_SHA_AT_FREEZE === "b2a5818af1182277ac61c699970b1e3e868ded12", "main SHA recorded");
assert(LONGYU_V477_HEAD.startsWith("1823d7d"), "v477 head recorded");

const rcJson = JSON.parse(read("docs/backend/v478-backend-rc.json"));
assert(rcJson.LONGYU_BACKEND_RC === LONGYU_BACKEND_RC, "generated RC matches const");
assert(rcJson.placement_version === 2, "generated placement 2");
assert(rcJson.canonical_schema_hash === "NOT_RUN", "does not invent schema hash");
assert(rcJson.journey_fingerprint === journeyFingerprint(root), "journey fingerprint live");
assert(rcJson.migration_chain_sha256 === localSchemaHash(localMigrationFiles(root)), "chain hash live");
assert(rcJson.migration_manifest_sha256 === sha256File(path.join(root, "docs/backend/migration-manifest.json")), "manifest hash live");
assert(rcJson.rpc_contract_sha256 === sha256File(path.join(root, "docs/backend/rpc-contract.json")), "rpc hash live");
assert(rcJson.edge_contract_sha256 === sha256File(path.join(root, "docs/backend/edge-contract.json")), "edge hash live");

const netlify = read("netlify.toml");
assert(/\[context\.production\.environment\][\s\S]*VITE_CLOUD_ONBOARDING_V2_ENABLED = "false"/.test(netlify), "HOST-008 production onboarding stays false");

const drift = classifyMigrationDrift(localMigrationFiles(root));
for (const file of V478_PENDING_MIGRATIONS) {
  assert(
    drift.localOnly.some((row) => row.local.file === file),
    `pending still LOCAL_ONLY: ${file}`
  );
  assert(V477_LOCAL_ONLY_CLASS[file]?.class === "NOT_YET_DEPLOYED", `classified NOT_YET_DEPLOYED: ${file}`);
}

const report = read("docs/reports/v478-controlled-upgrade.md");
for (const key of V478_HOSTED_SCOREBOARD_KEYS) {
  assert(report.includes(key), `report mentions ${key}`);
  assert(new RegExp(`${key}[^\n]*NOT_RUN`).test(report), `${key} stays NOT_RUN`);
  assert(!new RegExp(`${key}[^\n]*PASS`).test(report), `${key} must not be PASS`);
}
assert(report.includes(V478_REMESSA_STATUS), "remessa status READY_FOR_CONTROLLED_UPGRADE");
assert(report.includes("drjcfalvlbbeblmmyhwj"), "names MandarimProject id");
assert(report.includes(V478_APPROVAL_TOKEN), "names approval token");
assert(!/PHYSICAL_QA_READY[^\n]*PASS/.test(report), "no PHYSICAL_QA PASS");
assert(!/PAYMENTS_READY[^\n]*PASS/.test(report), "no PAYMENTS PASS");
assert(!/READY_FOR_CLOSED_BETA_BR[^\n]*PASS/.test(report), "no closed beta PASS");
assert(/ZERO|zero writes|Do not apply/i.test(report), "zero writes");

const snapshot = read("docs/reports/v478-predeployment-snapshot.md");
assert(snapshot.includes("| profiles | 11 |"), "exact profile count");
assert(!/@[a-z0-9.-]+\.[a-z]{2,}/i.test(snapshot), "snapshot avoids emails");
assert(!/sk_live_|sbp_/.test(snapshot), "no tokens");

const risk = read("docs/reports/v478-migration-risk-plan.md");
assert(/HIGH/.test(risk), "risk plan has HIGH");
assert(/20260826230000_placement_onboarding/.test(risk), "placement risk listed");
assert(/11/.test(risk), "11 profiles data-safety");
assert(/Do not apply silently|must not apply silently/i.test(risk), "HIGH not silent");

const gate = read("docs/reports/v478-human-gate.md");
assert(gate.includes(V478_APPROVAL_TOKEN), "human gate token");
assert(/STOP/.test(gate), "HOST-009 STOP");
assert(/HOST-010/.test(gate) === false || /blocked|not this remessa|later/i.test(gate), "HOST-010+ not executed");

const board = JSON.parse(read("docs/reports/v478-hosted-scoreboard.json"));
assert(board.remessa_status === V478_REMESSA_STATUS, "json status");
assert(board.production_writes === "ZERO", "json zero writes");
for (const key of V478_HOSTED_SCOREBOARD_KEYS) {
  assert(board[key] === "NOT_RUN", `json ${key}=NOT_RUN`);
}

const v478Scripts = [
  "scripts/lib/v478-backend-rc.mjs",
  "scripts/v478-identity.mjs",
  "scripts/test-mastery-monotonic-contract.mjs",
];
for (const file of v478Scripts) {
  const text = read(file);
  assert(!/apply_migration/.test(text), `${file} must not call apply_migration`);
  assert(!/deploy_edge_function/.test(text), `${file} must not deploy edges`);
}

const pkg = JSON.parse(read("package.json"));
assert(pkg.scripts["test:mastery-monotonic-contract"] === "node scripts/test-mastery-monotonic-contract.mjs", "script mastery");
assert(pkg.scripts["test:v478-hosted-gate"] === "node scripts/test-v478-hosted-gate.mjs", "script hosted gate");
assert(pkg.scripts["v478:identity"] === "node scripts/v478-identity.mjs", "script identity");
assert(pkg.scripts["validate:beta"].includes("test:mastery-monotonic-contract"), "validate:beta includes mastery contract");
assert(pkg.scripts["validate:beta"].includes("test:v478-hosted-gate"), "validate:beta includes hosted gate");

const identityRun = spawnSync(process.execPath, [path.join(root, "scripts/v478-identity.mjs")], {
  cwd: root,
  encoding: "utf8",
});
assert(identityRun.status === 0, "v478-identity exits 0");
assert(identityRun.stdout.includes(LONGYU_BACKEND_RC), "identity prints RC");

if (errors.length) {
  console.error("FAIL test:v478-hosted-gate:");
  for (const item of errors) console.error(`  - ${item}`);
  process.exit(1);
}
console.log("OK: test:v478-hosted-gate");
