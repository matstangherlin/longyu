/**
 * Valida se uma release beta está pronta para deploy.
 * Uso: npm run release:check
 */

import process from "node:process";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolveBuildMeta, resolveCommitSha, readPackageVersion } from "./lib/build-meta.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];

function run(label, command, args) {
  console.log(`\n== ${label} ==`);
  const result = spawnSync(command, args, { cwd: root, stdio: "inherit", shell: process.platform === "win32" });
  if ((result.status ?? 1) !== 0) errors.push(label);
}

const version = readPackageVersion();
const changelog = readFileSync(path.join(root, "CHANGELOG.md"), "utf8");
const releaseNotes = readFileSync(path.join(root, "src/data/releaseNotes.ts"), "utf8");

if (!new RegExp(`## ${version.replace(/\./g, "\\.")}`).test(changelog)) {
  errors.push(`CHANGELOG.md sem seção para versão ${version}`);
}

if (!releaseNotes.includes(`version: "${version}"`)) {
  errors.push(`src/data/releaseNotes.ts sem entrada para versão ${version}`);
}

const sha = resolveCommitSha();
if (!sha || sha === "unknown") {
  errors.push("commit SHA indisponível (git rev-parse falhou)");
}

console.log("== release:check ==");
console.log(`Versão: ${version}`);
console.log(`SHA: ${sha}`);
console.log(`Canal: ${resolveBuildMeta().VITE_RELEASE_CHANNEL}`);

run("validate:beta", "npm", ["run", "validate:beta"]);
run("build", "npm", ["run", "build"]);

const bundlePath = path.join(root, "dist/assets");
if (!existsSync(bundlePath)) {
  errors.push("dist/assets ausente após build");
} else {
  const jsFiles = readFileSync(
    path.join(root, "dist/index.html"),
    "utf8"
  );
  if (!jsFiles.includes("assets/")) errors.push("index.html sem referência a assets");
  const assetFile = jsFiles.match(/assets\/index-[^"]+\.js/)?.[0];
  if (assetFile) {
    const js = readFileSync(path.join(root, "dist", assetFile), "utf8");
    if (!js.includes(version)) {
      errors.push(`bundle JS não contém versão ${version}`);
    }
  } else {
    errors.push("não foi possível localizar bundle JS principal");
  }
}

console.log("");
if (errors.length > 0) {
  console.error("ERRO: release:check falhou:");
  for (const message of errors) console.error(`  - ${message}`);
  process.exit(1);
}

console.log("OK: release:check passou — release pronta para deploy.");
