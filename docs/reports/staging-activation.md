# Staging Activation Log (Longyu)

Longyu production: MandarimProject `drjcfalvlbbeblmmyhwj` — **HARD FAIL** as a staging/rehearsal target (`REFUSING_TO_USE_PRODUCTION_AS_STAGING`).

Remote staging is optional (`LONGYU_STAGING_PROJECT_ID`, no default). Missing value = `BLOCKED_REMOTE_STAGING`. Ephemeral validation is `npm run rehearse:ephemeral`.

## V4.7.6R

See `docs/reports/v476r-longyu-backend-rehearsal.md`.

| ID | Status | Nota |
| --- | --- | --- |
| STAGE-001 | `BLOCKED_REMOTE_STAGING` | No isolated Longyu remote configured |
| STAGE-002 | ephemeral | Local migration chain in CI |
| STG-006 schema | ephemeral | `SCHEMA_READY` on the ephemeral board |
| Edges | do not deploy to MandarimProject this remessa | `commit-placement` / `finalize-onboarding` / `submit-business-lead` remain production-missing |

## Earlier notes (Longyu-only)

`STAGING_READY` is not a synonym of `EPHEMERAL_DB_READY`. Closed beta remains `NOT_READY`.
