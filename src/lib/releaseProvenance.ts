/**
 * RC2.3.10 — artifact provenance: which build is this, and is it the one being
 * certified?
 *
 * One identity, no second source of truth: scripts/vite-build.mjs embeds the
 * commit SHA (VITE_COMMIT_SHA), the curriculum fingerprint computed from the
 * same sources the gates hash (VITE_CURRICULUM_FINGERPRINT) and the release
 * channel (VITE_BUILD_CHANNEL) in the bundle and in dist/version.json. On
 * Android, versionName/versionCode come from the installed APK.
 *
 * Pure functions: the expected (certified) SHA comes from outside the build —
 * the closure report / PR the tester is certifying — because a build cannot
 * know the SHA of a future certification.
 */

export const BUILD_CHANNELS = ["dev", "internal", "closed", "production"] as const;
export type BuildChannel = (typeof BUILD_CHANNELS)[number] | "unknown";

export interface BuildProvenance {
  buildSha: string | null;
  curriculumFingerprint: string | null;
  versionName: string | null;
  versionCode: number | null;
  channel: BuildChannel;
  /** `VITE_DEVICE_QA=true`: diagnostic build with QA surfaces. */
  qaBuild: boolean;
  /** `VITE_USE_TEST_FIXTURES=true`: test data inside the bundle. */
  testFixtures: boolean;
}

type ProvenanceEnv = {
  VITE_COMMIT_SHA?: string;
  VITE_CURRICULUM_FINGERPRINT?: string;
  VITE_BUILD_CHANNEL?: string;
  VITE_APP_VERSION?: string;
  VITE_DEVICE_QA?: string;
  VITE_USE_TEST_FIXTURES?: string;
};

const FULL_SHA = /^[0-9a-f]{40}$/;
const SHA_PREFIX = /^[0-9a-f]{7,40}$/;
const FINGERPRINT = /^[0-9a-f]{12}$/;

function clean(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

export function normalizeChannel(value: unknown): BuildChannel {
  const channel = clean(value);
  return (BUILD_CHANNELS as readonly string[]).includes(channel) ? (channel as BuildChannel) : "unknown";
}

export function readBuildProvenance(
  env: ProvenanceEnv,
  native: { versionName?: string | null; versionCode?: number | null } = {}
): BuildProvenance {
  const sha = clean(env.VITE_COMMIT_SHA);
  const fingerprint = clean(env.VITE_CURRICULUM_FINGERPRINT);
  return {
    buildSha: FULL_SHA.test(sha) ? sha : null,
    curriculumFingerprint: FINGERPRINT.test(fingerprint) ? fingerprint : null,
    versionName: native.versionName || String(env.VITE_APP_VERSION ?? "").trim() || null,
    versionCode: Number.isInteger(native.versionCode) && (native.versionCode ?? 0) > 0 ? (native.versionCode as number) : null,
    channel: normalizeChannel(env.VITE_BUILD_CHANNEL),
    qaBuild: env.VITE_DEVICE_QA === "true",
    testFixtures: env.VITE_USE_TEST_FIXTURES === "true",
  };
}

/** A full build SHA matches an expected full SHA or an unambiguous (≥7) prefix of it. */
export function shaMatches(buildSha: string | null | undefined, expected: string | null | undefined): boolean {
  const build = clean(buildSha);
  const want = clean(expected);
  if (!FULL_SHA.test(build) || !SHA_PREFIX.test(want)) return false;
  return build.startsWith(want);
}

export type ProvenanceReason =
  | "BUILD_SHA_MISSING"
  | "EXPECTED_SHA_MISSING"
  | "SHA_MISMATCH"
  | "FINGERPRINT_MISSING"
  | "FINGERPRINT_MISMATCH";

export type ProvenanceVerdict = "MATCH" | "MISMATCH" | "UNKNOWN";

/**
 * MATCH only when the build SHA and the curriculum fingerprint both equal what
 * is being certified. Missing data is UNKNOWN, never MATCH.
 */
export function compareProvenance(
  build: Pick<BuildProvenance, "buildSha" | "curriculumFingerprint">,
  expected: { sha?: string | null; fingerprint?: string | null }
): { verdict: ProvenanceVerdict; reasons: ProvenanceReason[] } {
  const reasons: ProvenanceReason[] = [];
  if (!build.buildSha) reasons.push("BUILD_SHA_MISSING");
  if (!SHA_PREFIX.test(clean(expected.sha))) reasons.push("EXPECTED_SHA_MISSING");
  if (!build.curriculumFingerprint) reasons.push("FINGERPRINT_MISSING");
  const mismatch: ProvenanceReason[] = [];
  if (build.buildSha && SHA_PREFIX.test(clean(expected.sha)) && !shaMatches(build.buildSha, expected.sha)) mismatch.push("SHA_MISMATCH");
  if (build.curriculumFingerprint && FINGERPRINT.test(clean(expected.fingerprint)) && build.curriculumFingerprint !== clean(expected.fingerprint)) {
    mismatch.push("FINGERPRINT_MISMATCH");
  }
  if (mismatch.length) return { verdict: "MISMATCH", reasons: [...mismatch, ...reasons] };
  return { verdict: reasons.length ? "UNKNOWN" : "MATCH", reasons };
}

/** Escape hatches that must never ship in a production-channel artifact. */
export function productionProvenanceViolations(build: BuildProvenance): string[] {
  if (build.channel !== "production") return [];
  const out: string[] = [];
  if (build.qaBuild) out.push("VITE_DEVICE_QA_IN_PRODUCTION");
  if (build.testFixtures) out.push("VITE_USE_TEST_FIXTURES_IN_PRODUCTION");
  if (!build.buildSha) out.push("BUILD_SHA_MISSING");
  if (!build.curriculumFingerprint) out.push("FINGERPRINT_MISSING");
  return out;
}

/** Where /qa/device keeps the SHA the tester is certifying (no secret, just a commit id). */
export const QA_EXPECTED_SHA_KEY = "longyu:qa-expected-sha";

/** `?expect=<sha>` on /qa/device wins; otherwise the last value the tester typed. */
export function readExpectedSha(search: string, stored: string | null): string | null {
  const fromUrl = clean(new URLSearchParams(search).get("expect"));
  if (SHA_PREFIX.test(fromUrl)) return fromUrl;
  const fromStore = clean(stored);
  return SHA_PREFIX.test(fromStore) ? fromStore : null;
}
