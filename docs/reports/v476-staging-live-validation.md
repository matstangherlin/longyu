# V4.7.6 / V4.7.6R — Live staging vs ephemeral (Longyu only)

Atualizado em: 2026-08-28

Longyu production backend: **MandarimProject** `drjcfalvlbbeblmmyhwj`.

This repository does not name, guard, or hardcode any other product.

## Two validation modes (do not mix scoreboards)

### A — `EPHEMERAL_BACKEND_VALIDATION`

Local/CI Supabase (`supabase start` / `db reset`). No remote project. No production DB password.

See `docs/reports/v476r-longyu-backend-rehearsal.md`.

### B — `LIVE_STAGING_VALIDATION`

Requires `LONGYU_STAGING_PROJECT_ID` pointing at an isolated Longyu remote **≠** MandarimProject.

No default remote id. If unset: **`BLOCKED_REMOTE_STAGING`**.

That block does **not** stop ephemeral rehearsal.

## Live scoreboard (this remessa)

| Campo | Valor |
| --- | --- |
| `LIVE_STAGING_VALIDATION` | `BLOCKED_REMOTE_STAGING` |
| `STAGING_READY` | `BLOCKED_REMOTE_STAGING` (not a synonym of `EPHEMERAL_DB_READY`) |
| `AUTH_READY` | `NOT_RUN` — real email / new tab needs a hosted Longyu backend |
| `PLACEMENT_READY` | `NOT_RUN` on hosted staging; ephemeral RPC is a different board |
| `SYNC_READY` | `NOT_RUN` for true cross-device hosted cloud |
| `SECURITY_STAGING_READY` | `BLOCKED_REMOTE_STAGING` |
| `PHYSICAL_QA_READY` | `NOT_RUN` |
| `PAYMENTS_READY` | `NOT_RUN` |
| `READY_FOR_CLOSED_BETA_BR` | `NOT_READY` |

Guard token: `REFUSING_TO_USE_PRODUCTION_AS_STAGING`.

Destructive remote ops also require `LONGYU_TARGET_PROJECT_ID` (or staging id) and refuse production.

## AUTH fixture vs real email

Admin `email_confirm` in harnesses is a **FIXTURE**. It does not replace AUTH-013 provider email in a new tab.

## Placement authority

`scripts/v476-placement-authority.mjs` + Edge `commit-placement` use `evaluatePlacementEvidence`. Client `score` / `skippedLessonIds` / `masteredByPlacement` are ignored.

OBS-027: correlation id is generated with Web Crypto **before** `functions.invoke`. Covered by `npm run test:ops-correlation-crypto`.

## What still needs a hosted Longyu backend

- Real confirmation email
- True cross-device cloud
- Provider-delivered auth email
- External Stripe webhook
- Physical device against hosted backend

Harnesses preserved (Longyu-only): migration apply, schema assertion, secret audit, placement authority, auth identity, sync identity, RLS, live validation runner.
