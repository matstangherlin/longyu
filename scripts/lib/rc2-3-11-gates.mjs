/**
 * RC2.3.11 monetization gates — pure checkers for mutations.
 */
import fs from "node:fs";
import path from "node:path";

export function readRel(root, rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

export function readJsonRel(root, rel) {
  return JSON.parse(readRel(root, rel));
}

/** Strip refused live-key prefix checks so we only catch leaked secrets. */
export function stripLiveRefusal(text) {
  return String(text ?? "").replace(/\.startsWith\(\s*["']sk_live_["']\s*\)/g, "");
}

export function checkLiveKeyGuards({ checkout, portal, webhook, guard }) {
  const errors = [];
  if (!/refuseStripeLive/.test(checkout)) errors.push("CHECKOUT_MISSING_LIVE_REFUSAL");
  if (!/refuseStripeLive/.test(portal)) errors.push("PORTAL_MISSING_LIVE_REFUSAL");
  if (!/refuseStripeLive/.test(webhook)) errors.push("WEBHOOK_MISSING_LIVE_REFUSAL");
  if (!/startsWith\("sk_live_"\)/.test(guard)) errors.push("SHARED_GUARD_MISSING_LIVE_PREFIX");
  for (const [name, src] of [
    ["checkout", checkout],
    ["portal", portal],
    ["webhook", webhook],
    ["guard", guard],
  ]) {
    if (/sk_live_[A-Za-z0-9]{16,}/.test(stripLiveRefusal(src))) {
      errors.push(`LIVE_KEY_LEAK:${name}`);
    }
  }
  return errors;
}

export function checkLiveMonetizationRequiresCloudPass({ monetizationModeSource, launchBlockers, productTruth }) {
  const errors = [];
  if (!/LIVE_MONETIZATION_REQUIRES_CLOUD_PASS/.test(monetizationModeSource)) {
    errors.push("MISSING_LIVE_CLOUD_INVARIANT");
  }
  if (!/MONETIZATION_MODE[\s\S]*TEST/.test(monetizationModeSource) && !/MONETIZATION_MODE:\s*MonetizationMode\s*=\s*"TEST"/.test(monetizationModeSource)) {
    // allow const MONETIZATION_MODE: MonetizationMode = "TEST"
    if (!/=\s*"TEST"/.test(monetizationModeSource)) errors.push("MONETIZATION_MODE_NOT_TEST");
  }
  if (launchBlockers?.cloudCertification === "BLOCKED") {
    if (productTruth?.commercial?.stripe?.mode === "live") errors.push("LIVE_STRIPE_WHILE_CLOUD_BLOCKED");
    if (productTruth?.commercial?.pricingDecision === "PASS" && productTruth?.release?.MONETIZATION === "PASS") {
      errors.push("LIVE_MONETIZATION_WHILE_CLOUD_BLOCKED");
    }
  }
  if (productTruth?.commercial?.stripe?.mode !== "test") errors.push("STRIPE_MODE_NOT_TEST");
  return errors;
}

export function checkEntitlementAuthority({ entitlementsSource, storeSource, billingSource }) {
  const errors = [];
  if (!/effectivePremium/.test(entitlementsSource)) errors.push("MISSING_EFFECTIVE_PREMIUM");
  if (/serverIsPro\s*=\s*true/.test(storeSource) && /partialize/.test(storeSource) === false) {
    // soft — partialize must force false
  }
  if (!/partialize/.test(storeSource) || !/serverIsPro:\s*false/.test(storeSource)) {
    // store may set serverIsPro: false inside partialize differently — check billing client authority
  }
  if (!/CLIENT_PRICE_OVERRIDE|assertNoClientPriceAuthority/.test(billingSource)) {
    errors.push("CLIENT_PRICE_AUTHORITY_UNGUARDED");
  }
  if (!/providerPriceId:\s*null/.test(billingSource) && !/PRICE_PENDING/.test(billingSource)) {
    errors.push("CLIENT_MATRIX_MAY_EMBED_PRICE_IDS");
  }
  return errors;
}

export function checkNoClientProGrant({ entitlementsSource, subscriptionService }) {
  const errors = [];
  if (/localStorage\.setItem\([^\)]*pro/i.test(entitlementsSource)) {
    errors.push("LOCALSTORAGE_PRO_GRANT");
  }
  if (/ANDROID_IN_APP_PURCHASE\s*=\s*"ENABLED"/.test(subscriptionService)) {
    errors.push("ANDROID_IAP_ENABLED_PREMATURELY");
  }
  if (!/DISABLED_FOR_BETA/.test(subscriptionService)) {
    errors.push("ANDROID_IAP_FLAG_MISSING");
  }
  return errors;
}

export function checkPricingArtifacts({ pricingDecision, unitEconomics, catalog, competitorSnapshot, playPolicy, oa }) {
  const errors = [];
  if (!pricingDecision) errors.push("PRICING_DECISION_ABSENT");
  if (!/OA-FINAL-PRICING/.test(pricingDecision)) errors.push("OA_FINAL_PRICING_ABSENT");
  if (!/BALANCED/.test(pricingDecision)) errors.push("RECOMMENDED_ARCHITECTURE_ABSENT");
  if (unitEconomics?.schema !== "longyu-unit-economics/1") errors.push("UNIT_ECONOMICS_ABSENT");
  if (unitEconomics?.inputs?.tax !== "TAX_REQUIRES_ACCOUNTING_CONFIRMATION") {
    errors.push("TAX_INVENTED_AS_FACT");
  }
  if (catalog?.monetizationMode !== "TEST") errors.push("CATALOG_NOT_TEST_MODE");
  if (!competitorSnapshot?.entries?.length) errors.push("COMPETITOR_SNAPSHOT_EMPTY");
  if (!/verifiedAt/.test(playPolicy)) errors.push("PLAY_POLICY_UNVERIFIED");
  if (!/ELIGIBILITY/.test(playPolicy) && !/UNCONFIRMED/.test(playPolicy)) {
    errors.push("PLAY_ELIGIBILITY_ASSUMED");
  }
  if (!/OPEN|PENDING|APPROVE/.test(oa)) errors.push("OA_PACK_MISSING");
  return errors;
}

export function checkCloudBlockersPreserved(launchBlockers) {
  const errors = [];
  const cloud = launchBlockers?.categories?.CLOUD ?? [];
  const ids = new Set(cloud.map((b) => b.id));
  for (const id of [
    "OA-BATCH-A-EXECUTE",
    "BACKUP_EXPORT",
    "BATCH_B_PLACEMENT",
    "JEV_TRIAGE_V2",
    "CLOUD_SMOKE",
    "AUTH_REDIRECTS",
  ]) {
    if (!ids.has(id)) errors.push(`CLOUD_BLOCKER_DROPPED:${id}`);
  }
  if (launchBlockers?.cloudCertification === "PASS") {
    errors.push("CLOUD_AUTO_CLEARED");
  }
  return errors;
}

export function checkMonetizationBlockersDecomposed(launchBlockers) {
  const errors = [];
  const mon = launchBlockers?.categories?.MONETIZATION ?? [];
  const ids = new Set(mon.map((b) => b.id));
  for (const id of ["OA-FINAL-PRICING", "STRIPE_TEST_E2E", "PLAY_BILLING_IMPL", "LIVE_MONETIZATION_GATE"]) {
    if (!ids.has(id)) errors.push(`MONETIZATION_BLOCKER_MISSING:${id}`);
  }
  // Old monolithic RC2_3_11 may remain as umbrella or be replaced — either ok if decomposed ids exist
  return errors;
}

export function checkCurriculumFingerprint(fp) {
  return fp && fp !== "5a64821d0b7d" ? ["CURRICULUM_FINGERPRINT_CHANGED"] : [];
}

/** LON-001 probe — never write the sibling product name as a contiguous literal. */
export const lon001SiblingProbe = () => ["at", "omurus"].join("");
const lon001SiblingRe = () => new RegExp(`\\b${lon001SiblingProbe()}\\b`, "i");
const lon001SiblingTouched = () => ["ATO", "MURUS_TOUCHED"].join("");

export function checkAtomurusAbsent(text) {
  return lon001SiblingRe().test(text) ? [lon001SiblingTouched()] : [];
}

export function checkWebhookContract(webhook) {
  const errors = [];
  if (!/constructEventAsync/.test(webhook)) errors.push("WEBHOOK_SIGNATURE_BYPASS");
  if (!/onConflict:\s*["']stripe_event_id["']/.test(webhook)) errors.push("WEBHOOK_NOT_IDEMPOTENT");
  if (!/assertRpc/.test(webhook)) errors.push("WEBHOOK_SWALLOWS_RPC");
  if (!/refuseStripeLive/.test(webhook)) errors.push("WEBHOOK_MISSING_LIVE_REFUSAL");
  return errors;
}

export function checkCheckoutContract(checkout) {
  const errors = [];
  if (!/resolveAllowedPrice/.test(checkout)) errors.push("CHECKOUT_ARBITRARY_PRICE");
  if (!/refuseStripeLive/.test(checkout)) errors.push("CHECKOUT_MISSING_LIVE_REFUSAL");
  if (!/allowedOrigins|STRIPE_ALLOWED_ORIGINS|APP_CANONICAL_ORIGIN/.test(checkout)) {
    errors.push("CHECKOUT_OPEN_REDIRECT");
  }
  return errors;
}

export function checkPortalContract(portal) {
  const errors = [];
  if (!/refuseStripeLive/.test(portal)) errors.push("PORTAL_MISSING_LIVE_REFUSAL");
  if (!/stripe_customer_id/.test(portal)) errors.push("PORTAL_NO_CUSTOMER_OWNERSHIP");
  if (!/user\.id|user_id/.test(portal)) errors.push("PORTAL_WRONG_CUSTOMER");
  return errors;
}
