#!/usr/bin/env node
/**
 * gate:rc2-3-12-release-candidate
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { journeyFingerprint } from "./lib/report-meta.mjs";
import {
  checkRcIdentity,
  checkProductTruthFresh,
  checkLiveBillingFrozen,
  checkQaFlagsProduction,
  checkBetaReadyRequiresPhysical,
  checkKnownIssuesHonesty,
  checkArtifactHashes,
  checkVersionCodeReuse,
  checkAtomurus,
  lon001SiblingProbe,
  checkCurriculumBaseline,
  checkJevLearnerOff,
  checkChangePolicy,
  readRel,
  readJsonRel,
} from "./lib/rc2-3-12-gates.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readRel(root, rel);
const readJson = (rel) => readJsonRel(root, rel);
const exists = (rel) => fs.existsSync(path.join(root, rel));

function load() {
  let sha = null;
  try {
    sha = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
  } catch {
    sha = null;
  }
  return {
    sha,
    candidate: readJson("docs/release/rc-candidate.json"),
    packageJson: readJson("package.json"),
    productTruth: readJson("docs/release/product-truth.json"),
    launchBlockers: readJson("docs/release/launch-blockers.json"),
    monetizationMode: read("src/commercial/monetizationMode.ts"),
    featureFlags: exists("docs/release/feature-flags.json") ? read("docs/release/feature-flags.json") : "",
    netlify: exists("netlify.toml") ? read("netlify.toml") : "",
    policy: read("docs/release/RC_CHANGE_POLICY.md"),
    knownIssues: exists("docs/release/KNOWN_ISSUES_RC.md")
      ? { raw: read("docs/release/KNOWN_ISSUES_RC.md"), issues: parseKnownIssues(read("docs/release/KNOWN_ISSUES_RC.md")) }
      : { raw: "", issues: [] },
    entryCriteria: exists("docs/release/closed-beta-entry-criteria.json")
      ? readJson("docs/release/closed-beta-entry-criteria.json")
      : { result: "OWNER_ACTION_REQUIRED" },
    ledger: exists("docs/release/android-release-ledger.json") ? readJson("docs/release/android-release-ledger.json") : { releases: [] },
    fingerprint: journeyFingerprint(root),
    featureFlagsSrc: exists("src/lib/featureFlags.ts") ? read("src/lib/featureFlags.ts") : "",
    freeze: read("src/lib/curriculumFreeze.ts"),
  };
}

function parseKnownIssues(md) {
  const issues = [];
  const blocks = md.split(/^## /m).slice(1);
  for (const block of blocks) {
    const id = block.split("\n")[0].trim();
    const sev = block.match(/\*\*Severity:\*\*\s*(P[0-3])/i)?.[1]?.toUpperCase();
    const betaBlocker = /betaBlocker:\s*true/i.test(block) || /\*\*Beta blocker:\*\*\s*yes/i.test(block);
    if (sev) issues.push({ id, severity: sev, betaBlocker });
  }
  return issues;
}

function validate() {
  const w = load();
  const errors = [];
  errors.push(
    ...checkRcIdentity({
      candidate: w.candidate,
      packageJson: w.packageJson,
      fingerprint: w.fingerprint,
      headSha: w.sha,
    }).map((e) => `id:${e}`)
  );
  errors.push(
    ...checkProductTruthFresh({
      productTruth: w.productTruth,
      headSha: w.sha,
      candidateStatus: w.candidate.status,
    }).map((e) => `truth:${e}`)
  );
  errors.push(
    ...checkLiveBillingFrozen({
      monetizationMode: w.monetizationMode,
      productTruth: w.productTruth,
      launchBlockers: w.launchBlockers,
      candidate: w.candidate,
    }).map((e) => `billing:${e}`)
  );
  errors.push(
    ...checkQaFlagsProduction({
      featureFlags: w.featureFlags,
      netlify: w.netlify,
      candidate: w.candidate,
    }).map((e) => `qa:${e}`)
  );
  errors.push(
    ...checkBetaReadyRequiresPhysical({
      candidate: w.candidate,
      entryCriteria: w.entryCriteria,
    }).map((e) => `entry:${e}`)
  );
  errors.push(
    ...checkKnownIssuesHonesty({
      knownIssues: w.knownIssues,
      entryCriteria: w.entryCriteria,
    }).map((e) => `issues:${e}`)
  );
  errors.push(...checkArtifactHashes({ candidate: w.candidate }).map((e) => `artifact:${e}`));
  errors.push(...checkVersionCodeReuse({ candidate: w.candidate, ledger: w.ledger }).map((e) => `vc:${e}`));
  errors.push(...checkAtomurus(w.knownIssues.raw + w.policy).map((e) => `lon001:${e}`));
  errors.push(
    ...checkCurriculumBaseline({
      lessons: w.productTruth?.product?.lessons,
      teaching: w.productTruth?.product?.teachingTopics,
      fingerprint: w.fingerprint,
    }).map((e) => `content:${e}`)
  );
  errors.push(...checkJevLearnerOff(w.featureFlagsSrc).map((e) => `jev:${e}`));
  errors.push(...checkChangePolicy(w.policy).map((e) => `policy:${e}`));
  if (!exists("docs/release/closed-beta-entry-criteria.json")) errors.push("entry:CRITERIA_MISSING");
  if (!exists("docs/commercial/closed-beta-commercial-mode.json")) errors.push("commercial:MODE_MISSING");

  if (errors.length) {
    console.error("FAIL validate:rc2-3-12-release-candidate");
    for (const e of errors) console.error(`- ${e}`);
    process.exit(1);
  }
  console.log(`PASS validate:rc2-3-12-release-candidate · ${w.candidate.rcId} · ${w.sha?.slice(0, 7)} · v${w.candidate.version} · vc${w.candidate.versionCode}`);
}

function test() {
  let ok = true;
  const must = (label, code, errs) => {
    if (!errs.includes(code)) {
      console.error(`KILL MISS ${label}: expected ${code}, got ${JSON.stringify(errs)}`);
      ok = false;
    } else console.log(`KILL OK ${label} → ${code}`);
  };
  const w = load();

  must(
    "1 stale product truth",
    "STALE_PRODUCT_TRUTH",
    checkProductTruthFresh({
      productTruth: { ...w.productTruth, generatedFromSha: "a".repeat(40) },
      headSha: "b".repeat(40),
      candidateStatus: "BUILT",
    })
  );
  must(
    "2 rc sha mismatch",
    "RC_SHA_MISMATCH",
    checkRcIdentity({
      candidate: { ...w.candidate, status: "BUILT", gitSha: "a".repeat(40) },
      packageJson: w.packageJson,
      fingerprint: w.fingerprint,
      headSha: "b".repeat(40),
    })
  );
  must(
    "3 fingerprint mismatch",
    "FINGERPRINT_MISMATCH",
    checkRcIdentity({
      candidate: { ...w.candidate, fingerprint: "deadbeefdead" },
      packageJson: w.packageJson,
      fingerprint: w.fingerprint,
      headSha: w.sha,
    })
  );
  must(
    "4 apk wrong sha",
    "APK_WRONG_SHA",
    checkArtifactHashes({
      candidate: {
        apkArtifact: { sha256Expected: "aa", sha256Actual: "bb" },
      },
    })
  );
  must(
    "5 aab wrong sha",
    "AAB_WRONG_SHA",
    checkArtifactHashes({
      candidate: {
        aabArtifact: { sha256Expected: "aa", sha256Actual: "bb" },
      },
    })
  );
  must(
    "6 reused versionCode",
    "REUSED_VERSION_CODE",
    checkVersionCodeReuse({
      candidate: { versionCode: 42 },
      ledger: { releases: [{ versionCode: 42 }] },
    })
  );
  must(
    "9 live stripe cloud blocked",
    "LIVE_STRIPE_WHILE_CLOUD_BLOCKED",
    checkLiveBillingFrozen({
      monetizationMode: w.monetizationMode,
      productTruth: { commercial: { stripe: { mode: "live" } } },
      launchBlockers: { cloudCertification: "BLOCKED" },
      candidate: w.candidate,
    })
  );
  must(
    "11 jev learner",
    "JEV_LEARNER_RUNTIME",
    checkJevLearnerOff("fetch('https://api.typesafe.ai/v1')")
  );
  must(
    "12 p0 marked go",
    "P0_MARKED_GO",
    checkKnownIssuesHonesty({
      knownIssues: { issues: [{ severity: "P0", betaBlocker: true }] },
      entryCriteria: { result: "GO" },
    })
  );
  must(
    "33 go without observability",
    "GO_WITHOUT_OBSERVABILITY",
    checkBetaReadyRequiresPhysical({
      candidate: { status: "BETA_READY", physicalQa: "PASS" },
      entryCriteria: { result: "GO", hostedCi: "PASS", observability: "CONFIG_REQUIRED", rollback: "PASS" },
    })
  );
  must(
    "52 beta ready without physical",
    "BETA_READY_WITHOUT_PHYSICAL",
    checkBetaReadyRequiresPhysical({
      candidate: { status: "BETA_READY", physicalQa: "NOT_RUN" },
      entryCriteria: { result: "OWNER_ACTION_REQUIRED" },
    })
  );
  must(
    "53 go while hosted red",
    "GO_WHILE_HOSTED_CI_RED",
    checkBetaReadyRequiresPhysical({
      candidate: { status: "BETA_READY", physicalQa: "PASS" },
      entryCriteria: { result: "GO", hostedCi: "FAIL", observability: "PASS", rollback: "PASS" },
    })
  );
  must(
    "54 fingerprint change",
    "CURRICULUM_FINGERPRINT_CHANGED",
    checkCurriculumBaseline({ lessons: 134, teaching: 113, fingerprint: "deadbeefdead" })
  );
  must("56 lon001 sibling", ["ATO", "MURUS_TOUCHED"].join(""), checkAtomurus(`${lon001SiblingProbe()} sibling`));

  if (!ok) process.exit(1);
  console.log("PASS test:rc2-3-12-release-candidate");
}

const mode = process.argv[2] ?? "validate";
if (mode === "test") test();
else if (mode === "validate") validate();
else {
  console.error("use validate or test");
  process.exit(2);
}
