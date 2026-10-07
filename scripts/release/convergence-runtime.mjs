/** RC2.3.9 — builds the real runtime for gate:rc2-3-9-stack-convergence from the repo. */
import fs from "node:fs";
import path from "node:path";
import { dedupeLeaves, expandChain } from "../lib/beta-chain.mjs";
import { buildGateRegistry } from "../lib/gate-registry.mjs";
import { buildProductTruth, checkProductTruth, digestInputs } from "../lib/product-truth.mjs";
import { scanForSkips } from "../lib/stack-convergence-gates.mjs";
import { ADDED_STEPS, SUITES } from "./canonical-suites.mjs";
import { GATE_REGISTRY_SOURCES, digestFiles } from "./evidence-digest.mjs";
import { PRODUCT_TRUTH_PATH, PRODUCT_TRUTH_SOURCES, loadProductTruthInputs } from "./product-truth-inputs.mjs";

/** Files whose code may create a Supabase client / play audio (RC2.3.9 audit). */
export const ACCOUNT_AUTHORITY = ["src/lib/supabaseClient.ts", "src/services/oauthService.ts"];
export const AUDIO_AUTHORITY = ["src/lib/audio/canonicalPlayer.ts", "src/lib/soundFx.ts", "src/features/lesson/SelfComparePractice.tsx"];
const SKIP_SCAN_EXCLUDE = ["scripts/lib/stack-convergence-gates.mjs", "scripts/test-rc2-3-9-stack-convergence.mjs"];

function walk(root, dir, test, out = []) {
  const abs = path.join(root, dir);
  if (!fs.existsSync(abs)) return out;
  for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
    const rel = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules") continue;
      walk(root, rel, test, out);
    } else if (test(rel)) out.push(rel);
  }
  return out;
}

const readJson = (root, rel, fallback) => (fs.existsSync(path.join(root, rel)) ? JSON.parse(fs.readFileSync(path.join(root, rel), "utf8")) : fallback);

export function loadConvergenceRuntime(root) {
  const pkg = readJson(root, "package.json", {});
  const scripts = pkg.scripts ?? {};
  const legacySnapshot = readJson(root, "docs/release/validate-beta-legacy.json", { topLevelSteps: [] });
  // Legacy leaves are re-expanded from the frozen command string against TODAY's scripts:
  // a nested script that silently lost a step would drop a leaf and fail LEAF_PARITY.
  const legacyScripts = { ...scripts, "validate:beta": legacySnapshot.legacyCommand ?? "" };
  const uniqueLeaves = dedupeLeaves(expandChain(legacyScripts, "validate:beta").leaves).unique.map((l) => l.command);

  const invariants = readJson(root, "docs/release/invariant-ownership.json", { invariants: {} }).invariants;
  const retirements = readJson(root, "docs/release/gate-retirements.json", { retirements: [] }).retirements;
  const timingRows = readJson(root, "docs/release/beta-baseline-timing.json", { leaves: [] }).leaves ?? [];
  const generatedRegistry = buildGateRegistry({
    scripts,
    suites: SUITES,
    invariants,
    retirements,
    timings: Object.fromEntries(timingRows.map((row) => [row.command, row.ms])),
  });
  generatedRegistry.evidenceDigest = digestFiles(root, GATE_REGISTRY_SOURCES);
  const committedRegistry = readJson(root, "docs/release/gate-registry.json", null);

  const inputs = loadProductTruthInputs(root);
  const committedTruth = readJson(root, PRODUCT_TRUTH_PATH, null);

  const files = {};
  for (const rel of [
    ...walk(root, "e2e", (f) => f.endsWith(".ts")),
    ...walk(root, "scripts", (f) => f.endsWith(".mjs")),
    ...walk(root, ".github/workflows", (f) => /\.ya?ml$/.test(f)),
  ]) {
    files[rel] = fs.readFileSync(path.join(root, rel), "utf8");
  }
  files["package.json"] = Object.entries(scripts).map(([k, v]) => `"${k}": ${JSON.stringify(v)},`).join("\n");

  const srcFiles = walk(root, "src", (f) => /\.(ts|tsx)$/.test(f));
  const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
  const accountClients = srcFiles.filter((rel) => /\bcreateClient\(/.test(read(rel)));
  const audioOwners = srcFiles.filter((rel) => /new Audio\(|speechSynthesis\.speak\(|new (?:window\.)?AudioContext\(|new webkitAudioContext\(/.test(read(rel)));
  const routesSrc = read("src/routes.tsx");

  return {
    scripts,
    suites: SUITES,
    addedSteps: ADDED_STEPS,
    legacy: { topLevelSteps: legacySnapshot.topLevelSteps, uniqueLeaves },
    invariants,
    retirements,
    registry: { committed: committedRegistry, generated: generatedRegistry },
    productTruth: {
      committed: committedTruth,
      inputs,
      inputsDigest: digestInputs(inputs),
      generatedBody: buildProductTruth(inputs),
      check: checkProductTruth,
    },
    artifacts: [
      { path: PRODUCT_TRUTH_PATH, evidenceDigest: committedTruth?.evidenceDigest ?? null, currentDigest: digestFiles(root, PRODUCT_TRUTH_SOURCES) },
      { path: "docs/release/gate-registry.json", evidenceDigest: committedRegistry?.evidenceDigest ?? null, currentDigest: digestFiles(root, GATE_REGISTRY_SOURCES) },
    ],
    stackChain: readJson(root, "docs/release/rc2-stack-chain.json", { waves: [] }),
    skips: { occurrences: scanForSkips(files, { exclude: SKIP_SCAN_EXCLUDE }), allowlist: readJson(root, "docs/release/skip-allowlist.json", { entries: [] }).entries },
    authorities: { accountClients, audioOwners, allowedAccount: ACCOUNT_AUTHORITY, allowedAudio: AUDIO_AUTHORITY },
    routes: {
      actual: [...routesSrc.matchAll(/path: "([^"]+)"/g)].map((m) => m[1]),
      declared: readJson(root, "docs/release/learner-surfaces.json", { routes: [] }).routes.map((r) => r.path),
    },
    ciWorkflow: fs.readFileSync(path.join(root, ".github/workflows/ci.yml"), "utf8"),
    jevRuntimeEnabled: inputs.jevRuntimeEnabled,
  };
}
