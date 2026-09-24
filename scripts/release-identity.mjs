#!/usr/bin/env node
/**
 * RC2.2.10B — imprime/valida a identidade do build.
 *
 *   node scripts/release-identity.mjs web --expect-sha <sha>
 *     Confere dist/version.json (commitSha == HEAD == esperado) e imprime, no
 *     formato de $GITHUB_OUTPUT: artifact=longyu-web-<short>, sha=..., version=...
 *   node scripts/release-identity.mjs android
 *     Imprime a identidade Android que o próximo build terá (versionCode incluso).
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import {
  artifactBaseName,
  assertBuildMatchesRelease,
  buildIdentity,
  computeVersionCode,
  readGitState,
  readVersionFloor,
} from "./lib/release-identity.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const git = readGitState(root);
const mode = process.argv[2];
const expectIndex = process.argv.indexOf("--expect-sha");
const expectedSha = expectIndex > 0 ? process.argv[expectIndex + 1] : "";

try {
  if (mode === "web") {
    const versionJson = JSON.parse(fs.readFileSync(path.join(root, "dist", "version.json"), "utf8"));
    assertBuildMatchesRelease({ headSha: git.sha, bundleSha: versionJson.commitSha, expectedSha });
    const identity = buildIdentity({
      sha: git.sha,
      branch: git.branch,
      version: versionJson.appVersion || pkg.version,
      platform: "web",
      buildType: "release",
      environment: versionJson.environment,
      builtAt: versionJson.builtAt,
    });
    console.log(`artifact=${artifactBaseName(identity)}`);
    console.log(`sha=${identity.sha}`);
    console.log(`version=${identity.version}`);
  } else if (mode === "android") {
    const versionCode = computeVersionCode({ floor: readVersionFloor(root), firstParentCount: git.firstParentCount });
    const identity = buildIdentity({
      sha: git.sha,
      branch: git.branch,
      version: pkg.version,
      versionName: pkg.version,
      versionCode,
      platform: "android",
      buildType: "release",
      environment: "production_beta",
    });
    console.log(JSON.stringify({ ...identity, artifact: artifactBaseName(identity) }, null, 2));
  } else {
    console.error("uso: release-identity.mjs web --expect-sha <sha> | android");
    process.exit(2);
  }
} catch (error) {
  console.error(String(error?.message ?? error));
  process.exit(6);
}
