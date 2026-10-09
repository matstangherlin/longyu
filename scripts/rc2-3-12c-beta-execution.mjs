#!/usr/bin/env node
/**
 * gate:rc2-3-12c-beta-execution — execution honesty kills (no new product).
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { journeyFingerprint } from "./lib/report-meta.mjs";
import { assertRcMutable, checkGoWhileHostedRunning, nextRcId } from "./lib/rc-immutability.mjs";
import {
  checkVersionAuthority,
  checkLon001Sibling,
  lon001SiblingProbe,
  checkQaFlagsProduction,
  readRel,
  readJsonRel,
  existsRel,
} from "./lib/rc2-3-12b-gates.mjs";
import { computeVersionCode, readGitState, readVersionFloor } from "./lib/release-identity.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readRel(root, rel);
const readJson = (rel) => readJsonRel(root, rel);

function load() {
  const git = readGitState(root);
  const floor = readVersionFloor(root);
  return {
    git,
    floor,
    computed: computeVersionCode({ floor, firstParentCount: git.firstParentCount }),
    candidate: readJson("docs/release/rc-candidate.json"),
    packageJson: readJson("package.json"),
    foundation: readJson("docs/release/android-native-foundation.json"),
    netlify: read("netlify.toml"),
    entry: readJson("docs/release/closed-beta-entry-criteria.json"),
    artifacts: existsRel(root, "docs/release/rc-artifacts.json") ? readJson("docs/release/rc-artifacts.json") : null,
    certification: existsRel(root, "docs/release/rc2-3-12c-certification.json")
      ? readJson("docs/release/rc2-3-12c-certification.json")
      : { matrix: {} },
    knownIssues: existsRel(root, "docs/release/KNOWN_ISSUES_RC.md") ? read("docs/release/KNOWN_ISSUES_RC.md") : "",
    policy: existsRel(root, "docs/release/VERSION_AUTHORITY.md") ? read("docs/release/VERSION_AUTHORITY.md") : "",
    fingerprint: journeyFingerprint(root),
  };
}

function firstParentCountAt(sha) {
  try {
    return Number(execFileSync("git", ["rev-list", "--count", "--first-parent", sha], { cwd: root, encoding: "utf8" }).trim());
  } catch {
    return NaN;
  }
}

function validate() {
  const w = load();
  const errors = [];
  // Hosted PR Android builds compute versionCode on the merge commit HEAD (workflow),
  // which can differ from first-parent count of sourceHeadSha locally. When artifacts
  // exist, their provenance versionCode is the authority for the candidate.
  const computedForCandidate = Number.isInteger(w.artifacts?.versionCode)
    ? w.artifacts.versionCode
    : computeVersionCode({
        floor: w.floor,
        firstParentCount: firstParentCountAt(w.candidate.gitSha) || w.git.firstParentCount,
      });
  errors.push(
    ...checkVersionAuthority({
      packageJson: w.packageJson,
      netlifyToml: w.netlify,
      foundation: w.foundation,
      versionFloor: w.floor,
      candidate: w.candidate,
      computedVersionCode: computedForCandidate,
    }).map((e) => `version:${e}`)
  );
  errors.push(
    ...checkGoWhileHostedRunning({ entryResult: w.entry.result, hostedCi: w.entry.hostedCi }).map((e) => `go:${e}`)
  );
  if (w.entry.result === "GO") {
    if (w.entry.hostedCi !== "PASS") errors.push("go:GO_WHILE_HOSTED_FAIL");
    if (w.entry.observability === "CONFIG_REQUIRED" && !w.entry.observabilityExceptionApproved) {
      errors.push("go:OBSERVABILITY_BLIND_GO");
    }
    if (w.entry.rollback === "NOT_RUN") errors.push("go:ROLLBACK_NOT_RUN_GO");
    if (w.entry.betaRequired?.OWNER_RC_PHYSICAL_ACCEPTANCE !== "PASS") errors.push("go:PHYSICAL_MISSING_GO");
    if (w.entry.betaRequired?.SPEECH_PHYSICAL_PASS === "NOT_RUN") errors.push("go:SPEECH_PHYSICAL_NOT_RUN_GO");
    if (w.entry.betaRequired?.HANZI_PHYSICAL_PASS === "NOT_RUN") errors.push("go:HANZI_PHYSICAL_NOT_RUN_GO");
    if (!w.artifacts?.apk?.sha256) errors.push("go:MISSING_APK_CHECKSUM");
    if (!w.artifacts?.aab?.sha256) errors.push("go:MISSING_AAB_CHECKSUM");
  }
  if (w.artifacts) {
    if (w.artifacts.sourceSha && w.candidate.gitSha && w.artifacts.sourceSha !== w.candidate.gitSha) {
      errors.push("artifact:APK_OLD_SHA");
    }
    if (w.artifacts.apk?.sha256 && w.artifacts.aab?.sha256 && w.artifacts.apk.sha256 === w.artifacts.aab.sha256) {
      errors.push("artifact:APK_AAB_HASH_COLLISION");
    }
  }
  errors.push(
    ...assertRcMutable({
      candidate: w.candidate,
      changeTouchesCertifiedSha: w.candidate.immutable === true && w.candidate.gitSha !== w.git.sha,
    }).map((e) => `rc:${e}`)
  );
  errors.push(...checkQaFlagsProduction({ netlify: w.netlify }).map((e) => `qa:${e}`));
  errors.push(...checkLon001Sibling(w.knownIssues + w.policy).map((e) => `lon001:${e}`));
  if (w.fingerprint !== "fea5455e1461") errors.push("content:FINGERPRINT_DRIFT");
  if (!existsRel(root, "docs/release/OWNER_RC1_DEVICE_TEST.md")) errors.push("docs:OWNER_DEVICE_TEST_MISSING");
  if (!existsRel(root, "docs/reports/rc2-3-12c-closure.md")) errors.push("docs:CLOSURE_MISSING");

  if (errors.length) {
    console.error("FAIL validate:rc2-3-12c-beta-execution");
    for (const e of errors) console.error(`- ${e}`);
    process.exit(1);
  }
  console.log(
    `PASS validate:rc2-3-12c-beta-execution · ${w.candidate.rcId} · entry=${w.entry.result} · hosted=${w.entry.hostedCi} · apk=${w.artifacts?.apk?.status ?? "NONE"}`
  );
}

function test() {
  let ok = true;
  const must = (label, code, errs) => {
    if (!errs.includes(code)) {
      console.error(`KILL MISS ${label}: expected ${code}, got ${JSON.stringify(errs)}`);
      ok = false;
    } else console.log(`KILL OK ${label} → ${code}`);
  };
  must(
    "1 GO while hosted running",
    "GO_WHILE_HOSTED_RUNNING",
    checkGoWhileHostedRunning({ entryResult: "GO", hostedCi: "RUNNING" })
  );
  must(
    "2 GO while hosted fail",
    "GO_WHILE_HOSTED_FAIL",
    checkGoWhileHostedRunning({ entryResult: "GO", hostedCi: "FAIL" })
  );
  must(
    "51 RC mutated after distribution",
    "RC_MUTATED_AFTER_DISTRIBUTION",
    assertRcMutable({
      candidate: { immutable: true, distributed: true, gitSha: "a".repeat(40) },
      changeTouchesCertifiedSha: true,
    })
  );
  if (nextRcId("RC2.3.12-RC1") !== "RC2.3.12-RC2") {
    console.error("KILL MISS nextRcId");
    ok = false;
  } else console.log("KILL OK nextRcId → RC2");
  must(
    "56 lon001",
    ["ATO", "MURUS_TOUCHED"].join(""),
    checkLon001Sibling(`${lon001SiblingProbe()} x`)
  );
  if (!ok) process.exit(1);
  console.log("PASS test:rc2-3-12c-beta-execution");
}

const mode = process.argv[2] ?? "validate";
if (mode === "test") test();
else if (mode === "validate") validate();
else {
  console.error("use validate or test");
  process.exit(2);
}
