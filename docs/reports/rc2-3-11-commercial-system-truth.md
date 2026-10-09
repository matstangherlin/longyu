# RC2.3.11 — Commercial system truth (read-only audit)

| Field | Value |
|---|---|
| Branch | `cursor/rc2-3-11-monetization-final-pricing` |
| Head | `99e69f4cd13c2d21ad05a06bb6fb70560c971b3d` |
| Method | Static read of repo + prior production snapshots under `docs/launch/` |
| `productionWrite` | **false** (no Stripe API, no Edge secret read, no DB write, no deploy) |
| Companion | `docs/commercial/entitlement-state-machine.json` |

## Verdict

Monetization is **implemented in code, frozen in product truth, and not live for self-serve purchase**. Stripe is intended for **test mode**. Entitlement authority is **server-only** for cloud accounts. Android does not sell. Family and Business backends exist in the repo but are **missing in production**. Public catalog prices are approved; Stripe Price ID slots and `PRODUCT_TRUTH` keep checkout closed.

## Authority principle

**Server-only.** Cloud Pro is decided by `get_server_entitlement()` (or a subscription-row fallback when the RPC transport fails). The client may display public prices and call checkout/portal Edge Functions with a JWT; it may not choose `providerPriceId`, amount, currency, coupon, or force `serverIsPro` for a cloud account. Stripe webhook + `apply_subscription_event` (service_role) are the writers of `subscriptions` / `transactions`. RLS on those tables is select-own only.

## Component table

