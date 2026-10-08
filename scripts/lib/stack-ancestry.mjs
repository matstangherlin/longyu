/**
 * Ancestry for stacked waves that have already landed on main.
 *
 * RC2.2.20–RC2.2.31D landed on main as the squash commit of #308. A squash
 * drops the stack's own commits from main's history, so a wave's stacked base
 * SHA is no longer an ancestor of a main HEAD even though the wave is there.
 * A HEAD carries the wave when it descends from the stacked base (the PR
 * branch) or from the commit that landed the wave on main.
 */
import { execFileSync } from "node:child_process";

export const RC2_2_STACK_LANDED_SHA = "d6339330df5e19dddc8a8977015fc7cc8bb5620d";

function isAncestor(root, sha) {
  try {
    execFileSync("git", ["merge-base", "--is-ancestor", sha, "HEAD"], { cwd: root, stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

/** @returns {boolean} HEAD descends from `baseSha` or from the #308 landing commit. */
export function headCarriesStackedWave(root, baseSha) {
  return isAncestor(root, baseSha) || isAncestor(root, RC2_2_STACK_LANDED_SHA);
}
