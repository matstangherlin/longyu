# RC Change Policy — RC2.3.12 Feature Freeze

| Field | Value |
|---|---|
| Effective | `2026-10-09T02:19:59Z` |
| RC ID | `RC2.3.12-RC1` |
| Parent | PR #326 |
| Mode | FEATURE FREEZE |

## Allowed after freeze

| Class | Examples | Allowed? |
|---|---|---|
| **P0** | security, data loss, crash blocker | Yes — must fix |
| **P1** | broken core learning flow | Yes — must fix |
| **P2** | serious UX / compatibility | Yes — justified |
| **P3** | polish, nice-to-have copy | No churn without owner reason |

## Explicitly forbidden in RC

- New game mode / gamification / currency
- New Social / Family / Business features
- New Hànzì mode / Speech architecture / Culture architecture / Mastery engine
- Jev learner runtime
- New curriculum / lesson content
- Live Stripe / Play production purchase activation

## Commercial

`MONETIZATION_MODE=TEST`. Live billing forbidden (`LIVE_MONETIZATION_REQUIRES_CLOUD_PASS`).
Android IAP remains `DISABLED_FOR_BETA` for Closed Beta unless owner revises.