| Component | Exists | Authority | Live/Test | Current problem | Action |
|---|---|---|---|---|---|
| `supabase/functions/create-checkout-session` | Yes — `supabase/functions/create-checkout-session/index.ts`; deployed prod slug v10 (`docs/launch/rc2-3-10d-live-snapshot.json`) | Server: JWT → `auth.getUser()`; price from `buildServerPriceMatrix` / `resolveAllowedPrice` (`src/commercial/billing.ts`); rejects client price fields | **Test intended.** Repo refuses `sk_live_` (503). Prod body **DEPLOYED_STALE** vs repo (`docs/launch/rc2-3-10b-edge-parity.json`: predates 8-slot matrix) | Deployed function likely on old price-env contract; UI checkout button always disabled because client `PLAN_PRICE_MATRIX` has `providerPriceId: null` / `PRICE_PENDING`; `billingCountry` client-chosen; always `trial_period_days=30`; no reuse of existing Stripe customer | Hold live. Diff/redeploy only after TEST e2e + owner Stripe account confirm. Align UI enablement with server `CONFIGURED` without shipping Price IDs to the client |
| `supabase/functions/create-billing-portal` | Yes — `supabase/functions/create-billing-portal/index.ts`; prod v9 | Server: JWT user → service_role lookup `subscriptions.stripe_customer_id` by `user_id` | **Test intended.** Repo refuses `sk_live_` via shared `refuseStripeLive` (RC2.3.11) | Deployed body may predate shared guard; 404 if no customer row; checkout never attaches `customer=` so multiple customers per email possible | Redeploy after TEST e2e; reuse customer on checkout; keep portal web-only until Play decision |
| `supabase/functions/stripe-webhook` | Yes — `supabase/functions/stripe-webhook/index.ts`; prod v11, `verify_jwt: false` | Stripe signature → service_role → `apply_subscription_event` + `transactions` upsert | **Test intended.** Repo refuses `sk_live_` via shared `refuseStripeLive` (RC2.3.11) | Invoice events can land with `user_id=null` if subscription row missing; deployed body may predate shared guard | Redeploy after TEST e2e with signature + ordering; confirm deployed body matches repo |
| `public.subscriptions` | Yes — `supabase/migrations/001_initial_schema.sql` (+ `stripe_event_id` / ordering cols in later migrations). PRESENT in prod snapshots | Writer: webhook / service_role RPC only. Client: `subscriptions_select_own` | Data store for **test or whatever keys Edge uses** (secrets not readable here) | Client can read own row but cannot insert/update; no duplicate-active-subscription guard at checkout | Keep RLS; refuse second checkout when active/trialing exists |
| `public.transactions` | Yes — same initial schema; unique `stripe_event_id` | Writer: webhook upsert `onConflict: stripe_event_id` | Ledger only | Orphan rows when invoice arrives before subscription link | Retry or backfill `user_id` on later subscription events |
| RPC `apply_subscription_event` | Yes — repo `supabase/migrations/20260808130100_harden_subscription_event_ordering.sql` (+ `015_fix_…`); service_role only; PRESENT in prod | Server / webhook only | Ordering by `event.created` then `event.id`; reasons `duplicate_event` / `stale` / `terminal_canceled` | None blocking for beta freeze | Keep as sole subscription mutator |
| RPC `get_server_entitlement` | Yes — evolved from `008_server_entitlement_rpc.sql` → org/pearl → family in `20260914210000_family_entitlement.sql`. PRESENT in prod (older body hash) | Server security definer; `grant execute` to `authenticated` | Prod body **without** family tables/RPCs applied | Family-aware SQL is repo-only; `_user_stripe_pro_active` grants only `active`/`trialing` (not `canceled`+remaining period); client fallback can disagree | Apply family/business migrations before selling those plans; align canceling semantics |
| Helper `_user_stripe_pro_active` | Yes — in apply-all / pearl/business migrations; PRESENT in prod | Server | Same as above | Ignores `canceled` with future `current_period_end` (client `real_canceling` still grants Pro via subscription fallback) | Decide one rule; prefer server RPC as sole path |
| Frontend `/pro` + `/plano` (`ProPage`) | Yes — `src/features/pro/ProPage.tsx`, routes in `src/routes.tsx` | Displays `PUBLIC_COMMERCIAL_CATALOG`; checkout invokes Edge; availability pills from `PRODUCT_TRUTH` | Shows approved prices; **purchase CTA disabled** (`checkoutEnabled` false while client matrix `PRICE_PENDING`) | `PRODUCT_TRUTH.pro_individual` / `family_plan` = `planned`; Android hides price/CTA | Keep closed until TEST e2e + product truth flip; do not claim “available” |
| Paywall (`ProPaywall`) | Yes — `src/components/pro/ProPaywall.tsx` + `src/data/planFeatures.ts` | Navigates to plans; gated by `canOpenPaywallKind` / `featureTruth` | Soft upsell; energy uses `EnergySoftLanding` not hard wall | Does not itself charge money | Keep info-only until checkout live |
| Routes `/subscribe`, `/pricing`, `/premium` | **No** dedicated routes | n/a | n/a | Aliases: `/pro`, `/plano` only | Optional aliases later; not required for truth |
| Android Play Billing / Capacitor IAP | **No** BillingClient / Capacitor purchase plugin. Decision artifact: `docs/release/android-billing-audit.json` | `ANDROID_IN_APP_PURCHASE = "DISABLED_FOR_BETA"` in `src/services/subscriptionService.ts`; `isInAppPurchaseAvailable() = !isNativeApp()` | Entitlement from web/server still recognized via `serverIsPro` | Cannot sell or open Stripe checkout/portal in native shell | Keep disabled until Play policy owner action + Billing implementation |
| Family plan code | Yes — `src/commercial/family.ts`, `src/services/familyService.ts`, `src/features/familia/*`, migrations `20260914120000_*`, `20260914200000_*`, `20260914210000_*` | Server seat/invite RPCs + `_user_family_entitlement` when applied | Repo ready; **prod tables/RPCs MISSING** (`knownMissingBackend.json` + schema diff SCD-041..) | `VITE_BACKEND_FAMILY_ENABLED` fail-closed in production-like builds; `PRODUCT_TRUTH.family_plan = planned`; checkout plan `family` allowed by billing contract but cannot be purchased | Do not sell Family until migrations applied + Stripe family price slots + TEST e2e |
| Business plan code | Yes — migrations `20260825043000_*`, `20260825062000_*`, `20260914180000_*`; UI `src/features/business/*`; Edge `submit-business-lead` | Org seats / grants / `organization_subscriptions` (separate from personal `subscriptions`); lead form | `PRODUCT_TRUTH.business_workspace = pilot` (contract provision); prod org tables **MISSING** | No self-serve Stripe Business checkout; client gated by `VITE_BACKEND_BUSINESS_ENABLED` | Provision pilots manually after migrations; keep sales CTA → `/business` |
| Feature flags (billing-related) | Yes — see below | Mix of build-env + code constants + product truth | Production-like defaults fail closed for family/business/pearl backends | No single `BILLING_ENABLED` flag; closure is multi-layered | Keep layered freeze until RC2.3.11 pricing decision (`docs/release/product-truth.json` `pricingDecision: NOT_RUN`) |
| Client `isPro` / `serverIsPro` | Store fields in `src/lib/store.ts`; bootstrap `src/components/auth/EntitlementBootstrap.tsx` | **Cloud:** `effectivePremium` ignores preview/`isPremium`, requires `serverIsPro === true` (`src/lib/entitlements.ts`). `serverIsPro` **not persisted** (`partialize` forces false) | Preview toggle only when `isDevPreviewAllowed()` (Settings); QA fast-path can seed Pro off production-like | `setPremium` exists but is UI-gated to preview builds; cloud accounts cannot self-grant via localStorage | Do not weaken cloud branch; treat `VITE_DEVICE_QA` seeding as release-workflow risk only |
| `sk_live_` guards | Yes — shared | Checkout + portal + webhook | `supabase/functions/_shared/stripeLiveGuard.ts` → `refuseStripeLive` (503). Gates assert shared refusal | Deployed Edge may still lack guard until redeploy | Keep TEST-only secrets until LIVE gate |

