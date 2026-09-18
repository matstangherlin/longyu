/**
 * PUBLIC_BETA_CORE — free public beta launch scope.
 *
 * Separates "can we open a free public beta?" from "is every commercial
 * surface live?". Stripe / Family / Business purchase are conditional:
 * they block GO only when those offers are sold publicly.
 *
 * FEATURE_FREEZE=PUBLIC_BETA: after this remessa, no new product features
 * until the public beta GO/NO-GO. P0/P1 blockers, security, a11y, auth/sync,
 * devices, release tooling, and QA fixes remain allowed.
 */

import {
  CURRICULUM_FREEZE,
  FEATURE_FREEZE,
  RC_BASE_FINGERPRINT,
  RC1_EXPECTED_LESSON_COUNT,
  RC1_EXPECTED_TEACHING_TOPIC_COUNT,
  RC2_EXPECTED_CULTURE_ITEMS,
  RC2_EXPECTED_CULTURE_NATIVE_LESSONS,
  RC2_EXPECTED_JOURNEY_CULTURE_NODES,
  RELEASE_CANDIDATE_SHA,
} from "./curriculumFreeze";
import { PRODUCT_TRUTH } from "../commercial/productTruth";

export { FEATURE_FREEZE };
export const PUBLIC_BETA_PROFILE = "PUBLIC_BETA_CORE" as const;

/** Always required for free public beta GO (when the surface is shipped). */
export const PUBLIC_BETA_CORE_REQUIRED_CHECKS = [
  "cloud_auth",
  "cloud_sync",
  "feedback_backend",
  "android_real_device",
  "ios_real_device",
  "pwa_upgrade",
  "rollback_drill",
] as const;

/**
 * Required only when League is enabled in the public beta build.
 * If League is feature-flagged OFF, this check does not block GO.
 */
export const PUBLIC_BETA_CORE_CONDITIONAL_CHECKS = {
  league_cloud_smoke: { when: "league_publicly_enabled" },
} as const;

/**
 * Commercial evidence — NOT required for FREE public beta while offers stay
 * planned/pilot and checkout cannot complete publicly.
 */
export const PUBLIC_BETA_COMMERCIAL_CONDITIONAL_CHECKS = [
  "stripe_test_mode_e2e",
  "stripe_production_config",
  "family_plan_live",
  "business_seats_live",
] as const;

export const PUBLIC_BETA_FROZEN_METRICS = {
  curriculumFreeze: CURRICULUM_FREEZE,
  featureFreeze: FEATURE_FREEZE,
  fingerprint: RC_BASE_FINGERPRINT,
  lessons: RC1_EXPECTED_LESSON_COUNT,
  teachingTopics: RC1_EXPECTED_TEACHING_TOPIC_COUNT,
  cultureItems: RC2_EXPECTED_CULTURE_ITEMS,
  cultureNativeLessons: RC2_EXPECTED_CULTURE_NATIVE_LESSONS,
  journeyCultureNodes: RC2_EXPECTED_JOURNEY_CULTURE_NODES,
} as const;

export type OperationalCheckMap = Record<
  string,
  { pass?: boolean; evidence?: string; testedAt?: string | null }
>;

/** Loose shape so mutation tests can flip availability without fighting `as const`. */
export type ProductTruthLike = Record<
  string,
  { id?: string; availability: string; gatedBy?: string; because?: string }
>;

export type PublicBetaCoreInput = {
  checks: OperationalCheckMap;
  /** When false, league_cloud_smoke is not a GO blocker. Default false until proven. */
  leaguePubliclyEnabled?: boolean;
  productTruth?: ProductTruthLike;
  releaseCandidateSha?: string;
  fingerprint?: string;
};

export type PublicBetaFailure = { code: string; where: string; why: string };

function paidOffersSellable(truth: ProductTruthLike): string[] {
  return Object.keys(truth).filter((id) => {
    if (id === "journey" || id === "free_plan") return false;
    return truth[id]?.availability === "available";
  });
}

/**
 * Evaluate whether PUBLIC_BETA_CORE would allow a GO decision.
 * Never invents PASS — reads operational check evidence as given.
 */
