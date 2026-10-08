/**
 * RC2.3.9 — Stack Convergence: the validate:beta call graph as data.
 *
 * `expandChain` walks `npm run …` references recursively and returns every leaf
 * command in execution order, with the path of scripts that led to it. The
 * canonical runner and the convergence gate both use this, so "what runs" has
 * exactly one definition.
 */

const NPM_RUN = /^npm run (?:-s |--silent )?([^\s]+)\s*$/;

/** Split a package.json script into its `&&` steps (the only separator the chain uses). */
export function splitSteps(command) {
  return String(command)
    .split("&&")
    .map((part) => part.trim())
    .filter(Boolean);
}

/**
 * @returns {{ leaves: Array<{ command: string, via: string[] }>, visits: Record<string, number>, missing: string[] }}
 */
export function expandChain(scripts, entry) {
  const leaves = [];
  const visits = {};
  const missing = [];
  const walk = (name, via) => {
    if (via.includes(name)) throw new Error(`CHAIN_CYCLE: ${[...via, name].join(" → ")}`);
    visits[name] = (visits[name] ?? 0) + 1;
    const command = scripts[name];
    if (command == null) {
      missing.push(name);
      return;
    }
    for (const step of splitSteps(command)) {
      const match = step.match(NPM_RUN);
      if (match) walk(match[1], [...via, name]);
      else leaves.push({ command: step, via: [...via, name] });
    }
  };
  walk(entry, []);
  return { leaves, visits, missing };
}

/** First occurrence wins; later identical commands are recorded as deduplicated. */
export function dedupeLeaves(leaves) {
  const seen = new Map();
  const unique = [];
  const duplicates = [];
  for (const leaf of leaves) {
    if (seen.has(leaf.command)) {
      duplicates.push({ ...leaf, firstVia: seen.get(leaf.command).via });
      continue;
    }
    seen.set(leaf.command, leaf);
    unique.push(leaf);
  }
  return { unique, duplicates };
}

/** Top-level steps of a chain entry (the names `validate:beta` lists directly). */
export function topLevelSteps(scripts, entry) {
  return splitSteps(scripts[entry] ?? "").map((step) => {
    const match = step.match(NPM_RUN);
    return match ? match[1] : step;
  });
}