## Billing-related flags and constants (inventory)

| Name | Where | Production-like effect |
|---|---|---|
| `PRODUCT_TRUTH` (`pro_individual`, `family_plan`, …) | `src/commercial/productTruth.ts` | Purchase offerability; Pro/Family `planned`, Business `pilot` |
| `PLAN_PRICE_MATRIX` / `PUBLIC_COMMERCIAL_CATALOG` | `src/commercial/billing.ts` | Public amounts; slots `PRICE_PENDING` until server env Price IDs |
| `ANDROID_IN_APP_PURCHASE` | `src/services/subscriptionService.ts` | Constant `DISABLED_FOR_BETA` |
| `VITE_ALLOW_PRO_PREVIEW` | `docs/release/feature-flags.json`, `src/lib/appEnvironment.ts` | Forced off for production-like |
| `VITE_BACKEND_FAMILY_ENABLED` | `src/lib/cloud/backendCapability.ts` + `knownMissingBackend.json` | Off while family domain missing in prod |
| `VITE_BACKEND_BUSINESS_ENABLED` | same | Off while business domain missing in prod |
| `VITE_BACKEND_PEARL_ENABLED` | same | Off while pearl RPCs missing in prod |
| `VITE_DEVICE_QA` | feature-flags inventory | Dangerous: can seed `serverIsPro:true` on native debug builds (workflow-controlled) |
| Edge `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_<PLAN>_<CYCLE>_<MARKET>` | Edge env (names only; values not read) | Checkout 501/409 without them |
| `docs/release/product-truth.json` → `commercial.stripe.mode` | release truth | `"test"`; `pricingDecision: "NOT_RUN"`; wave `RC2.3.11` |

## Public catalog (approved, in bundle by design)

From `src/commercial/billing.ts` `PUBLIC_COMMERCIAL_CATALOG` (minor units):

