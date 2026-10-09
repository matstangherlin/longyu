#!/usr/bin/env node
/**
 * Refresh docs/release/rc-candidate.json from release-identity authority.
 * Does not advance status (NOT_BUILT → …) — evidence gates own that.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { computeVersionCode, readGitState, readVersionFloor } from "./lib/release-identity.mjs";
import { journeyFingerprint } from "./lib/report-meta.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const candidatePath = path.join(root, "docs/release/rc-candidate.json");
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const candidate = JSON.parse(fs.readFileSync(candidatePath, "utf8"));
const git = readGitState(root);
const floor = readVersionFloor(root);
const versionCode = computeVersionCode({ floor, firstParentCount: git.firstParentCount });
const fingerprint = journeyFingerprint(root);

candidate.gitSha = git.sha;
candidate.version = pkg.version;
candidate.versionCode = versionCode;
candidate.versionCodeFloor = floor;
candidate.versionCodeFormula = "floor + firstParentCommitCount";
candidate.fingerprint = fingerprint;
candidate.createdAt = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
candidate.versionAuthority = "docs/release/VERSION_AUTHORITY.md";
candidate.rcDraftPolicy =
  "RC1 never distributed — 12B regenerates RC1 draft; mint RC2 after any distributed artifact SHA changes";

fs.writeFileSync(candidatePath, JSON.stringify(candidate, null, 2) + "\n");
console.log(
  `refreshed rc-candidate · ${candidate.rcId} · ${git.sha.slice(0, 7)} · v${candidate.version} · vc${versionCode} · status=${candidate.status}`
);
