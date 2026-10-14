# Billing support runbook (RC2.3.11)

| Field | Value |
|---|---|
| Mode | TEST until LIVE gate |
| Authority | Server entitlement + provider evidence |
| Never ask learner for | full card numbers, CVV, full purchase tokens, Stripe secrets |

## Safe diagnostic fields (QA / support)

- Supabase user id
- Canonical entitlement source + status
- Product key (`longyu_pro_monthly` …)
- Billing environment (`TEST` / `LIVE`)
- Last entitlement refresh timestamp
- Stripe customer id suffix (last 4) if present
- Play order id suffix if present
- Support case code (internal)

Never log: raw purchase token, webhook secret, full PAN, government ID.

## Flows

### Charged but Free

1. Confirm provider (Stripe Dashboard test/live vs Play order).
2. Confirm webhook/RTDN delivery.
3. Refresh `get_server_entitlement`.
4. If provider ACTIVE and DB expired → reconcile (do not tell user to pay again).
5. If duplicate providers → flag `DUPLICATE_PROVIDER_SUBSCRIPTION`.

### Cannot restore (Android)

1. Confirm same Google account + same Longyu account.
2. Run restore / owned purchases reconcile (when Play selling enabled).
3. Server verify purchase token (idempotent).
4. If web purchase: login to same Longyu account — Play restore is not required.

### Duplicate subscription

1. Do not auto-cancel either side.
2. Flag for support; prefer canceling the newer unintended purchase with refund if within policy.
3. Keep entitlement ACTIVE while either valid evidence remains.

### Refund request

1. Prefer provider tools (Stripe Dashboard / Play refund).
2. Expect entitlement → REVOKED / EXPIRED after provider event.
3. Progress data remains.

### Cancel

1. Active until period end unless provider says otherwise.
2. UI copy: “Seu Pro permanece ativo até …”.

### Payment failed

1. Honor provider grace / `past_due` if present.
2. Do not instantly destroy access on transient bank failure.

### Wrong account

1. Never move purchase by email alone.
2. Support-mediated remapping only with provider proof + admin audit grant.

### Delete account while subscribed

1. Warn: subscription may continue at provider until canceled.
2. Offer cancel-via-portal / Play subscription center before deletion.
3. Never leave zombie billing without a recovery path documented in deletion UI.

## Closed beta commercial mode

**TEST PURCHASES ONLY** or **FREE ONLY** — no real charges required for pedagogy beta validation.
