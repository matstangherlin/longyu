# RC2.3.11 — Pricing decision (recommended)

| Field | Value |
|---|---|
| Status | **RECOMMENDED — pending `OA-FINAL-PRICING`** |
| Live | **FORBIDDEN** until cloud PASS + owner approval + store compliance + billing matrix |
| Catalog source | `src/commercial/billing.ts` `PUBLIC_COMMERCIAL_CATALOG` |
| Freeze file | `docs/commercial/commercial-pricing-v1.json` |
| Economics | `docs/commercial/unit-economics.json` |
| Competitors | `docs/commercial/competitor-pricing-snapshot.json` |
| verifiedAt | 2026-10-09 |

## Research summary

Serious Mandarin wallet peers (HelloChinese Premium ~$11.99/mo / $69.99/yr US App Store; SuperChinese PLUS ~$11.99/mo; Skritter ~$14.99/mo / $99.99/yr; Du Chinese ~$14.99/mo) sit well above Longyu’s proposed BR **R$17/mo** and USD **$5/mo** baselines. That is intentional for Brazil-first accessibility, not a race to HelloChinese USD ARPU.

BRL store prices for competitors are often only visible inside authenticated Play/App Store UI → recorded as `STORE_PRICE_REQUIRED` rather than invented.

Stripe BR (standard public pricing): domestic cards **3.99% + R$0.39**; Pix **1.19%** (invite-only); tax **TAX_REQUIRES_ACCOUNTING_CONFIRMATION**.

Play BR: subscriptions currently model at **~15%** service fee; User Choice reduces Google’s cut by **4%** but stacks Stripe fees and requires enrollment — **not enabled**.

## FREE tier

FREE must teach real Mandarin: initial Journey access, fundamental pronunciation, basic Hànzì, selected Culture, daily practice, limited Review. Value moments (audio, visual, tone, Hànzì, context) before paywall. No paywall on tech recovery / speech fallback / sync / security.

Limit type: **advanced-feature + phase depth**, not destructive hearts or demo-only first session.

## PRO tier — Longyu Pro

Full Journey, unlimited practice, Personal Mastery recommendations, advanced speech practice, full Hànzì lab, Culture deep content, advanced review, progress insights. Offline/downloads only if technically supported later — do not sell vapor.

Product brand: **Longyu Pro** only (not Premium/Plus/VIP simultaneously).

## Family / Business / Lifetime

| Plan | Decision | Why |
|---|---|---|
| Family | **POST_LAUNCH** | Code exists; prod tables missing; seat/invite complexity; do not block consumer launch |
| Business | **POST_LAUNCH** | Pilot/contract only; no self-serve checkout |
| Lifetime | **NOT_NOW** | Cloud + maintenance + future AI; 5/10/15y sims hostile vs permanent lifetime; founding lifetime only if owner later caps window/quantity honestly |

## Options

| Option | Monthly BRL | Annual BRL | Effective mo | Trial |
|---|---|---|---|---|
| VALUE | 12,90 | 129,00 | 10,75 | 7d |
| **BALANCED (recommended)** | **17,00** | **170,00** | **14,17** | **7d** |
| PREMIUM | 24,90 | 249,00 | 20,75 | 7d |

Annual = **10× monthly** (two months free equivalent) — already the catalog contract (`ANNUAL_EQUIVALENT_MONTHS = 10`). Not an arbitrary “50% off”.

Psychological `,90` endings tested in VALUE/PREMIUM; BALANCED keeps clean integers already shipped in public catalog to avoid UI/catalog churn before OA.

Trial comparison: 0 (hurts conversion), 3 (short for Mandarin value), **7 (recommended)**, 14 (abuse/cost). Server-side only; no reset on reinstall. Code today hardcodes 30 days → reduce to 7 after OA before final TEST e2e.

## Providers

| Surface | Provider | Mode |
|---|---|---|
| Web | Stripe Checkout + Portal + Webhook | **TEST** (`sk_live_` refused on checkout/portal/webhook) |
| Android | Play Billing | **DISABLED_FOR_BETA**; design Option A after eligibility |
| User Choice BR | — | **ELIGIBILITY_REQUIRED** — do not implement |

## Entitlement

One authority: **server** (`get_server_entitlement` / `apply_subscription_event`). Providers are evidence only. Account authority = Supabase user id (not email). Cross-platform: same user sees Pro on Web and Android. Double billing → warn/flag `DUPLICATE_PROVIDER_SUBSCRIPTION`, no silent second charge.

## Owner approval pack — `OA-FINAL-PRICING`

Approve or reject as a single decision:

1. Monthly BRL **17,00**
2. Annual BRL **170,00** (effective **14,17**/mo; 2 months free)
3. Trial **7 days**
4. Family **POST_LAUNCH**
5. Business **POST_LAUNCH**
6. Lifetime **NOT_NOW**
7. Web **Stripe**; Android **Play later / disabled now**
8. Gross margin: web card BR monthly ~**high 80%s** before tax; Play 15% still healthy (see `unit-economics.json`)

Until signed: `pricingDecision` remains `NOT_RUN`; `MONETIZATION_MODE=TEST`; no live products published.
