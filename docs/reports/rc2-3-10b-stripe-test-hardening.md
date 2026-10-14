# RC2.3.10B - Stripe TEST-mode hardening audit

Scope: `supabase/functions/create-checkout-session`, `create-billing-portal`, `stripe-webhook`, plus `src/commercial/billing.ts` (price authority) and `apply_subscription_event` (ordering). Static read of the repo versions. **No Stripe API call, no Stripe MCP call, no live product, no key read.** The deployed copies are v10 / v9 / v11 and were not compared (`docs/launch/rc2-3-10b-edge-parity.json`).

## Verdict

| Area | Result |
|---|---|
| Server authority (who pays, what plan, what price) | `PASS` (code) |
| Ownership (user to customer to subscription) | `PASS` (code), one gap: checkout never reuses the customer |
| Price allowlist | `PASS` (code), one product gap: market comes from a client-supplied country |
| Webhook signature | `PASS` (code) |
| Idempotency | `PASS` for transactions; subscription events rely on the RPC |
| Ordering | `PASS` (RPC: `event.created` then `event.id`, row lock) |
| Error handling on the webhook | `GAP`: RPC errors are swallowed and the function answers 200 |
| No live keys | `PASS` in the repo, `GAP` in 2 of 3 functions (no runtime refusal) |
| Deployed parity | `NOT_RUN` (deployed bodies never read) |

Monetization stays frozen until RC2.3.11. Nothing below needs a deploy now.

## 1. Server authority

| Rule | Evidence |
|---|---|
| Identity comes from the JWT, never from the body | checkout and portal build a user-scoped client from the `Authorization` header and call `auth.getUser()`; no `user_id` is read from the request. `verify_jwt = true` is the Supabase default for both (absent from `supabase/config.toml`). |
| Client cannot choose price, currency, amount, coupon or provider id | `resolveAllowedPrice` rejects `priceId`, `clientPriceId`, `providerPriceId`, `currency`, `amount`, `amountMinor`, `billingMarket`, `discount`, `coupon`, `promotionCode` with `CLIENT_PRICE_OVERRIDE` (`src/commercial/billing.ts`). |
| Provider price ids exist only server-side | `buildServerPriceMatrix` reads `STRIPE_PRICE_<PLAN>_<CYCLE>_<MARKET>` from the Edge environment; slots stay `PRICE_PENDING` until set and the function answers 409 `PRICE_PENDING`. |
| Amount drift fails closed | If `LONGYU_PRICE_<...>_MINOR` disagrees with the approved public catalog the slot becomes `PRICE_MISMATCH` and checkout answers `PRICE_MISMATCH` (400). |
| Entitlement is server-derived | The webhook (service role) is the only writer of `subscriptions` / `transactions`; the client has `select` on own rows only (`subscriptions_select_own`, `transactions_select_own`). Pro is computed by `get_server_entitlement` from the stored status, never from a client claim. |
| Trial and mode are server constants | `mode=subscription`, `trial_period_days=30` are set in the function. |

## 2. Ownership

- Checkout binds the Stripe session to the caller with `client_reference_id = user.id` (from the JWT). The webhook trusts that id only after signature verification, so a third party cannot attach a session to another user.
- Billing portal resolves `stripe_customer_id` with the service role by `subscriptions.user_id = <JWT user>` (latest `updated_at`), so a caller can only open the portal for a customer stored against their own row. No customer id is accepted from the client.
- Webhook subscription events resolve the user from `subscriptions.stripe_subscription_id`; invoice events likewise.
- Gap: checkout passes `customer_email` instead of `customer`, so every checkout can create a new Stripe customer; the portal then opens only the customer of the newest subscription row. Reuse the stored customer when one exists.

## 3. Price allowlist

- Plan: `pro` or `family` only; cycle: `monthly` or `annual`; country: two letters. Anything else throws `UNKNOWN_PLAN` / `UNKNOWN_CYCLE` / `UNKNOWN_BILLING_COUNTRY` (400).
- Market is `BR` only for country `BR`, otherwise `INTERNATIONAL`; currency follows the market. Approved catalog (public, in the bundle by design): pro BRL 17.00 / 170.00, USD 5.00 / 50.00; family BRL 27.00 / 270.00, USD 8.00 / 80.00.
- `returnPath` must match `^/[A-Za-z0-9\-/_?=&%]*$` and is appended to an allowlisted origin, so it cannot leave the site. Unknown `Origin` falls back to the canonical origin.
- Gap (product): `billingCountry` is chosen by the client and is explicitly `authoritative: false`. A buyer outside Brazil can claim `BR` and pay BRL 17.00 (about USD 3) instead of USD 5.00. Derive the market from a server fact (`profiles.country_code` set by the placement handoff, or Stripe billing address checked after payment) before pricing goes live.
- Gap (product): `family` checkout would grant Pro to the payer only; the family-sharing backend is absent in production (`docs/launch/rc2-3-10b-client-backend-call-graph.json`). Keep the family price slots unset.

## 4. Webhook signature

- `STRIPE_WEBHOOK_SECRET`, `STRIPE_SECRET_KEY`, service role and URL are required, otherwise 501.
- Missing `stripe-signature` header returns 400 before anything else runs.
- The raw body (`req.text()`) goes to `stripe.webhooks.constructEventAsync(body, signature, webhookSecret)`; failure returns 400. No database call precedes verification (gate `R25_stripe_webhook` asserts the order, header read and 501 path).
- `verify_jwt = false` is correct for a Stripe caller; the signature is the authentication.

