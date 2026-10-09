/**
 * RC2.3.11 — commercial monetization mode.
 *
 * LIVE is forbidden until:
 *   cloud.certification = PASS
 *   + OA-FINAL-PRICING
 *   + store compliance PASS
 *   + billing test matrix PASS
 *
 * Invariant: LIVE_MONETIZATION_REQUIRES_CLOUD_PASS
 */

export const MONETIZATION_MODES = ["TEST", "LIVE"] as const;
export type MonetizationMode = (typeof MONETIZATION_MODES)[number];

/** Compile-time / bundle default. Edge Functions also refuse sk_live_ independently. */
export const MONETIZATION_MODE: MonetizationMode = "TEST";

export const LIVE_MONETIZATION_REQUIRES_CLOUD_PASS = "LIVE_MONETIZATION_REQUIRES_CLOUD_PASS" as const;

export const PURCHASES_ENABLED = true;

/**
 * Kill switch semantics: when false, refuse new checkouts while preserving
 * existing server entitlements. Wired for product truth / future Edge env;
 * client must not invent Pro when purchases are disabled.
 */
export function purchasesEnabled(): boolean {
  return PURCHASES_ENABLED && MONETIZATION_MODE === "TEST"
    ? true // TEST checkouts allowed when server has test keys + configured prices
    : MONETIZATION_MODE === "LIVE" && PURCHASES_ENABLED;
}

export function assertNotLiveMonetizationWithoutCloudPass(cloudCertification: string): void {
  if (MONETIZATION_MODE === "LIVE" && cloudCertification !== "PASS") {
    throw new Error(LIVE_MONETIZATION_REQUIRES_CLOUD_PASS);
  }
}
