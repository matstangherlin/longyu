# Google Play billing policy — Brasil (RC2.3.11)

| Field | Value |
|---|---|
| verifiedAt | `2026-10-09T01:50:00Z` |
| wave | RC2.3.11 |
| productionWrite | false |
| Longyu Play account eligibility | **UNCONFIRMED** — do not enable User Choice / alternative billing until Console enrollment proves eligibility |

## Official sources consulted

1. [Service fees](https://support.google.com/googleplay/android-developer/answer/112622)
2. [Understanding Google Play's lower service fees](https://support.google.com/googleplay/android-developer/answer/16954621)
3. [User choice billing pilot enrollment](https://support.google.com/googleplay/android-developer/answer/12570971)
4. [Understanding user choice billing](https://support.google.com/googleplay/android-developer/answer/13821247)
5. [Billing choice program enrollment](https://support.google.com/googleplay/android-developer/answer/17161464)
6. [Expanded billing choice and lower fees (Android Developers Blog)](https://developer.android.com/blog/posts/expanded-billing-choice-and-lower-fees-on-google-play)
7. [PT-BR: Como funciona a taxa de serviço](https://support.google.com/googleplay/android-developer/answer/11131145?hl=pt-br)

## Current fee model relevant to Brazil (as of verification date)

### Standard Play Billing (subscriptions)

- Auto-renewing subscriptions: **15%** service fee (current worldwide subscription rate cited in Play Console Help).
- 15% first-$1M tier for non-subscription digital goods still exists for enrolled developers; subscriptions already sit at 15% regardless of revenue in the current table.
- **Do not assume** Longyu is enrolled in any reduced program until Console shows it.

### User Choice / alternative billing (Brazil)

- Brazil is listed among user-choice / alternative billing pilot markets.
- For Brazil (non-EEA pilot markets): **non-gaming mobile/tablet apps** qualify for user choice.
- When the user pays via alternative billing: standard service fee is **reduced by 4%** (example from Google: 15% → 11%).
- Alternative Billing APIs are **required** (manual reporting sunset already passed for BR cohort).
- Transactions must be reported to Google per program rules (historically within 24h — reconfirm in current API guide at enrollment time).

### 2026 fee restructuring (critical)

- Starting **2026-06-30**, Google separates **service fee** from **billing fee** for **EEA, UK, US** first.
- New structure (those regions): subscriptions often **10% service + 5% Play billing fee** when using Play Billing; alternative/external paths omit the billing fee but still pay service fee.
- Regional rollout for “rest of world” (includes Brazil for the new fee split) is listed as **2027-09-30** in Google’s lower-fees rollout table.
- Until Brazil’s rollout date, **do not code Brazilian economics as if the June 2026 US/EEA/UK table already applies**.

### External offers / web links

- Distinct programs exist (EEA external offers, US external content links, newer billing choice).
- Brazil’s current pilot framing is **user choice billing** (Play + alternative), not automatic entitlement to US/EEA external-link fee tables.
- **Honoring an entitlement purchased on the web** (account login) is a different policy question from **selling digital goods inside the Android app**. Longyu’s beta decision (`ANDROID_IN_APP_PURCHASE=DISABLED_FOR_BETA`) already refuses in-app sell; web Pro recognition via server entitlement remains the designed path.

## Architecture decision status

| Option | Description | Decision |
|---|---|---|
| A | Play Billing on Android + Stripe on Web | **DEFAULT CANDIDATE** for launch after cloud PASS |
| B | Play Billing + User Choice Billing in Brazil | **ELIGIBILITY_REQUIRED** — do not implement until Console enrollment confirmed |
| C | Other program (external links only, etc.) | **NOT SELECTED** without eligibility proof |

## Required APIs (if/when selling on Play)

- Google Play Billing Library (current major; do not ship deprecated BillingClient APIs)
- Play Developer API purchase verification (server)
- Real-Time Developer Notifications (RTDN) strongly recommended for subscription lifecycle when app closed
- Alternative Billing APIs **only if** enrolled in user choice

## Effective dates to track

| Date | What |
|---|---|
| Already in force | BR user choice pilot exists; Alternative Billing APIs required for participants |
| 2026-06-30 | New service+billing fee split begins (EEA/UK/US) |
| 2026-09-30 | Further regional expansion (AU/JP per Google table) |
| 2027-09-30 | Rest-of-world fee split (includes BR unless Google updates) |

## Longyu implication

1. Keep `ANDROID_IN_APP_PURCHASE=DISABLED_FOR_BETA` until Play product IDs + server verify + owner store actions complete.
2. Do **not** enable User Choice Billing code paths without `OA-PLAY-BILLING-COMPLIANCE` + eligibility evidence.
3. Unit economics model Play margin at **15%** (Play-only) and optionally **11% + Stripe fees** for alternative path — latter only if eligible.
