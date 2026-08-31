# V4.8.6 — International Pricing + Family Foundation

Base: `main@f9414f6db4cca847fb2f21f0935dc896ffbd51b2`

Scope: domain contracts, commercial UI, source-only checkout contract, tests, and documentation. No migration was added or applied, no Edge Function was deployed, no hosted Supabase project was written, and no Stripe charge or Live Mode operation was performed.

## Scoreboard

| Gate | Result |
|---|---|
| `BILLING_MARKET_CONTRACT_READY` | PASS |
| `BRL_MARKET_READY` | PASS |
| `USD_MARKET_READY` | PASS |
| `LOCALE_MARKET_SEPARATION_READY` | PASS |
| `PRICE_MATRIX_READY` | PASS |
| `SERVER_PRICE_AUTHORITY_CONTRACT_READY` | PASS |
| `PRO_PLAN_READY` | PASS |
| `FAMILY_PLAN_CONTRACT_READY` | PASS |
| `FAMILY_ENTITLEMENT_READY` | PASS |
| `FAMILY_PROGRESS_ISOLATION_READY` | PASS |
| `MONTHLY_ANNUAL_READY` | PASS |
| `PRICING_PT_BR_READY` | PASS |
| `PRICING_EN_READY` | PASS |
| `PRICING_ZERO_MIXED_LANGUAGE_READY` | PASS |
| `STRIPE_TEST_CONTRACT_READY` | PASS |

## Billing contract

- `InterfaceLocale`, `BillingMarket`, `BillingCurrency`, and `TargetLanguage` are separate types.
- Billing country is the market authority: `BR` resolves to `BR/BRL`; every other valid ISO alpha-2 country initially resolves to `INTERNATIONAL/USD`.
- Interface language, browser language, timezone, and `navigator.language` are absent from server price resolution.
- Account country, explicit choice, and approximate geolocation may only suggest a pre-checkout market. Suggestions are marked non-authoritative.
- The stable product catalog is `free`, `pro`, `family`, `business`, `enterprise`. Pro and Family expose `monthly` and `annual` price slots.
- No final prices were approved. Every slot is `PRICE_PENDING`, has `amountMinor: null`, and has no provider price ID. The UI checkout is disabled.
- The DEV/QA market switch is gated by the existing fail-closed environment policy and is absent from Production Beta.
- Currency formatting receives `currency` and `interfaceLocale` separately and uses `Intl.NumberFormat`.
- Annual savings are computed from monthly and annual amounts. No marketing discount is stored or displayed while prices are pending.

## Server authority and Stripe Test contract

The semantic client request is:

```json
{
  "plan": "pro | family",
  "cycle": "monthly | annual",
  "billingCountry": "ISO-3166-1 alpha-2",
  "returnPath": "/pro"
}
```

`resolveAllowedPrice` rejects unknown plans, cycles, invalid countries, client market overrides, currency/amount overrides, and arbitrary `priceId`, `clientPriceId`, or `providerPriceId` fields. The server builds its matrix only from server configuration and returns `PRICE_PENDING` until both an approved amount and provider price exist.

The planned response contains only `checkoutUrl`, `resolvedPlan`, `resolvedMarket`, and `resolvedCurrency`. Provider price IDs and secrets are not returned. Source explicitly fails closed if `STRIPE_SECRET_KEY` is a Live Mode key. This source was not deployed in this wave.

## Family product contract

- Longyu Family is one subscription with independent user accounts, not a shared account.
- `FAMILY_MAX_MEMBERS = 5` is a configurable product constant: one owner plus up to four members by the initial recommendation.
- The owner counts as a member, pays, manages invites/members/billing, and cannot remove themself before a future ownership transfer or cancellation policy is used.
- A user may belong to at most one active Family. Duplicate memberships and member-limit overflow are rejected.
- Invite contract: `id`, `familyId`, `invitedEmail`, `status`, `expiresAt`; statuses are `pending`, `accepted`, `expired`, `revoked`.
- Membership contract: `familyId`, `userId`, `role`, `status`, `joinedAt`; roles are `owner`, `member`.
- Family membership grants Pro features through `family_membership`; it does not create a Stripe subscription for each member.
- Entitlement sources are modeled independently from Stripe existence: `individual_subscription`, `family_membership`, `business_seat`, `enterprise_seat`, `promotion`.
- Membership operations have no learning-state input. Tests prove they do not modify another member's `lessonMasteryById`, SRS, completed lessons, XP, Qi, or streak.
- Removing a member removes Family entitlement only. The owner remains entitled and all learning progress remains untouched.
- The owner has no automatic access to lesson answers, mistakes, SRS detail, conversation history, or personal study data.
- `CHILD_ACCOUNT_POLICY = FUTURE_DECISION`; this wave adds no parental controls or unnecessary age collection.

## Lifecycle policies

- Changing account country does not silently alter an existing subscription.
- Existing subscriptions retain provider price, currency, and billing terms until an explicit migration.
- Market affects new checkout and any future renewal/migration only according to a separately approved policy.
- Family uses the same Journey, lessons, mastery, and SRS as individual accounts. There is no curriculum or content fork.

## Verification evidence

- `npm run typecheck` — PASS
- `npm run validate:i18n` — PASS (`1805` keys)
- `npm run test:v486-commercial` — PASS
- `npm run validate:plans` — PASS
- `npm run validate:en-core-surfaces` — PASS, `REAL_UI_LEAKS_CORE_EN = 0`
- `npm run validate:journey-en` — PASS (topics 1–80 remain covered by the existing fail-closed Journey gate)
- `npm run test:backend-contract` — PASS after regenerating `docs/backend/edge-contract.json` for `create-checkout-session`

Final build and CI are recorded on the pull request. Human approval is required before merge.
