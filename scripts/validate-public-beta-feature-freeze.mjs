/**
 * validate:public-beta-feature-freeze — FEATURE_FREEZE=PUBLIC_BETA + frozen metrics.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import ts from "typescript";
import { journeyFingerprint } from "./lib/report-meta.mjs";

const require = createRequire(import.meta.url);
require.extensions[".ts"] = (module, filename) =>
  module._compile(
    ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
        esModuleInterop: true,
      },
    }).outputText,
    filename
  );

const root = process.cwd();
const freeze = require("../src/lib/curriculumFreeze.ts");
const beta = require("../src/lib/publicBetaCore.ts");
const { CULTURE_ITEMS } = require("../src/data/culture.ts");
const { CULTURE_NATIVE_LESSONS } = require("../src/data/cultureLessons.ts");
const { CULTURE_JOURNEY_PLACEMENT } = require("../src/data/cultureNative.ts");
const { ALL_LESSONS } = require("../src/data/journey.ts");

assert.equal(freeze.FEATURE_FREEZE, "PUBLIC_BETA");
assert.equal(beta.FEATURE_FREEZE, "PUBLIC_BETA");
assert.equal(freeze.CURRICULUM_FREEZE, "RC2_CONTENT_FREEZE");

const fp = journeyFingerprint(root);
assert.equal(fp, "a2ed1a0c1c6d", `fingerprint drift: ${fp}`);
assert.equal(freeze.RC_BASE_FINGERPRINT, fp);

const teaching = ALL_LESSONS.filter((l) => !l.isReview && !l.reviewMasteryMode).length;
assert.equal(ALL_LESSONS.length, 134);
assert.equal(teaching, 113);
assert.equal(CULTURE_ITEMS.length, 30);
assert.equal(CULTURE_NATIVE_LESSONS.length, 30);
assert.equal(CULTURE_JOURNEY_PLACEMENT.length, 20);

const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const deps = { ...pkg.dependencies, ...pkg.devDependencies };
assert.ok(!deps["framer-motion"]);
assert.ok(!deps.gsap);

const manifest = JSON.parse(
  fs.readFileSync(path.join(root, "docs/release/public-beta-core.json"), "utf8")
);
assert.equal(manifest.featureFreeze, "PUBLIC_BETA");
assert.equal(manifest.fingerprint, "a2ed1a0c1c6d");

console.log(
  `PASS validate:public-beta-feature-freeze — FEATURE_FREEZE=${freeze.FEATURE_FREEZE} · fp ${fp}`
);
