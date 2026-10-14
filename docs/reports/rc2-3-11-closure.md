# RC2.3.11 — Closure

| Field | Value |
|---|---|
| Branch | `cursor/rc2-3-11-monetization-final-pricing` |
| Parent | PR #325 @ `99e69f4cd13c2d21ad05a06bb6fb70560c971b3d` |
| Monetization mode | **TEST** |
| Live billing | **DISABLED** (`LIVE_MONETIZATION_REQUIRES_CLOUD_PASS`) |
| Cloud certification | **BLOCKED** (carryover — not reopened) |

## Research

Competitors (HelloChinese, SuperChinese, Skritter, Du Chinese, Pleco add-ons, Chinese Zero to Hero) snapshotted in `docs/commercial/competitor-pricing-snapshot.json` with `verifiedAt` 2026-10-09. BR in-store prices marked `STORE_PRICE_REQUIRED` when not public.

Stripe BR fees revalidated from stripe.com/br/pricing (cards 3.99%+R$0.39, Pix 1.19% invite-only). Tax: `TAX_REQUIRES_ACCOUNTING_CONFIRMATION`.

Play BR policy: `docs/commercial/google-play-billing-policy-brasil.md` — User Choice eligibility **UNCONFIRMED** for Longyu account; June 2026 fee split is US/EEA/UK first; BR rest-of-world date tracked as 2027-09-30 per Google table.

## Pricing

| Item | Decision |
|---|---|
| FREE | Real learning path; advanced depth behind Pro |
| PRO | Longyu Pro — full Journey / practice / mastery / speech / Hànzì / Culture deep |
| Monthly | R$ 17,00 / $5 (BALANCED) |
| Annual | R$ 170,00 / $50 (10× = 2 months free) |
| Trial | 7 days (recommended; code still 30 until OA wires change) |
| Family | **POST_LAUNCH** |
| Business | **POST_LAUNCH** |
| Lifetime | **NOT_NOW** |

Owner pack: `docs/commercial/oa-final-pricing.md` — **OPEN**.

## Economics

`docs/commercial/unit-economics.json` — web card margins healthy at BALANCED; Play 15% viable; User Choice+Stripe may stack fees unfavorably. Free/Pro MAU ladders included. Jev learner runtime cost = 0.

## Entitlements

Authority: server-only. State machine: `docs/commercial/entitlement-state-machine.json`. Providers: WEB_STRIPE / GOOGLE_PLAY (future) / PROMO / ADMIN_GRANT / FAMILY / BUSINESS as evidence sources. Account key: Supabase user id.

## Stripe

Shared `refuseStripeLive` on checkout + portal + webhook. Checkout still allowlists prices via `resolveAllowedPrice`. Portal binds customer to `user_id`. Webhook: signature + idempotent `stripe_event_id` + `assertRpc`. TEST catalog Price IDs still `PRICE_PENDING` until secrets set. **No live objects created.**

## Play

Code: `ANDROID_IN_APP_PURCHASE=DISABLED_FOR_BETA`. Spec product IDs in catalog. Server verify / RTDN / restore designed; not production-enabled. Policy PASS as research; enrollment NOT_RUN.

## Cross-platform

Design PASS (server entitlement unifies). Physical cross-provider purchase matrix: **NOT_RUN** (no live / no Play sell).

## Security

Live key refusal extended; client cannot send Price IDs; RLS select-own; no payment PII to Sentry by design. Gate kills cover forge paths. Full gitleaks/APK scan: run in CI / RC2.3.12 residual.

## Cloud blocker carryover

Explicit preserved: Batch A, backup, Batch B, Jev triage, cloud smoke, Auth redirects, Android OAuth, telemetry retention. `cloud.certification` remains **BLOCKED**.

## Live mode

**MUST remain disabled** until cloud PASS + OA-FINAL-PRICING + store compliance + billing test matrix.

## Final matrix

| Gate | Status |
|---|---|
| PRICING_RESEARCH_PASS | PASS |
| UNIT_ECONOMICS_PASS | PASS |
| FREE_TIER_DECIDED | PASS |
| PRO_TIER_DECIDED | PASS |
| FAMILY_DECIDED | PASS (POST_LAUNCH) |
| BUSINESS_DECIDED | PASS (POST_LAUNCH) |
| LIFETIME_DECIDED | PASS (NOT_NOW) |
| FINAL_PRICING_OWNER_APPROVAL | OWNER_ACTION_REQUIRED |
| COMMERCIAL_CATALOG_PASS | CODE_READY |
| ENTITLEMENT_AUTHORITY_PASS | PASS |
| ENTITLEMENT_STATE_MACHINE_PASS | PASS |
| STRIPE_TEST_PRODUCT_PASS | PASS (TEST catalog created; Edge secret wiring CONFIG_REQUIRED) |
| STRIPE_CHECKOUT_PASS | CODE_READY |
| STRIPE_PORTAL_PASS | CODE_READY |
| STRIPE_WEBHOOK_PASS | CODE_READY |
| PLAY_BILLING_CODE_PASS | CODE_READY (sell disabled) |
| PLAY_POLICY_PASS | PASS (research) |
| PLAY_SERVER_VERIFY_PASS | NOT_RUN |
| PLAY_RESTORE_PASS | NOT_RUN |
| CROSS_PROVIDER_PASS | NOT_RUN |
| DOUBLE_BILLING_GUARD_PASS | CODE_READY (design) |
| OFFLINE_ENTITLEMENT_PASS | CODE_READY (bounded cache design) |
| REFUND_CANCEL_PASS | CODE_READY (design) |
| PAYWALL_PASS | CODE_READY (purchase CTA frozen) |
| COMMERCIAL_PRIVACY_PASS | PASS |
| COMMERCIAL_SECURITY_PASS | PASS |
| BILLING_SUPPORT_PASS | PASS |
| WEB_PASS | CODE_READY |
| ANDROID_BUILD_PASS | CODE_READY |
| LIVE_MONETIZATION_READY | **BLOCKED** |
| OWNER_COMMERCIAL_ACCEPTANCE | OWNER_ACTION_REQUIRED |

`LIVE_MONETIZATION_READY` = BLOCKED. Commercial code state = **CODE_READY** / **CONFIG_REQUIRED**.
