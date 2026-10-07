/**
 * RC2.3.4A — production deploys only for explicit release candidates.
 *
 * Netlify Free: each production deploy costs credits from a hard monthly
 * pool (see docs/launch/platform-budget-registry.json); deploy previews and
 * branch deploys do not. A merge to main therefore does NOT publish unless
 * the commit is marked as a release, or the owner forces it for one build.
 */
export const RELEASE_MARKERS = [/\[release\]/i, /\[deploy\]/i];

/** @returns {{ build: boolean, reason: string }} */
export function netlifyBuildDecision({ context, commitMessage, force }) {
  if (context !== "production") return { build: true, reason: `context ${context || "unknown"} is free` };
  if (force === "1" || force === "true") return { build: true, reason: "LONGYU_FORCE_PRODUCTION_DEPLOY" };
  if (typeof commitMessage !== "string") return { build: true, reason: "commit message unreadable — build rather than silently skip" };
  if (RELEASE_MARKERS.some((marker) => marker.test(commitMessage))) return { build: true, reason: "release marker" };
  return { build: false, reason: "production context without [release]/[deploy] marker" };
}
