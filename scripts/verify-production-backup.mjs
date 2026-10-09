#!/usr/bin/env node
/**
 * RC2.3.10D — verify an owner-held production backup manifest.
 * Never reads dump contents into logs (no table data, emails, or secrets).
 *
 *   node scripts/verify-production-backup.mjs --manifest /secure/path/production-backup-manifest.json
 *
 * Exit: 0 PASS, 1 FAIL, 2 usage.
 */
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { LONGYU_PRODUCTION_PROJECT_ID } from "./lib/staging-guard.mjs";

const args = process.argv.slice(2);
const option = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};

const manifestPath = option("--manifest");
const maxAgeHours = Number(option("--max-age-hours") ?? "72");
const expectedTables = [
  "user_progress",
  "profiles",
  "subscriptions",
  "entitlement_grants",
  "transactions",
  "economy_ledger",
  "user_economy",
  "league_memberships",
  "beta_feedback",
  "beta_pedagogy_events",
];

if (!manifestPath) {
  console.error("usage: verify-production-backup.mjs --manifest <path> [--max-age-hours 72]");
  process.exit(2);
}

const errors = [];
const abs = path.resolve(manifestPath);
if (!fs.existsSync(abs)) {
  console.error(`FAIL manifest missing: ${abs}`);
  process.exit(1);
}

let doc;
try {
  doc = JSON.parse(fs.readFileSync(abs, "utf8"));
} catch (err) {
  console.error(`FAIL manifest unreadable: ${err instanceof Error ? err.message : err}`);
  process.exit(1);
}

const destDir = path.dirname(abs);
if (doc.schema !== "longyu-production-backup-manifest/1") {
  errors.push(`schema expected longyu-production-backup-manifest/1 got ${doc.schema}`);
}
if (doc.sourceProject !== LONGYU_PRODUCTION_PROJECT_ID) {
  errors.push(`sourceProject expected ${LONGYU_PRODUCTION_PROJECT_ID}`);
}
if (!/^[0-9a-f]{40}$/.test(String(doc.candidateSha ?? ""))) {
  errors.push("candidateSha must be 40-hex");
}
const takenAt = Date.parse(doc.takenAt ?? "");
if (!Number.isFinite(takenAt)) errors.push("takenAt missing/invalid");
else {
  const ageH = (Date.now() - takenAt) / 3_600_000;
  if (ageH < 0 || ageH > maxAgeHours) errors.push(`takenAt age ${ageH.toFixed(1)}h outside 0..${maxAgeHours}`);
}
if (doc.ownerVerification?.dataExportTaken !== true) {
  errors.push("ownerVerification.dataExportTaken must be true");
}
if (doc.ownerVerification?.encryptedAtRest !== true) {
  errors.push("ownerVerification.encryptedAtRest must be true");
}
if (doc.ownerVerification?.storedOutsideRepoAndSharedCloud !== true) {
  errors.push("ownerVerification.storedOutsideRepoAndSharedCloud must be true");
}
if (!doc.ownerVerification?.verifiedBy || !doc.ownerVerification?.verifiedAt) {
  errors.push("ownerVerification.verifiedBy/verifiedAt required");
}

const files = Array.isArray(doc.files) ? doc.files : [];
if (!files.length) errors.push("files[] empty");

for (const file of files) {
  const full = path.join(destDir, file.name);
  if (!fs.existsSync(full)) {
    errors.push(`file missing: ${file.name}`);
    continue;
  }
  const st = fs.statSync(full);
  if (!(st.size > 0)) errors.push(`file empty: ${file.name}`);
  if (file.bytes != null && Number(file.bytes) !== st.size) {
    errors.push(`size mismatch ${file.name}: manifest=${file.bytes} disk=${st.size}`);
  }
  if (file.sha256) {
    const hash = createHash("sha256");
    hash.update(fs.readFileSync(full));
    const digest = hash.digest("hex");
    if (digest !== file.sha256) errors.push(`sha256 mismatch ${file.name}`);
  } else {
    errors.push(`sha256 missing for ${file.name}`);
  }
  // Presence-only check: look for COPY public.<table> markers without printing rows.
  if (file.kind === "data" || /data/i.test(file.name)) {
    const head = fs.readFileSync(full, { encoding: "utf8", flag: "r" }).slice(0, 2_000_000);
    for (const table of expectedTables) {
      if (!head.includes(`COPY public.${table}`) && !head.includes(`COPY "public"."${table}"`)) {
        // large dumps may put tables later — also accept a tables[] list on the manifest
        const listed = doc.tablesIncluded ?? doc.ownerVerification?.perTableCountsRecordedInPr;
        if (!listed) errors.push(`expected table marker not found in first 2MB: ${table}`);
      }
    }
  }
}

if (doc.containsData !== true && !files.some((f) => f.kind === "data" || /data/i.test(f.name))) {
  errors.push("schema-only is not enough: need a data export file or containsData=true with data file");
}

if (errors.length) {
  console.error("FAIL verify:production-backup");
  for (const e of errors) console.error(" -", e);
  process.exit(1);
}

console.log(
  `PASS verify:production-backup · project ${doc.sourceProject} · sha ${String(doc.candidateSha).slice(0, 8)} · files ${files.length} · takenAt ${doc.takenAt}`
);
console.log("No dump contents were printed.");