| Plan | Market | Monthly | Annual |
|---|---|---|---|
| pro | BR | BRL 17.00 | BRL 170.00 |
| pro | INTERNATIONAL | USD 5.00 | USD 50.00 |
| family | BR | BRL 27.00 | BRL 270.00 |
| family | INTERNATIONAL | USD 8.00 | USD 80.00 |

Server maps country → market (`BR` else `INTERNATIONAL`). Annual = 10× monthly (`ANNUAL_EQUIVALENT_MONTHS = 10`). Business/Enterprise have **no** Stripe checkout slots.

## Entitlement sources (server RPC order when family migration applied)

From `supabase/migrations/20260914210000_family_entitlement.sql` / `src/commercial/entitlements.ts`:

1. Organization seat (`business` / `enterprise`) via `_user_organization_entitlement`
2. Individual Stripe (`_user_stripe_pro_active`: status `active` \| `trialing` and period not ended)
3. Family membership (owner paying or grant)
4. Pearl Pro pass (`user_economy.pearl_pro_expires_at`)
5. Internal entitlement grant

Client display precedence in `resolveEffectiveEntitlement` mirrors the same idea (enterprise → business → individual → family → promotion → pearl → internal). **Any live source grants Pro features; sources do not cancel each other.**

## Production vs repo (evidence already on disk)

| Fact | Evidence |
|---|---|
| Edge slugs present (checkout v10, portal v9, webhook v11) | `docs/launch/rc2-3-10d-live-snapshot.json` |
| Checkout deployed body stale vs repo matrix | `docs/launch/rc2-3-10b-edge-parity.json` |
| `subscriptions` / `transactions` / `apply_subscription_event` / `get_server_entitlement` PRESENT | `docs/launch/rc2-3-10b-live-facts.json`, edge parity |
| Family + org tables MISSING in production | `docs/launch/rc2-3-10b-schema-column-diff.json` SCD-040+; `src/lib/cloud/knownMissingBackend.json` |
| Stripe mode test; pricing decision not run | `docs/release/product-truth.json` |
| Android IAP disabled | `docs/release/android-billing-audit.json` |

## What the client cannot do (cloud)

- Persist `serverIsPro` across reload (`partialize` clears it).
- Use `isPremium` / Settings preview toggle when `accountAuthMode === "cloud"`.
- Pass `priceId` / `amount` / `coupon` / `billingMarket` into checkout (`BillingContractError` `CLIENT_PRICE_OVERRIDE`).
- INSERT/UPDATE `subscriptions` or `transactions` (RLS select-only).
- Call `apply_subscription_event` (service_role only).

## Open gaps that belong to RC2.3.11 (not invented; from code + prior hardening notes)

1. Flip purchase only after Stripe **TEST** e2e + Price IDs for the eight slots + product-truth `available`.
2. Shared `sk_live_` refusal on portal + webhook.
3. Redeploy checkout after confirming secret names (`STRIPE_PRICE_*_*_*`).
4. Server-derived billing market (client country is spoofable).
5. Apply family/business migrations before enabling those client flags.
6. Duplicate-subscription and trial-policy decisions.
7. Android remains non-selling until Play Billing / policy path exists.

## Evidence index (primary paths)

- Edge: `supabase/functions/create-checkout-session/index.ts`, `create-billing-portal/index.ts`, `stripe-webhook/index.ts`
- Contract: `src/commercial/billing.ts`, `productTruth.ts`, `family.ts`, `entitlements.ts`
- Client services: `src/services/subscriptionService.ts`, `entitlementService.ts`, `syncService.ts`
- Store / preview: `src/lib/store.ts`, `src/lib/entitlements.ts`, `src/lib/proAccess.ts`
- SQL: `supabase/migrations/001_initial_schema.sql`, `008_server_entitlement_rpc.sql`, `20260808130100_harden_subscription_event_ordering.sql`, `20260914210000_family_entitlement.sql`, `20260825043000_business_foundation.sql`
- Prior audits: `docs/reports/rc2-3-10b-stripe-test-hardening.md`, `docs/release/android-billing-audit.json`

`productionWrite: false`
