#!/usr/bin/env node
/**
 * RC2.2 — gate:rc2-candidate-infra (P38).
 *
 * Exige que exista a INFRAESTRUTURA do candidate: contrato de ambiente,
 * guard de build, topologia de deploy, identidade de deploy e manifestos
 * honestos. Não exige que o candidate já esteja publicado — isso é o gate de
 * identidade (verify:rc2-candidate-identity), que roda contra a URL real.
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { validateCandidateInfra } from "./lib/rc2-candidate-infra-gate.mjs";
import { loadRc2CandidateManifest } from "./lib/rc2-content-freeze.mjs";

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
const readJson = (rel) => JSON.parse(read(rel));

const { failures } = validateCandidateInfra({
  appEnvironmentSrc: read("src/lib/appEnvironment.ts"),
  assertNetlifySrc: read("scripts/assert-netlify-env.mjs"),
  netlifyToml: read("netlify.toml"),
  viteBuildSrc: read("scripts/vite-build.mjs"),
  candidateManifest: loadRc2CandidateManifest(root) ?? {},
  publicBetaCore: readJson("docs/release/public-beta-core.json"),
  operationalChecks: readJson("docs/release/rc1-operational-checks.json"),
});

if (failures.length > 0) {
  console.error("FAIL validate:rc2-candidate-infra");
  console.error(JSON.stringify(failures, null, 2));
  process.exit(1);
}

const candidate = loadRc2CandidateManifest(root) ?? {};
console.log(`PASS validate:rc2-candidate-infra — contrato do candidate presente (status ${candidate.status}).`);
