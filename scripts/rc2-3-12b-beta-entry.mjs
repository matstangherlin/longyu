#!/usr/bin/env node
/**
 * gate:rc2-3-12b-beta-entry — version authority, SHA freshness, GO honesty kills.
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { journeyFingerprint } from "./lib/report-meta.mjs";
import { computeVersionCode, readGitState, readVersionFloor } from "./lib/release-identity.mjs";
import {
  checkVersionAuthority,
  checkRcShaFresh,
  checkProductTruthFresh,
  checkArtifactTriangle,
  checkGoHonesty,
  checkQaFlagsProduction,
  checkCurriculumBaseline,
  checkLon001Sibling,
  lon001SiblingProbe,
  readRel,
  readJsonRel,
  existsRel,
} from "./lib/rc2-3-12b-gates.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readRel(root, rel);
const readJson = (rel) => readJsonRel(root, rel);

function firstParentCountAt(sha) {
  try {
    return Number(execFileSync("git", ["rev-list", "--count", "--first-parent", sha], { cwd: root, encoding: "utf8" }).trim());
  } catch {
    return NaN;
  }
}

function load() {
  const git = readGitState(root);
  const floor = readVersionFloor(root);
  const candidate = readJson("docs/release/rc-candidate.json");
  // Draft: versionCode is bound to candidate.gitSha (may lag HEAD by the lock commit).
  // After NOT_BUILT, versionCode must match HEAD first-parent count.
  const countForCode =
    candidate?.status === "NOT_BUILT" && candidate?.gitSha
      ? firstParentCountAt(candidate.gitSha) || git.firstParentCount
      : git.firstParentCount;
  const computed = computeVersionCode({ floor, firstParentCount: countForCode });
  return {
    git,
    floor,
    computed,
    candidate,
    packageJson: readJson("package.json"),
    productTruth: readJson("docs/release/product-truth.json"),
    foundation: readJson("docs/release/android-native-foundation.json"),
    netlify: read("netlify.toml"),
    entryCriteria: readJson("docs/release/closed-beta-entry-criteria.json"),
    certification: existsRel(root, "docs/release/rc2-3-12-certification.json")
      ? readJson("docs/release/rc2-3-12-certification.json")
      : { matrix: {} },
    certification12b: existsRel(root, "docs/release/rc2-3-12b-certification.json")
      ? readJson("docs/release/rc2-3-12b-certification.json")
      : null,
    policy: existsRel(root, "docs/release/VERSION_AUTHORITY.md") ? read("docs/release/VERSION_AUTHORITY.md") : "",
    knownIssues: existsRel(root, "docs/release/KNOWN_ISSUES_RC.md") ? read("docs/release/KNOWN_ISSUES_RC.md") : "",
    featureFlags: existsRel(root, "docs/release/feature-flags.json") ? read("docs/release/feature-flags.json") : "",
    fingerprint: journeyFingerprint(root),
  };
}

function validate() {
  const w = load();
  const errors = [];
  if (!w.policy) errors.push("policy:VERSION_AUTHORITY_MISSING");
  errors.push(
    ...checkVersionAuthority({
      packageJson: w.packageJson,
      netlifyToml: w.netlify,
      foundation: w.foundation,
      versionFloor: w.floor,
      candidate: w.candidate,
      computedVersionCode: w.computed,
    }).map((e) => `version:${e}`)
  );
  if (w.candidate?.status && w.candidate.status !== "NOT_BUILT") {
    errors.push(...checkRcShaFresh({ candidate: w.candidate, headSha: w.git.sha }).map((e) => `sha:${e}`));
    errors.push(
      ...checkProductTruthFresh({ productTruth: w.productTruth, headSha: w.git.sha }).map((e) => `truth:${e}`)
    );
  }
  errors.push(
    ...checkArtifactTriangle({ candidate: w.candidate, headSha: w.git.sha }).map((e) => `artifact:${e}`)
  );
  errors.push(
    ...checkGoHonesty({
      entryCriteria: w.entryCriteria,
      candidate: w.candidate,
      certification: w.certification12b ?? w.certification,
    }).map((e) => `go:${e}`)
  );
  errors.push(
    ...checkQaFlagsProduction({
      netlify: w.netlify,
      featureFlags: w.featureFlags,
    }).map((e) => `qa:${e}`)
  );
  errors.push(
    ...checkCurriculumBaseline({
      fingerprint: w.fingerprint,
      lessons: w.productTruth?.product?.lessons,
      teaching: w.productTruth?.product?.teachingTopics,
    }).map((e) => `content:${e}`)
  );
  errors.push(...checkLon001Sibling(w.knownIssues + w.policy).map((e) => `lon001:${e}`));
  if (!existsRel(root, "docs/release/VERSION_AUTHORITY.md")) errors.push("docs:VERSION_AUTHORITY_MISSING");
  if (!existsRel(root, "docs/reports/rc2-3-12b-closure.md")) errors.push("docs:CLOSURE_MISSING");

  if (errors.length) {
    console.error("FAIL validate:rc2-3-12b-beta-entry");
    for (const e of errors) console.error(`- ${e}`);
    process.exit(1);
  }
  console.log(
    `PASS validate:rc2-3-12b-beta-entry · ${w.candidate.rcId} · ${w.git.sha.slice(0, 7)} · v${w.candidate.version} · vc${w.candidate.versionCode} · entry=${w.entryCriteria.result}`
  );
}

function test() {
  let ok = true;
  const w = load();
  const must = (label, code, errs) => {
    if (!errs.includes(code)) {
      console.error(`KILL MISS ${label}: expected ${code}, got ${JSON.stringify(errs)}`);
      ok = false;
    } else console.log(`KILL OK ${label} → ${code}`);
  };

  must(
    "1 versionCode conflict",
    "VERSION_AUTHORITY_DRIFT",
    checkVersionAuthority({
      packageJson: w.packageJson,
      netlifyToml: w.netlify,
      foundation: w.foundation,
      versionFloor: w.floor,
      candidate: { ...w.candidate, versionCode: w.computed + 99 },
      computedVersionCode: w.computed,
    })
  );
  must(
    "2 netlify name drift",
    "VERSION_AUTHORITY_DRIFT",
    checkVersionAuthority({
      packageJson: w.packageJson,
      netlifyToml: 'VITE_APP_VERSION = "9.9.9"',
      foundation: w.foundation,
      versionFloor: w.floor,
      candidate: w.candidate,
      computedVersionCode: w.computed,
    })
  );
  must(
    "3 RC SHA stale",
    "RC_SHA_STALE",
    checkRcShaFresh({ candidate: { gitSha: "0".repeat(40) }, headSha: w.git.sha })
  );
  must(
    "4 Product Truth stale",
    "STALE_PRODUCT_TRUTH",
    checkProductTruthFresh({ productTruth: { generatedFromSha: "0".repeat(40) }, headSha: w.git.sha })
  );
  must(
    "5 foundation floor drift",
    "VERSION_AUTHORITY_DRIFT",
    checkVersionAuthority({
      packageJson: w.packageJson,
      netlifyToml: w.netlify,
      foundation: { ...w.foundation, versionCode: w.floor + 1 },
      versionFloor: w.floor,
      candidate: w.candidate,
      computedVersionCode: w.computed,
    })
  );
  must(
    "9 artifact old commit",
    "ARTIFACT_OLD_COMMIT",
    checkArtifactTriangle({
      candidate: {
        apkArtifact: { status: "BUILT", gitSha: "0".repeat(40), sha256: "a".repeat(64) },
      },
      headSha: w.git.sha,
    })
  );
  must(
    "12 QA flag",
    "QA_FLAG_PRODUCTION",
    checkQaFlagsProduction({ netlify: 'VITE_DEVICE_QA = "true"', featureFlags: "" })
  );
  must(
    "13 fixture",
    "FIXTURE_PRODUCTION",
    checkQaFlagsProduction({ netlify: 'VITE_USE_TEST_FIXTURES = "true"', featureFlags: "" })
  );
  must(
    "17 hosted CI red GO",
    "HOSTED_CI_RED_GO",
    checkGoHonesty({
      entryCriteria: { result: "GO", hostedCi: "FAIL", observability: "PASS", rollback: "PASS", betaRequired: { OWNER_RC_PHYSICAL_ACCEPTANCE: "PASS" } },
      candidate: { status: "BETA_READY", liveMonetization: false, androidIap: "DISABLED_FOR_BETA" },
      certification: {
        matrix: {
          SPEECH_PHYSICAL_PASS: "PASS",
          HANZI_PHYSICAL_PASS: "PASS",
          CLOUD_SMOKE_PASS: "PASS",
          CLOUD_BETA_REQUIRED_PASS: "PASS",
          ANDROID_OAUTH_PASS: "PASS",
        },
      },
    })
  );
  must(
    "24 observability blind GO",
    "OBSERVABILITY_BLIND_GO",
    checkGoHonesty({
      entryCriteria: {
        result: "GO",
        hostedCi: "PASS",
        observability: "CONFIG_REQUIRED",
        observabilityExceptionApproved: false,
        rollback: "PASS",
        betaRequired: { OWNER_RC_PHYSICAL_ACCEPTANCE: "PASS" },
      },
      candidate: { status: "CODE_VALIDATED", liveMonetization: false, androidIap: "DISABLED_FOR_BETA" },
      certification: {
        matrix: {
          SPEECH_PHYSICAL_PASS: "PASS",
          HANZI_PHYSICAL_PASS: "PASS",
          CLOUD_SMOKE_PASS: "PASS",
          CLOUD_BETA_REQUIRED_PASS: "PASS",
          ANDROID_OAUTH_PASS: "PASS",
        },
      },
    })
  );
  must(
    "25 rollback NOT_RUN GO",
    "ROLLBACK_NOT_RUN_GO",
    checkGoHonesty({
      entryCriteria: {
        result: "GO",
        hostedCi: "PASS",
        observability: "PASS",
        rollback: "NOT_RUN",
        betaRequired: { OWNER_RC_PHYSICAL_ACCEPTANCE: "PASS" },
      },
      candidate: { status: "CODE_VALIDATED", liveMonetization: false, androidIap: "DISABLED_FOR_BETA" },
      certification: {
        matrix: {
          SPEECH_PHYSICAL_PASS: "PASS",
          HANZI_PHYSICAL_PASS: "PASS",
          CLOUD_SMOKE_PASS: "PASS",
          CLOUD_BETA_REQUIRED_PASS: "PASS",
          ANDROID_OAUTH_PASS: "PASS",
        },
      },
    })
  );
  must(
    "19 BETA_READY without physical",
    "BETA_READY_WITHOUT_PHYSICAL",
    checkGoHonesty({
      entryCriteria: {
        result: "GO",
        hostedCi: "PASS",
        observability: "PASS",
        rollback: "PASS",
        betaRequired: { OWNER_RC_PHYSICAL_ACCEPTANCE: "NOT_RUN" },
      },
      candidate: { status: "BETA_READY", liveMonetization: false, androidIap: "DISABLED_FOR_BETA" },
      certification: {
        matrix: {
          SPEECH_PHYSICAL_PASS: "PASS",
          HANZI_PHYSICAL_PASS: "PASS",
          CLOUD_SMOKE_PASS: "PASS",
          CLOUD_BETA_REQUIRED_PASS: "PASS",
          ANDROID_OAUTH_PASS: "PASS",
        },
      },
    })
  );
  must(
    "32 live billing",
    "LIVE_BILLING_ENABLED",
    checkGoHonesty({
      entryCriteria: {
        result: "GO",
        hostedCi: "PASS",
        observability: "PASS",
        rollback: "PASS",
        betaRequired: { OWNER_RC_PHYSICAL_ACCEPTANCE: "PASS" },
      },
      candidate: { status: "CODE_VALIDATED", liveMonetization: true, androidIap: "DISABLED_FOR_BETA" },
      certification: {
        matrix: {
          SPEECH_PHYSICAL_PASS: "PASS",
          HANZI_PHYSICAL_PASS: "PASS",
          CLOUD_SMOKE_PASS: "PASS",
          CLOUD_BETA_REQUIRED_PASS: "PASS",
          ANDROID_OAUTH_PASS: "PASS",
        },
      },
    })
  );
  must(
    "39 fingerprint",
    "FINGERPRINT_DRIFT",
    checkCurriculumBaseline({ fingerprint: "deadbeefdead", lessons: 134, teaching: 113 })
  );
  must(
    "48 lon001 sibling",
    ["ATO", "MURUS_TOUCHED"].join(""),
    checkLon001Sibling(`${lon001SiblingProbe()} sibling`)
  );

  if (!ok) process.exit(1);
  console.log("PASS test:rc2-3-12b-beta-entry");
}

const mode = process.argv[2] ?? "validate";
if (mode === "test") test();
else if (mode === "validate") validate();
else {
  console.error("use validate or test");
  process.exit(2);
}