## 5. Idempotency and ordering

- Transactions: `upsert(..., { onConflict: "stripe_event_id" })` so a redelivered event does not duplicate a row. This relies on a unique constraint on `transactions.stripe_event_id` (defined in `001_initial_schema.sql`); the production constraint was not read in this wave.
- Subscriptions: every path goes through `apply_subscription_event(..., p_event_created, p_event_id)`. The RPC locks the row (`for update`), returns `duplicate_event` for the same id, `terminal_canceled` for a late non-cancel event, and `stale` for an older `event.created`; same-second ties are broken by `event.id`. The history row `20260808134047 harden_subscription_event_ordering` is applied in production.
- Local mirrors pass: `test:subscription-webhook` (scenarios A-F, idempotency, ordering) and `test:subscription-event-ordering`.

## 6. Findings (ordered, none blocks beta)

| # | Severity at launch | Finding | Fix |
|---|---|---|---|
| 1 | High | `stripe-webhook` ignores the result of `admin.rpc("apply_subscription_event")` and of `lookupUserId`; an RPC error still returns `{ received: true }` (200), so Stripe never retries and the state is lost until the next event. | Check `error` and return 500 so Stripe retries; log the event id only. |
| 2 | Medium | Invoice events can arrive before the subscription row exists; the transaction is stored with `user_id = null` and never reconciled. | Return 500 (retry) when the subscription is unknown, or backfill `user_id` on later `customer.subscription.created`. |
| 3 | Medium | Market from client country (section 3). | Server-derived market. |
| 4 | Medium | No duplicate-subscription guard: checkout never reads `subscriptions`, so a user with an active plan can start a second one. | Refuse (409) when an active/trialing subscription exists; send them to the portal. |
| 5 | Medium | `trial_period_days=30` is applied to every checkout, including users who already had a trial. | Decide trial policy in RC2.3.11; enforce with a server record. |
| 6 | Low | Only checkout refuses `sk_live_` (503 "Stripe Live is disabled"); `create-billing-portal` and `stripe-webhook` do not check the key mode. | One shared guard in all three until the live decision. |
| 7 | Low | No Stripe `Idempotency-Key` on session creation; a double click creates two sessions. | `Idempotency-Key: checkout:<user>:<plan>:<cycle>:<day>`. |
| 8 | Low | `DEFAULT_BETA_ORIGINS` keeps `localhost` and the Netlify default host in production. A caller controls only their own `Origin`, so it is not exploitable, but it widens the allowlist. | Drop localhost from production via `STRIPE_ALLOWED_ORIGINS`. |
| 9 | Low | Error bodies echo `session.error.message` (Stripe) and raw `error.message` on 500. | Map to stable codes. |
| 10 | Low | `scripts/test-stripe-e2e.mjs` still documents `STRIPE_PRICE_PRO_MONTHLY`; the server reads `STRIPE_PRICE_PRO_MONTHLY_BR` etc. (`scripts/lib/stripe-price-slots.mjs`). Following the script leaves checkout on `PRICE_PENDING`. | Update the script to the eight slot names. |

Findings 1, 2, 4 and 7 change the deployed behaviour of billing functions; they belong to RC2.3.11 with a Stripe TEST end-to-end rehearsal, not to this wave.

## 7. No live keys

- Repo scan (`R23_stripe_keys`, run over every tracked and untracked text file): no `sk_live_` / `rk_live_` / `pk_live_` / `whsec_` secret shape. `.gitleaks.toml` allowlists only the 20-character filler `sk_live_abcdefghijklmnop1234`, which the shape rule (24+ characters) does not match.
- `docs/release/product-truth.json`: `commercial.stripe = { status: ACCOUNT_VERIFIED, mode: test }`, `pricingDecision = NOT_RUN`, `certifications.monetization = null` (gate `R42_monetization`).
- `docs/release/owner-actions.json`: `OA-STRIPE-ACCOUNT-CONFIRM` is open; the owner has not confirmed which Stripe account backs the Edge secrets. Edge secret names are unreadable from the agent (`OA-EDGE-SECRET-NAMES`), so whether `STRIPE_SECRET_KEY` is set in production is unknown. Production vault holds only `TURNSTILE_SECRET_KEY` and `TYPESAFE_API_KEY`.
- No Stripe product, price, customer or webhook endpoint was created or read in this wave. The Stripe MCP (account Noba, `livemode: false`) was not needed because every conclusion above is a code fact; an inventory belongs to the RC2.3.11 rehearsal.

## 8. Evidence

- Code: `supabase/functions/create-checkout-session/index.ts`, `create-billing-portal/index.ts`, `stripe-webhook/index.ts`, `src/commercial/billing.ts`.
- RPC: production history `20260808134047_harden_subscription_event_ordering`; repo `supabase/migrations/20260808130100_harden_subscription_event_ordering.sql`.
- Tests run for this report: `node scripts/test-commercial-pricing.mjs`, `test-subscription-webhook.mjs`, `test-subscription-event-ordering.mjs`, `test-commercial-product-truth.mjs`, `test-v486-commercial-foundation.mjs` (all pass).
- Gate: `npm run gate:rc2-3-10b` mutates the webhook (unsigned events, missing signature rejection, idempotency key, secret requirement), the checkout live-key refusal, Stripe key shapes in the repo, and the monetization flags.
