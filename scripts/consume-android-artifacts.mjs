#!/usr/bin/env node
/**
 * RC2.3.12C — download hosted Android debug APK/AAB for an RC SHA and certify.
 *
 *   GH_TOKEN (gh auth) · node scripts/consume-android-artifacts.mjs [--sha <sha>] [--run <id>]
 *
 * Writes:
 *   docs/release/rc-artifacts.json
 *   updates docs/release/rc-candidate.json apk/aab hashes (status BUILT only — not BETA_READY)
 */
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const arg = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : null;
};

function gh(argv) {
  return execFileSync("gh", argv, { cwd: root, encoding: "utf8", maxBuffer: 20 * 1024 * 1024 });
}

function sha256File(file) {
  return createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

const sha = arg("--sha") || execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
let runId = arg("--run");

if (!runId) {
  const runs = JSON.parse(
    gh([
      "run",
      "list",
      "--workflow",
      "android-build.yml",
      "--limit",
      "20",
      "--json",
      "databaseId,conclusion,status,headSha,url",
    ])
  );
  const hit = runs.find((r) => r.headSha === sha && r.conclusion === "success");
  if (!hit) {
    console.error(`FAIL: no successful Android build for ${sha.slice(0, 12)}`);
    console.error(
      "latest:",
      runs
        .slice(0, 5)
        .map((r) => `${r.headSha.slice(0, 7)} ${r.status}/${r.conclusion}`)
        .join(" · ")
    );
    process.exit(2);
  }
  runId = String(hit.databaseId);
  console.log(`using Android run ${runId} · ${hit.url}`);
}

const outDir = path.join(root, "tmp/rc-artifacts", sha.slice(0, 12));
fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

gh(["run", "download", runId, "-D", outDir]);

function walk(dir) {
  const out = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

const files = walk(outDir);
const apk = files.find((f) => f.endsWith(".apk"));
const aab = files.find((f) => f.endsWith(".aab"));
const provenance = files.find((f) => f.endsWith(".provenance.json"));

if (!apk || !aab) {
  console.error("FAIL: APK/AAB missing in downloaded artifacts");
  console.error(files.map((f) => path.relative(outDir, f)).join("\n"));
  process.exit(1);
}

const apkHash = sha256File(apk);
const aabHash = sha256File(aab);
let provenanceJson = null;
if (provenance) provenanceJson = JSON.parse(fs.readFileSync(provenance, "utf8"));

const candidatePath = path.join(root, "docs/release/rc-candidate.json");
const candidate = JSON.parse(fs.readFileSync(candidatePath, "utf8"));
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));

const artifacts = {
  schema: "longyu-rc-artifacts/1",
  rcId: candidate.rcId,
  sourceSha: sha,
  consumedAt: new Date().toISOString(),
  androidRunId: runId,
  version: pkg.version,
  versionCode: candidate.versionCode,
  fingerprint: candidate.fingerprint,
  channel: "dev-debug",
  note: "Hosted debug APK/AAB from android-build.yml. Signed release remains BLOCKED_SIGNING_SECRETS. VITE_DEVICE_QA=true on this diagnostic channel — not the production learner channel.",
  apk: {
    file: path.relative(root, apk),
    sha256: apkHash,
    bytes: fs.statSync(apk).size,
    gitSha: provenanceJson?.sha ?? sha,
    status: "BUILT",
  },
  aab: {
    file: path.relative(root, aab),
    sha256: aabHash,
    bytes: fs.statSync(aab).size,
    gitSha: provenanceJson?.sha ?? sha,
    status: "BUILT",
  },
  provenance: provenanceJson,
};

const artPath = path.join(root, "docs/release/rc-artifacts.json");
fs.writeFileSync(artPath, JSON.stringify(artifacts, null, 2) + "\n");

candidate.gitSha = sha;
candidate.apkArtifact = {
  status: "BUILT",
  sha256: apkHash,
  gitSha: sha,
  channel: "dev-debug",
  runId,
  note: "debug diagnostic APK (VITE_DEVICE_QA); not Play release",
};
candidate.aabArtifact = {
  status: "BUILT",
  sha256: aabHash,
  gitSha: sha,
  channel: "dev-debug",
  runId,
  note: "debug diagnostic AAB; signed release BLOCKED_SIGNING_SECRETS",
};
if (candidate.status === "NOT_BUILT") candidate.status = "BUILT";
fs.writeFileSync(candidatePath, JSON.stringify(candidate, null, 2) + "\n");

console.log(`PASS consume-android-artifacts · apk ${apkHash.slice(0, 12)}… · aab ${aabHash.slice(0, 12)}… · status=${candidate.status}`);
console.log(`owner install: ${path.relative(root, apk)}`);
