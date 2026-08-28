# V4.7.6R — Longyu backend rehearsal + ephemeral validation

Generated at: 2026-08-28T01:06:41.149Z

- Repo SHA: `854658fbdc3e8008e2e9c053c25af2aec4bfb615`
- origin/main SHA: `b2a5818af1182277ac61c699970b1e3e868ded12`
- Production writes: **ZERO** (MandarimProject `drjcfalvlbbeblmmyhwj`)

## Scoreboard A — EPHEMERAL_BACKEND_VALIDATION

Filled by `npm run rehearse:ephemeral` / GitHub Actions `backend-rehearsal`. Values: PASS | FAIL | BLOCKED | NOT_RUN. `EDGE_LOCAL_READY` may be FOLLOW_UP.

| Campo | Valor |
| --- | --- |
| `EPHEMERAL_DB_READY` | `NOT_RUN` until CI/local `supabase start` |
| `MIGRATION_CHAIN_READY` | `NOT_RUN` until CI/local `supabase db reset` |
| `SCHEMA_READY` | `NOT_RUN` |
| `RLS_READY` | `NOT_RUN` |
| `RPC_READY` | `NOT_RUN` |
| `EDGE_LOCAL_READY` | `FOLLOW_UP` until the Edge job runs |
| `PRODUCTION_DELTA_KNOWN` | `PASS` |

`STAGING_READY` is **not** on this board and is not a synonym of `EPHEMERAL_DB_READY`.

## Scoreboard B — LIVE_STAGING_VALIDATION

| Campo | Valor |
| --- | --- |
| `LIVE_STAGING_VALIDATION` | `BLOCKED_REMOTE_STAGING` |
| `STAGING_READY` | `BLOCKED_REMOTE_STAGING` |

## Baseline

- schema hash: `ac47fed51a0ba25b5a650cf04e51f63bdadfddcb3194a936a609bc9fc0a25b87`
- drift: LOCAL_AND_REMOTE=26 REMOTE_ONLY=8 LOCAL_ONLY=18
- operational pending on MandarimProject: 20260812180000_production_help_telemetry.sql, 20260813180000_pearl_pro_economy.sql, 20260814010000_mastery_pass_telemetry.sql, 20260825043000_business_foundation.sql, 20260825062000_business_operational_hardening.sql, 20260826230000_placement_onboarding.sql, 20260827023000_placement_onboarding_handoff.sql

## Still requiring a hosted Longyu backend

- Real confirmation email
- True cross-device cloud against hosted API
- Provider-delivered auth email
- External Stripe webhook
- Physical device against hosted backend
