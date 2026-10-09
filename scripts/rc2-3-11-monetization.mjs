#!/usr/bin/env node
/**
 * gate:rc2-3-11-monetization — validate + mutation kills for commercial wave.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { journeyFingerprint } from "./lib/report-meta.mjs";
import {
  checkLiveKeyGuards,
  checkLiveMonetizationRequiresCloudPass,
  checkEntitlementAuthority,
  checkNoClientProGrant,
  checkPricingArtifacts,
  checkCloudBlockersPreserved,
  checkMonetizationBlockersDecomposed,
  checkCurriculumFingerprint,
  checkAtomurusAbsent,
  checkWebhookContract,
  checkCheckoutContract,
  checkPortalContract,
  readRel,
  readJsonRel,
} from "./lib/rc2-3-11-gates.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readRel(root, rel);
const readJson = (rel) => readJsonRel(root, rel);

function load() {
  return {
    checkout: read("supabase/functions/create-checkout-session/index.ts"),
    portal: read("supabase/functions/create-billing-portal/index.ts"),
    webhook: read("supabase/functions/stripe-webhook/index.ts"),
    guard: read("supabase/functions/_shared/stripeLiveGuard.ts"),
    monetizationMode: read("src/commercial/monetizationMode.ts"),
    entitlements: read("src/lib/entitlements.ts"),
    store: read("src/lib/store.ts"),
    billing: read("src/commercial/billing.ts"),
    subscriptionService: read("src/services/subscriptionService.ts"),
    launchBlockers: readJson("docs/release/launch-blockers.json"),
    productTruth: readJson("docs/release/product-truth.json"),
    pricingDecision: read("docs/commercial/rc2-3-11-pricing-decision.md"),
    unitEconomics: readJson("docs/commercial/unit-economics.json"),
    catalog: readJson("docs/commercial/commercial-product-catalog.json"),
    competitorSnapshot: readJson("docs/commercial/competitor-pricing-snapshot.json"),
    playPolicy: read("docs/commercial/google-play-billing-policy-brasil.md"),
    oa: read("docs/commercial/oa-final-pricing.md"),
    closure: fs.existsSync(path.join(root, "docs/reports/rc2-3-11-closure.md"))
      ? read("docs/reports/rc2-3-11-closure.md")
      : "",
    commercialTruth: read("docs/reports/rc2-3-11-commercial-system-truth.md"),
    fingerprint: journeyFingerprint(root),
  };
}

function validate() {
  const w = load();
  const errors = [];
  errors.push(...checkLiveKeyGuards(w).map((e) => `live:${e}`));
  errors.push(
    ...checkLiveMonetizationRequiresCloudPass({
      monetizationModeSource: w.monetizationMode,
      launchBlockers: w.launchBlockers,
      productTruth: w.productTruth,
    }).map((e) => `mode:${e}`)
  );
  errors.push(
    ...checkEntitlementAuthority({
      entitlementsSource: w.entitlements,
      storeSource: w.store,
      billingSource: w.billing,
    }).map((e) => `entitlement:${e}`)
  );
  errors.push(
    ...checkNoClientProGrant({
      entitlementsSource: w.entitlements,
      subscriptionService: w.subscriptionService,
    }).map((e) => `client:${e}`)
  );
  errors.push(
    ...checkPricingArtifacts({
      pricingDecision: w.pricingDecision,
      unitEconomics: w.unitEconomics,
      catalog: w.catalog,
      competitorSnapshot: w.competitorSnapshot,
      playPolicy: w.playPolicy,
      oa: w.oa,
    }).map((e) => `pricing:${e}`)
  );
  errors.push(...checkCloudBlockersPreserved(w.launchBlockers).map((e) => `cloud:${e}`));
  errors.push(...checkMonetizationBlockersDecomposed(w.launchBlockers).map((e) => `mon:${e}`));
  errors.push(...checkCurriculumFingerprint(w.fingerprint).map((e) => `curriculum:${e}`));
  errors.push(...checkAtomurusAbsent(w.closure + w.commercialTruth).map((e) => `atomurus:${e}`));
  errors.push(...checkWebhookContract(w.webhook).map((e) => `webhook:${e}`));
  errors.push(...checkCheckoutContract(w.checkout).map((e) => `checkout:${e}`));
  errors.push(...checkPortalContract(w.portal).map((e) => `portal:${e}`));

  if (w.productTruth?.commercial?.stripe?.mode === "live") errors.push("product-truth:STRIPE_LIVE");
  if (w.catalog?.monetizationMode === "LIVE") errors.push("catalog:LIVE_MODE");
  if (!/LIVE_MONETIZATION_READY/.test(w.closure)) errors.push("closure:MISSING_MATRIX");
  if (!/BLOCKED|cloud blocker/i.test(w.closure)) errors.push("closure:MISSING_CLOUD_CARRYOVER");

  if (errors.length) {
    console.error("FAIL validate:rc2-3-11-monetization");
    for (const e of errors) console.error(`- ${e}`);
    process.exit(1);
  }
  console.log("PASS validate:rc2-3-11-monetization");
}

function test() {
  let ok = true;
  const must = (label, code, errs) => {
    if (!errs.includes(code)) {
      console.error(`KILL MISS ${label}: expected ${code}, got ${JSON.stringify(errs)}`);
      ok = false;
    } else {
      console.log(`KILL OK ${label} → ${code}`);
    }
  };

  const w = load();

  must(
    "1 live billing cloud blocked",
    "LIVE_STRIPE_WHILE_CLOUD_BLOCKED",
    checkLiveMonetizationRequiresCloudPass({
      monetizationModeSource: w.monetizationMode,
      launchBlockers: { cloudCertification: "BLOCKED" },
      productTruth: { commercial: { stripe: { mode: "live" }, pricingDecision: "NOT_RUN" }, release: {} },
    })
  );
  must(
    "2 checkout missing refusal",
    "CHECKOUT_MISSING_LIVE_REFUSAL",
    checkLiveKeyGuards({ ...w, checkout: w.checkout.replaceAll("refuseStripeLive", "noop") })
  );
  must(
    "5 arbitrary stripe price",
    "CHECKOUT_ARBITRARY_PRICE",
    checkCheckoutContract(w.checkout.replaceAll("resolveAllowedPrice", "acceptAnyPrice"))
  );
  must(
    "6 portal wrong customer",
    "PORTAL_NO_CUSTOMER_OWNERSHIP",
    checkPortalContract(w.portal.replaceAll("stripe_customer_id", "other_id"))
  );
  must(
    "7 checkout open redirect",
    "CHECKOUT_OPEN_REDIRECT",
    checkCheckoutContract(
      w.checkout
        .replaceAll("allowedOrigins", "x")
        .replaceAll("STRIPE_ALLOWED_ORIGINS", "y")
        .replaceAll("APP_CANONICAL_ORIGIN", "z")
    )
  );
  must(
    "8 webhook signature bypass",
    "WEBHOOK_SIGNATURE_BYPASS",
    checkWebhookContract(w.webhook.replaceAll("constructEventAsync", "trustBody"))
  );
  must(
    "9 duplicate event",
    "WEBHOOK_NOT_IDEMPOTENT",
    checkWebhookContract(w.webhook.replaceAll('onConflict: "stripe_event_id"', "onConflict: \"id\""))
  );
  must(
    "11 webhook db failure success",
    "WEBHOOK_SWALLOWS_RPC",
    checkWebhookContract(w.webhook.replaceAll("assertRpc", "ignoreRpc"))
  );
  must(
    "18 android iap enabled",
    "ANDROID_IAP_ENABLED_PREMATURELY",
    checkNoClientProGrant({
      entitlementsSource: w.entitlements,
      subscriptionService: w.subscriptionService.replace("DISABLED_FOR_BETA", "ENABLED"),
    })
  );
  must(
    "25 client price authority",
    "CLIENT_PRICE_AUTHORITY_UNGUARDED",
    checkEntitlementAuthority({
      entitlementsSource: w.entitlements,
      storeSource: w.store,
      billingSource: w.billing.replaceAll("assertNoClientPriceAuthority", "x").replaceAll("CLIENT_PRICE_OVERRIDE", "y"),
    })
  );
  must(
    "40 play eligibility assumed",
    "PLAY_ELIGIBILITY_ASSUMED",
    checkPricingArtifacts({
      pricingDecision: w.pricingDecision,
      unitEconomics: w.unitEconomics,
      catalog: w.catalog,
      competitorSnapshot: w.competitorSnapshot,
      playPolicy: "verifiedAt: x\nBrazil is automatically eligible",
      oa: w.oa,
    })
  );
  must(
    "45 pricing decision absent",
    "PRICING_DECISION_ABSENT",
    checkPricingArtifacts({
      pricingDecision: "",
      unitEconomics: w.unitEconomics,
      catalog: w.catalog,
      competitorSnapshot: w.competitorSnapshot,
      playPolicy: w.playPolicy,
      oa: w.oa,
    })
  );
  must(
    "46 cloud blockers auto-cleared",
    "CLOUD_AUTO_CLEARED",
    checkCloudBlockersPreserved({ ...w.launchBlockers, cloudCertification: "PASS" })
  );
  must(
    "47 curriculum fingerprint",
    "CURRICULUM_FINGERPRINT_CHANGED",
    checkCurriculumFingerprint("deadbeefdead")
  );
  must("48 atomurus", "ATOMURUS_TOUCHED", checkAtomurusAbsent("Atomurus sibling"));

  // invariant string present
  must(
    "invariant missing",
    "MISSING_LIVE_CLOUD_INVARIANT",
    checkLiveMonetizationRequiresCloudPass({
      monetizationModeSource: "export const MONETIZATION_MODE = \"TEST\";",
      launchBlockers: w.launchBlockers,
      productTruth: w.productTruth,
    })
  );

  if (!ok) process.exit(1);
  console.log("PASS test:rc2-3-11-monetization");
}

const mode = process.argv[2] ?? "validate";
if (mode === "test") test();
else if (mode === "validate") validate();
else {
  console.error("use validate or test");
  process.exit(2);
}
