/**
 * RC2.3.9 — Canonical Gate Registry (docs/release/gate-registry.json), derived
 * from package.json + canonical suites + invariant ownership + retirements.
 * Pure: the generator writes it, the convergence gate rebuilds and diffs it.
 */
import { expandChain } from "./beta-chain.mjs";

export const GATE_STATUSES = Object.freeze(["CANONICAL", "HISTORICAL", "SUPERSEDED", "DUPLICATE", "EVIDENCE_ONLY", "OWNER_PHYSICAL", "CLOUD_ONLY"]);
const GATE_PREFIX = /^(gate|validate|test|audit|verify):/;
/** Entry points that orchestrate the canonical suites (not suite steps themselves). */
export const ROOT_GATES = new Set(["validate:beta", "gate:launch-stack"]);

/** Wave that introduced a script, from the script file it runs (rc2-2-28-…, v491-…, rc230-…). */
export function introducedBy(command) {
  const file = String(command).match(/scripts\/([^\s]+)\.mjs/)?.[1] ?? "";
  let m = file.match(/rc2-(\d)-(\d+[a-z]?)/i);
  if (m) return `RC2.${m[1]}.${m[2].toUpperCase()}`;
  m = file.match(/(?:^|[-/])rc2(\d)(\d+[a-z]?)(?:-|$)/i);
  if (m) return `RC2.${m[1]}.${m[2].toUpperCase()}`;
  m = file.match(/(?:^|[-/])rc(\d)(\d)(?:-|$)/i);
  if (m) return `RC${m[1]}.${m[2]}`;
  m = file.match(/(?:^|[-/])v410([a-z]\d?)?(?:-|$)/i);
  if (m) return `V4.10${m[1] ? m[1].toUpperCase() : ""}`;
  m = file.match(/(?:^|[-/])v(\d)(\d)(\d)?([a-z]\d?)?(?:-|$)/i);
  if (m) return `V${m[1]}.${m[2]}${m[3] ? `.${m[3]}` : ""}${m[4] ? m[4].toUpperCase() : ""}`;
  return "PRE_RC2";
}

function waveRank(wave) {
  const m = wave.match(/^RC2\.(\d)\.(\d+)/);
  return m ? Number(m[1]) * 1000 + Number(m[2]) : 0;
}

/**
 * @param {{ scripts: Record<string,string>, suites: {id:string, steps:string[]}[], invariants: Record<string, any>, retirements: any[], timings: Record<string, number> }} input
 */
export function buildGateRegistry({ scripts, suites, invariants, retirements, timings }) {
  const suiteOf = new Map();
  for (const suite of suites) for (const step of suite.steps) suiteOf.set(step, suite.id);
  // Everything reachable from a canonical suite step runs in that suite.
  const reachedIn = new Map();
  for (const suite of suites) {
    for (const step of suite.steps) {
      if (scripts[step] == null) continue;
      const { visits } = expandChain(scripts, step);
      for (const name of Object.keys(visits)) if (!reachedIn.has(name)) reachedIn.set(name, suite.id);
    }
  }
  const ownerOf = new Map();
  const supports = new Map();
  for (const [id, inv] of Object.entries(invariants)) {
    if (!inv.active) continue;
    ownerOf.set(inv.owner, [...(ownerOf.get(inv.owner) ?? []), id]);
    for (const gate of inv.secondaryEvidence ?? []) supports.set(gate, [...(supports.get(gate) ?? []), id]);
  }
  const retired = new Map(retirements.map((r) => [r.oldGate, r]));
  const allLeaves = new Set(suites.flatMap((s) => s.steps).filter((s) => scripts[s] != null).flatMap((s) => expandChain(scripts, s).leaves.map((l) => l.command)));

  const gates = [];
  for (const name of Object.keys(scripts).filter((n) => GATE_PREFIX.test(n)).sort()) {
    const command = scripts[name];
    let leaves = [];
    try {
      leaves = expandChain(scripts, name).leaves.map((l) => l.command);
    } catch {
      leaves = [command];
    }
    const wave = introducedBy(leaves.find((l) => /scripts\//.test(l)) ?? command);
    const phase = reachedIn.get(name) ?? null;
    const requiresNetwork = leaves.some((l) => /verify-production|verify-leagues|deploy|seed-test|supabase (db|functions)|curl |--live|hosted/.test(l));
    const requiresDevice = leaves.some((l) => /adb |android-device|emulator|connectedDebugAndroidTest/.test(l));
    const runsBrowser = leaves.some((l) => /playwright|vite-build/.test(l));
    let status;
    const root = ROOT_GATES.has(name);
    if (root) status = "CANONICAL";
    else if (retired.has(name)) status = "SUPERSEDED";
    else if (ownerOf.has(name)) status = "CANONICAL";
    else if (phase) status = name.startsWith("gate:") && waveRank(wave) > 0 && waveRank(wave) < 2030 ? "HISTORICAL" : "CANONICAL";
    else if (requiresDevice) status = "OWNER_PHYSICAL";
    else if (requiresNetwork) status = "CLOUD_ONLY";
    else if (leaves.length && leaves.every((l) => allLeaves.has(l))) status = "DUPLICATE";
    else status = "EVIDENCE_ONLY";
    const mutation = name.replace(/^(validate|gate):/, "test:");
    gates.push({
      gateId: name,
      status,
      domain: phase ?? "none",
      introducedBy: wave,
      script: command,
      invariants: ownerOf.get(name) ?? [],
      supportsInvariants: supports.get(name) ?? [],
      mutationCoverage: name.startsWith("test:") ? "self" : scripts[mutation] && mutation !== name ? mutation : leaves.some((l) => /scripts\/test-/.test(l)) ? "nested" : "none",
      criticality: phase || root ? "BLOCK_RELEASE" : "NON_BLOCKING",
      executionPhase: root ? "root" : phase ? `suite:${phase}` : retired.has(name) ? "retired" : runsBrowser ? "release-composite" : "not-executed",
      supersededBy: retired.get(name)?.newCanonicalGate ?? null,
      estimatedRuntimeMs: leaves.reduce((sum, l) => sum + (timings[l] ?? 0), 0) || null,
      requiresNetwork,
      requiresDevice,
      requiresOwner: requiresDevice,
      canonicalOwner: ownerOf.has(name) ? name : (supports.get(name) ?? []).map((id) => invariants[id].owner)[0] ?? (phase ? `suite:${phase}` : null),
    });
  }
  const counts = Object.fromEntries(GATE_STATUSES.map((s) => [s, gates.filter((g) => g.status === s).length]));
  return { schemaVersion: 1, registryVersion: "RC2.3.9", counts, total: gates.length, gates };
}
