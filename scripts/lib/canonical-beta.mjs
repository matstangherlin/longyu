/**
 * RC2.3.9 — "does X run in validate:beta?" has one answer.
 *
 * validate:beta is now the canonical runner (scripts/run-canonical-beta-gates.mjs)
 * over scripts/release/canonical-suites.mjs, so older wiring checks that read
 * `scripts["validate:beta"]` as a `&&` string ask this helper instead. It returns
 * every script reachable from a canonical suite in the same `npm run a && npm run b`
 * shape, so `.includes(name)` keeps its exact meaning.
 */
import { expandChain } from "./beta-chain.mjs";
import { SUITES } from "../release/canonical-suites.mjs";

export function canonicalBetaScripts(scripts, suites = SUITES) {
  const names = [];
  const seen = new Set();
  for (const suite of suites) {
    for (const step of suite.steps) {
      if (scripts[step] == null) continue;
      for (const name of Object.keys(expandChain(scripts, step).visits)) {
        if (!seen.has(name)) {
          seen.add(name);
          names.push(name);
        }
      }
    }
  }
  return names;
}

export function canonicalBetaChain(scripts, suites = SUITES) {
  return canonicalBetaScripts(scripts, suites).map((name) => `npm run ${name}`).join(" && ");
}
