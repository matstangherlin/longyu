/**
 * RC2.3.9 — gate:rc2-3-9-stack-convergence checks (pure over an injected runtime).
 *
 * runtime = {
 *   scripts, suites, addedSteps, legacy: { topLevelSteps, uniqueLeaves: string[] },
 *   invariants, retirements, registry: { committed, generated },
 *   productTruth: { committed, inputs, check: (manifest, inputs) => errors[] , generatedBody },
 *   artifacts: [{ path, evidenceDigest, currentDigest }],
 *   stackChain, skips: { occurrences: [{file,line,pattern,snippet}], allowlist: [{file,pattern,snippet,classification}] },
 *   authorities: { accountClients: string[], audioOwners: string[], allowedAccount: string[], allowedAudio: string[] },
 *   routes: { actual: string[], declared: string[] },
 *   jevRuntimeEnabled,
 * }
 */
import { expandChain } from "./beta-chain.mjs";

export const CONVERGENCE_CODES = Object.freeze([
  "SUITE_COVERAGE",
  "LEAF_PARITY",
  "INVARIANT_OWNER_MISSING",
  "INVARIANT_OWNER_CONFLICT",
  "SUPERSEDED_STILL_MANDATORY",
  "RETIRED_WITHOUT_EQUIVALENCE",
  "MUTATION_NOT_CAUGHT",
  "GATE_REGISTRY_STALE",
  "PRODUCT_TRUTH_STALE",
  "PRODUCT_TRUTH_INVALID",
  "REPORT_EVIDENCE_STALE",
  "BROKEN_STACK_PARENT",
  "CONVERGENCE_HIDDEN_SKIP",
  "DUPLICATE_ACCOUNT_AUTHORITY",
  "DUPLICATE_AUDIO_AUTHORITY",
  "UNDECLARED_LEARNER_FEATURE",
  "JEV_RUNTIME_ENABLED",
  "CI_SUITE_COVERAGE",
]);

/** Suites a CI workflow runs: every `--suite <id>` in it. */
export function ciSuites(workflowText) {
  return [...String(workflowText).matchAll(/--suite\s+([a-z0-9-]+)/g)].map((m) => m[1]);
}