export function evaluatePublicBetaCore(input: PublicBetaCoreInput): {
  profile: typeof PUBLIC_BETA_PROFILE;
  featureFreeze: typeof FEATURE_FREEZE;
  go: boolean;
  failures: PublicBetaFailure[];
  required: readonly string[];
  skippedCommercial: readonly string[];
} {
  const failures: PublicBetaFailure[] = [];
  const truth = (input.productTruth ?? PRODUCT_TRUTH) as ProductTruthLike;
  const checks = input.checks ?? {};

  for (const id of PUBLIC_BETA_CORE_REQUIRED_CHECKS) {
    if (!checks[id]?.pass) {
      failures.push({
        code: "CORE_CHECK",
        where: id,
        why: `${id} must PASS for free public beta GO`,
      });
    }
  }

  if (input.leaguePubliclyEnabled) {
    if (!checks.league_cloud_smoke?.pass) {
      failures.push({
        code: "LEAGUE_CLOUD",
        where: "league_cloud_smoke",
        why: "League is public but league_cloud_smoke is not PASS — disable League or close cloud evidence",
      });
    }
  }

  if (truth.journey?.availability !== "available") {
    failures.push({ code: "PRODUCT_TRUTH", where: "journey", why: "journey must stay available" });
  }
  if (truth.free_plan?.availability !== "available") {
    failures.push({ code: "PRODUCT_TRUTH", where: "free_plan", why: "free_plan must stay available" });
  }
  if (truth.pro_individual?.availability === "available" && !checks.stripe_test_mode_e2e?.pass) {
    failures.push({
      code: "PRO_WITHOUT_STRIPE",
      where: "pro_individual",
      why: "pro_individual cannot be available while stripe_test_mode_e2e is false",
    });
  }
  if (truth.family_plan?.availability === "available" && !checks.stripe_test_mode_e2e?.pass) {
    failures.push({
      code: "FAMILY_WITHOUT_STRIPE",
      where: "family_plan",
      why: "family_plan cannot be available while stripe_test_mode_e2e is false",
    });
  }
  if (truth.pro_individual?.availability !== "planned") {
    failures.push({
      code: "PRO_STATE",
      where: "pro_individual",
      why: `expected planned for free public beta, got ${truth.pro_individual?.availability}`,
    });
  }
  if (truth.family_plan?.availability !== "planned") {
    failures.push({
      code: "FAMILY_STATE",
      where: "family_plan",
      why: `expected planned for free public beta, got ${truth.family_plan?.availability}`,
    });
  }
  if (truth.business_workspace?.availability !== "pilot") {
    failures.push({
      code: "BUSINESS_STATE",
      where: "business_workspace",
      why: `expected pilot, got ${truth.business_workspace?.availability}`,
    });
  }

  const selling = paidOffersSellable(truth);
  if (selling.length) {
    for (const id of PUBLIC_BETA_COMMERCIAL_CONDITIONAL_CHECKS) {
      if (!checks[id]?.pass) {
        failures.push({
          code: "COMMERCIAL_CHECK",
          where: id,
          why: `paid offers sellable (${selling.join(",")}) but ${id} is not PASS`,
        });
      }
    }
  }

  const sha = input.releaseCandidateSha ?? RELEASE_CANDIDATE_SHA;
  if (!sha) {
    failures.push({
      code: "CANDIDATE_SHA",
      where: "release_candidate_sha",
      why: "empty until a production-like candidate deploy exists",
    });
  }

  if (input.fingerprint && input.fingerprint !== RC_BASE_FINGERPRINT) {
    failures.push({
      code: "FINGERPRINT",
      where: "journey",
      why: `${input.fingerprint} ≠ ${RC_BASE_FINGERPRINT}`,
    });
  }

  return {
    profile: PUBLIC_BETA_PROFILE,
    featureFreeze: FEATURE_FREEZE,
    go: failures.length === 0,
    failures,
    required: PUBLIC_BETA_CORE_REQUIRED_CHECKS,
    skippedCommercial: selling.length ? [] : [...PUBLIC_BETA_COMMERCIAL_CONDITIONAL_CHECKS],
  };
}
