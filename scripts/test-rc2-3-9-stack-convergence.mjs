#!/usr/bin/env node
/**
 * RC2.3.9 — gate:rc2-3-9-stack-convergence (mutation half). Every mutation breaks
 * one thing in a copy of the REAL runtime; the checks must name it.
 */
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { runConvergenceChecks, scanForSkips } from "./lib/stack-convergence-gates.mjs";
import { loadConvergenceRuntime } from "./release/convergence-runtime.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const base = loadConvergenceRuntime(root);
const clone = (rt) => ({ ...structuredClone({ ...rt, productTruth: { ...rt.productTruth, check: null } }), productTruth: { ...structuredClone({ ...rt.productTruth, check: null }), check: rt.productTruth.check } });

const baseline = runConvergenceChecks(base);
if (baseline.length) {
  for (const e of baseline) console.error(`BASELINE ${e.code}: ${e.detail}`);
  console.error("test:rc2-3-9-stack-convergence — the real repo must pass before mutations mean anything");
  process.exit(1);
}

const firstSuiteStep = (rt, predicate) => rt.suites.flatMap((s) => s.steps).find(predicate);
const removeStep = (rt, step) => {
  for (const s of rt.suites) s.steps = s.steps.filter((x) => x !== step);
};

/** [label, expected code, detail regex, mutate(rt)] */
const MUTATIONS = [
  ["1. active invariant without owner", "INVARIANT_OWNER_MISSING", /TEACH_BEFORE_TEST/, (rt) => { rt.invariants.TEACH_BEFORE_TEST.owner = "validate:does-not-exist"; }],
  ["2. two canonical owners for one invariant", "INVARIANT_OWNER_CONFLICT", /ACCOUNT_ISOLATION/, (rt) => { rt.registry.generated.gates.find((g) => g.gateId === "test:cloud-first-auth").invariants.push("ACCOUNT_ISOLATION"); }],
  ["3. superseded gate still mandatory", "SUPERSEDED_STILL_MANDATORY", /gate:rc2-2-12-android-release-readiness/, (rt) => {
    rt.registry.generated.gates.find((g) => g.gateId === "gate:rc2-2-12-android-release-readiness").status = "SUPERSEDED";
    rt.retirements.push({ oldGate: "gate:rc2-2-12-android-release-readiness", oldInvariant: "ANDROID_NATIVE_CONTRACT", newCanonicalGate: "gate:android-native-foundation", equivalenceEvidence: "x" });
  }],
  ["4. old gate retired without equivalence", "RETIRED_WITHOUT_EQUIVALENCE", /validate:culture-memory/, (rt) => {
    removeStep(rt, "validate:culture-memory");
    rt.retirements.push({ oldGate: "validate:culture-memory", oldLeaves: ["node scripts/validate-culture-memory.mjs"] });
  }],
  ["5. old mutation no longer caught", "MUTATION_NOT_CAUGHT", /test:culture-memory/, (rt) => {
    removeStep(rt, "test:culture-memory");
    removeStep(rt, "validate:culture-memory");
    rt.retirements.push({ oldGate: "validate:culture-memory", oldInvariant: "CULTURE_CONTENT_TRUTH", newCanonicalGate: "gate:rc2-3-3-culture-deep", equivalenceEvidence: "claimed", oldLeaves: ["node scripts/validate-culture-memory.mjs", "node scripts/test-culture-memory.mjs"], oldMutations: ["test:culture-memory"] });
  }],
  ["6. product truth stale", "PRODUCT_TRUTH_STALE", /product-truth/, (rt) => { rt.productTruth.committed.product.lessons += 1; }],
  ["7. Google CONFIG_REQUIRED reported PASS", "PRODUCT_TRUTH_INVALID", /FALSE_PASS.*google/, (rt) => { rt.productTruth.committed.identity.providers.google.status = "PASS"; }],
  ["8. owner physical NOT_RUN reported PASS", "PRODUCT_TRUTH_INVALID", /FALSE_PASS.*ownerAcceptance\.audio/, (rt) => { rt.productTruth.committed.ownerAcceptance.audio = "PASS"; }],
  ["9. APK NOT_RUN reported PASS", "PRODUCT_TRUTH_INVALID", /FALSE_PASS.*release\.APK/, (rt) => { rt.productTruth.committed.release.APK = "PASS"; }],
  ["10. Jev learner runtime enabled", "JEV_RUNTIME_ENABLED", /JEV_RUNTIME_ENABLED/, (rt) => { rt.jevRuntimeEnabled = true; rt.productTruth.inputs.jevRuntimeEnabled = true; }],
  ["11. unknown fingerprint accepted", "PRODUCT_TRUTH_INVALID", /UNKNOWN_FINGERPRINT/, (rt) => { rt.productTruth.inputs.identity.chainHead = "000000000000"; }],
  ["12. broken stack parent accepted", "BROKEN_STACK_PARENT", /#31\d parent #999/, (rt) => { rt.stackChain.waves.find((w) => w.number === 317).parentPr = 999; }],
  ["13. report from older evidence accepted as fresh", "REPORT_EVIDENCE_STALE", /product-truth\.json/, (rt) => { rt.artifacts[0].evidenceDigest = "0000000000000000"; }],
  ["14. hidden .skip", "CONVERGENCE_HIDDEN_SKIP", /e2e\/rc2-3-8-auth-identity\.spec\.ts/, (rt) => { rt.skips.occurrences.push(...scanForSkips({ "e2e/rc2-3-8-auth-identity.spec.ts": 'test.skip("callback from a crafted URL never navigates off-app", async () => {});' })); }],
  ["15. continue-on-error on a release gate", "CONVERGENCE_HIDDEN_SKIP", /continue-on-error/, (rt) => { rt.skips.occurrences.push(...scanForSkips({ ".github/workflows/ci.yml": "      - name: Validate beta\n        continue-on-error: true\n        run: npm run validate:beta" })); }],
  ["16. cloud certification PASS before RC2.3.10", "PRODUCT_TRUTH_INVALID", /FALSE_PASS.*cloud\.certification/, (rt) => { rt.productTruth.committed.cloud.certification = "PASS"; }],
  ["17. monetization PASS before the decision", "PRODUCT_TRUTH_INVALID", /FALSE_PASS.*release\.MONETIZATION/, (rt) => { rt.productTruth.committed.release.MONETIZATION = "PASS"; }],
  ["18. duplicate account authority", "DUPLICATE_ACCOUNT_AUTHORITY", /src\/lib\/secondAuth\.ts/, (rt) => { rt.authorities.accountClients.push("src/lib/secondAuth.ts"); }],
  ["19. duplicate audio authority", "DUPLICATE_AUDIO_AUTHORITY", /src\/features\/lesson\/NewVoice\.tsx/, (rt) => { rt.authorities.audioOwners.push("src/features/lesson/NewVoice.tsx"); }],
  ["20. learner feature without wave declaration", "UNDECLARED_LEARNER_FEATURE", /arcade\/novo-jogo/, (rt) => { rt.routes.actual.push("arcade/novo-jogo"); }],
  // Parity extras.
  ["21. legacy step silently dropped", "SUITE_COVERAGE", /validate:culture-collections/, (rt) => { removeStep(rt, "validate:culture-collections"); }],
  ["22. nested leaf lost inside a gate", "LEAF_PARITY", /hanzi-writing-pointer/, (rt) => {
    rt.scripts["gate:rc2-3-4-hanzi-writing"] = rt.scripts["gate:rc2-3-4-hanzi-writing"].replace(" && npm run test:hanzi-writing-pointer", "");
  }],
  ["24. suite dropped from the CI matrix", "CI_SUITE_COVERAGE", /android-runtime/, (rt) => { rt.ciWorkflow = rt.ciWorkflow.replace("--suite android-runtime", ""); }],
  ["23. registry hand-edited", "GATE_REGISTRY_STALE", /gate-registry/, (rt) => { rt.registry.committed.counts.CANONICAL += 1; }],
];

let killed = 0;
for (const [label, code, detail, mutate] of MUTATIONS) {
  const rt = clone(base);
  mutate(rt);
  const errors = runConvergenceChecks(rt);
  const hit = errors.some((e) => e.code === code && detail.test(`${e.code} ${e.detail}`));
  if (hit) {
    killed += 1;
    console.log(`KILLED ${label}: ${code}`);
  } else {
    console.error(`SURVIVED ${label}: expected ${code} ${detail} — got ${errors.map((e) => e.code).join(", ") || "nothing"}`);
  }
}
if (killed !== MUTATIONS.length) {
  console.error(`test:rc2-3-9-stack-convergence — ${MUTATIONS.length - killed} mutation(s) survived`);
  process.exit(1);
}
console.log(`PASS test:rc2-3-9-stack-convergence (${killed}/${MUTATIONS.length} mutations killed)`);