/** Patterns that can turn a failing check into a silent pass. */
export const SKIP_PATTERNS = Object.freeze([
  ["test.skip", /\b(?:test|describe|it)(?:\.describe)?\.(?:skip|fixme)\(/],
  ["continue-on-error", /continue-on-error:\s*true/],
  ["|| true", /\|\|\s*true\b/],
  ["|| :", /\|\|\s*:\s*(?:$|[;)"'])/],
]);

export function scanForSkips(files, { exclude = [] } = {}) {
  const out = [];
  for (const [file, text] of Object.entries(files)) {
    if (exclude.some((prefix) => file.startsWith(prefix))) continue;
    for (const [i, line] of String(text).split("\n").entries()) {
      for (const [pattern, re] of SKIP_PATTERNS) {
        if (re.test(line)) out.push({ file, line: i + 1, pattern, snippet: line.trim() });
      }
    }
  }
  return out;
}

function reached(scripts, steps) {
  const names = new Set();
  const leaves = new Set();
  for (const step of steps) {
    if (scripts[step] == null) {
      leaves.add(step);
      continue;
    }
    const { visits, leaves: ls } = expandChain(scripts, step);
    for (const name of Object.keys(visits)) names.add(name);
    for (const leaf of ls) leaves.add(leaf.command);
  }
  return { names, leaves };
}

export function runConvergenceChecks(rt) {
  const errors = [];
  const fail = (code, detail) => errors.push({ code, detail });
  const allSteps = rt.suites.flatMap((suite) => suite.steps);
  const { names: reachedNames, leaves: reachedLeaves } = reached(rt.scripts, allSteps);
  const retiredGates = new Set(rt.retirements.map((r) => r.oldGate));

  // 1. Every legacy step runs in exactly one suite (or is retired with equivalence).
  const seen = new Map();
  for (const suite of rt.suites) {
    for (const step of suite.steps) {
      if (seen.has(step)) fail("SUITE_COVERAGE", `${step} is in suites ${seen.get(step)} and ${suite.id}`);
      seen.set(step, suite.id);
      if (rt.scripts[step] == null && !/\s/.test(step)) fail("SUITE_COVERAGE", `${step} (suite ${suite.id}) is not a package.json script`);
    }
  }
  for (const step of rt.legacy.topLevelSteps) {
    if (!seen.has(step) && !retiredGates.has(step)) fail("SUITE_COVERAGE", `legacy validate:beta step ${step} runs in no canonical suite and was not retired`);
  }
  for (const step of allSteps) {
    if (!rt.legacy.topLevelSteps.includes(step) && !(step in rt.addedSteps)) fail("SUITE_COVERAGE", `${step} is not in the legacy chain and not declared in ADDED_STEPS`);
  }

  // 2. Leaf parity: every legacy leaf command still executes.
  const retiredLeaves = new Set(rt.retirements.flatMap((r) => r.oldLeaves ?? []));
  for (const leaf of rt.legacy.uniqueLeaves) {
    if (!reachedLeaves.has(leaf) && !retiredLeaves.has(leaf)) fail("LEAF_PARITY", `legacy leaf no longer executed: ${leaf}`);
  }

  // 3. Invariant ownership: exactly one canonical owner, and it runs.
  const ownersByInvariant = new Map();
  for (const gate of rt.registry.generated.gates) {
    for (const id of gate.invariants) ownersByInvariant.set(id, [...(ownersByInvariant.get(id) ?? []), gate.gateId]);
  }
  for (const [id, inv] of Object.entries(rt.invariants)) {
    if (!inv.active) continue;
    if (Array.isArray(inv.owner)) {
      fail("INVARIANT_OWNER_CONFLICT", `${id} declares ${inv.owner.length} canonical owners (${inv.owner.join(", ")})`);
      continue;
    }
    if (!inv.owner || rt.scripts[inv.owner] == null || !reachedNames.has(inv.owner)) {
      fail("INVARIANT_OWNER_MISSING", `${id}: owner ${inv.owner ?? "(none)"} is not a script executed by a canonical suite`);
    }
    const owners = ownersByInvariant.get(id) ?? [];
    if (owners.length > 1) fail("INVARIANT_OWNER_CONFLICT", `${id} owned by ${owners.join(" and ")}`);
  }

  // 4. Retirements need equivalence + mutation parity; superseded gates leave the critical path.
  for (const r of rt.retirements) {
    if (!r.newCanonicalGate || !r.equivalenceEvidence || !r.oldInvariant) {
      fail("RETIRED_WITHOUT_EQUIVALENCE", `${r.oldGate} retired without newCanonicalGate/equivalenceEvidence/oldInvariant`);
    } else if (!reachedNames.has(r.newCanonicalGate)) {
      fail("RETIRED_WITHOUT_EQUIVALENCE", `${r.oldGate} → ${r.newCanonicalGate}, which no canonical suite runs`);
    }
    for (const mutation of r.oldMutations ?? []) {
      if (!reachedNames.has(mutation) && !(r.mutationParity?.[mutation] && reachedNames.has(r.mutationParity[mutation]))) {
        fail("MUTATION_NOT_CAUGHT", `${r.oldGate}: old mutation script ${mutation} no longer runs and has no canonical replacement`);
      }
    }
  }
  for (const gate of rt.registry.generated.gates) {
    if (gate.status === "SUPERSEDED" && allSteps.includes(gate.gateId)) {
      const r = rt.retirements.find((x) => x.oldGate === gate.gateId);
      if (!r?.keepRunningReason) fail("SUPERSEDED_STILL_MANDATORY", `${gate.gateId} is SUPERSEDED but still a mandatory suite step`);
    }
  }
  // Every legacy mutation script (test:*) must still run unless its gate was retired with parity.
  for (const step of rt.legacy.topLevelSteps.filter((s) => s.startsWith("test:"))) {
    if (!reachedNames.has(step) && !retiredGates.has(step)) fail("MUTATION_NOT_CAUGHT", `mutation script ${step} no longer runs`);
  }

  // 5. Registry and manifest are generated, never hand-edited.
  if (JSON.stringify(rt.registry.committed) !== JSON.stringify(rt.registry.generated)) {
    fail("GATE_REGISTRY_STALE", "docs/release/gate-registry.json differs from the generated registry");
  }
  const pt = rt.productTruth;
  const stable = (m) => {
    if (!m) return null;
    const { generatedAt, generatedFromSha, inputsDigest, evidenceDigest, evidenceSources, ...rest } = m;
    return JSON.stringify(rest);
  };
  if (!pt.committed || stable(pt.committed) !== JSON.stringify(pt.generatedBody) || pt.committed.inputsDigest !== pt.inputsDigest) {
    fail("PRODUCT_TRUTH_STALE", "docs/release/product-truth.json is not the manifest generated from current evidence");
  }
  for (const e of pt.check(pt.committed ?? {}, pt.inputs)) fail(e.code === "JEV_RUNTIME_ENABLED" ? "JEV_RUNTIME_ENABLED" : "PRODUCT_TRUTH_INVALID", `${e.code}: ${e.detail}`);

  // 6. Evidence freshness: an artifact's digest must match its sources now.
  for (const a of rt.artifacts) {
    if (a.evidenceDigest !== a.currentDigest) fail("REPORT_EVIDENCE_STALE", `${a.path} was generated from older evidence (${a.evidenceDigest} ≠ ${a.currentDigest})`);
  }

  // 7. Stack chain: no cycle, every parent exists.
  const waves = rt.stackChain?.waves ?? [];
  const byNumber = new Map(waves.map((w) => [w.number, w]));
  for (const w of waves) {
    if (w.parentPr != null && !byNumber.has(w.parentPr) && w.parentPr !== "main") fail("BROKEN_STACK_PARENT", `#${w.number} parent #${w.parentPr} is not in the stack chain`);
    const path = new Set([w.number]);
    let cur = w;
    while (cur?.parentPr != null && byNumber.has(cur.parentPr)) {
      if (path.has(cur.parentPr)) {
        fail("BROKEN_STACK_PARENT", `cycle through #${w.number}`);
        break;
      }
      path.add(cur.parentPr);
      cur = byNumber.get(cur.parentPr);
    }
  }

  // 8. No hidden skips.
  const allowed = new Set(rt.skips.allowlist.filter((e) => e.classification === "LEGIT").map((e) => `${e.file}|${e.pattern}|${e.snippet}`));
  for (const o of rt.skips.occurrences) {
    if (!allowed.has(`${o.file}|${o.pattern}|${o.snippet}`)) fail("CONVERGENCE_HIDDEN_SKIP", `${o.file}:${o.line} ${o.pattern} — ${o.snippet}`);
  }

  // 9. One account authority, one audio authority.
  for (const file of rt.authorities.accountClients) {
    if (!rt.authorities.allowedAccount.includes(file)) fail("DUPLICATE_ACCOUNT_AUTHORITY", `${file} creates a Supabase client outside the account authority`);
  }
  for (const file of rt.authorities.audioOwners) {
    if (!rt.authorities.allowedAudio.includes(file)) fail("DUPLICATE_AUDIO_AUTHORITY", `${file} plays audio outside the audio authority`);
  }

  // 10. No learner feature without a wave declaration.
  const declared = new Set(rt.routes.declared);
  for (const route of rt.routes.actual) {
    if (!declared.has(route)) fail("UNDECLARED_LEARNER_FEATURE", `route "${route}" is not declared in docs/release/learner-surfaces.json`);
  }

  // 11. CI runs every canonical suite exactly once.
  const inCi = ciSuites(rt.ciWorkflow ?? "");
  for (const suite of rt.suites) {
    const n = inCi.filter((id) => id === suite.id).length;
    if (n !== 1) fail("CI_SUITE_COVERAGE", `suite ${suite.id} runs ${n}× in .github/workflows/ci.yml (must be exactly once)`);
  }
  for (const id of inCi) if (!rt.suites.some((s) => s.id === id)) fail("CI_SUITE_COVERAGE", `ci.yml runs unknown suite ${id}`);

  if (rt.jevRuntimeEnabled !== false) fail("JEV_RUNTIME_ENABLED", "JEV_RUNTIME_ENABLED must stay false");
  return errors;
}
