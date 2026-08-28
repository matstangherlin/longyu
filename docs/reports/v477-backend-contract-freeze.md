# V4.7.7 — Backend contract freeze + migration drift reconciliation

**Longyu only.** Production backend: MandarimProject `drjcfalvlbbeblmmyhwj`.
This remessa does **not** apply migrations, deploy Edge Functions, set secrets,
or write rows on MandarimProject.

Answers the two acceptance questions:

1. If we promote the current repo backend to MandarimProject, **exactly what changes?**
   → `docs/reports/mandarimproject-deployment-plan.md` + `docs/reports/migration-drift-inventory.md`
2. Can we **reproduce and audit** that backend from the repo?
   → frozen migration hashes + canonical schema dump + RPC/Edge contracts + ephemeral CI

Mailbox used by local auth: **Inbucket** at `127.0.0.1:54324` (Supabase CLI default),
not Mailpit. Same job as a confirmation inbox.

`STAGING_READY` is **not** on this board and is not implied by ephemeral PASS.

## Scoreboard

Values: PASS | FAIL | BLOCKED | NOT_RUN. Live cells stay NOT_RUN until
`npm run rehearse:backend-contract` / GitHub Actions `backend-contract` fills
`docs/reports/v477-backend-contract-scoreboard.json`. This file does **not** invent PASS.

| Campo | Valor | Evidência |
| --- | --- | --- |
| `MIGRATION_HISTORY_UNDERSTOOD` | `PASS` (offline) | 8 REMOTE_ONLY + 21 LOCAL_ONLY classified A/C or LOCAL_REPLAY / RENAMED / SUPERSEDED / NOT_YET_DEPLOYED. No UNKNOWN. |
| `HISTORICAL_MIGRATIONS_FROZEN` | `PASS` (offline after generate) | `docs/backend/migration-manifest.json` sha256 of every `supabase/migrations/*.sql`. Rebaseline = edit the manifest in the same PR. |
| `CANONICAL_SCHEMA_READY` | `NOT_RUN` | Requires ephemeral `supabase db reset` + `scripts/dump-canonical-schema.mjs`. Artifact: `LONGYU_BACKEND_SCHEMA_HASH`. |
| `GRANT_SURFACE_READY` | `NOT_RUN` | `20260828020000_least_privilege_api_grants.sql` + live grant assert. Production still has platform `GRANT ALL` to anon on user-owned tables. |
| `RLS_MATRIX_READY` | `NOT_RUN` | All listed sensitive tables have RLS in the local chain; negative matrix runs on ephemeral. |
| `RPC_CONTRACT_READY` | `NOT_RUN` | `docs/backend/rpc-contract.json` vs `pg_get_function_identity_arguments` (timestamptz normalized). |
| `EDGE_CONTRACT_READY` | `NOT_RUN` | 9 slugs hashed; live `finalize-onboarding` once/twice/concurrent + optional `create-account` with `TURNSTILE_ALLOW_SKIP=1`. |
| `SYNC_MONOTONICITY_READY` | `NOT_RUN` | Trigger `merge_progress_mastery_monotonic` GREATEST(level) + economy replay. Concurrent 2 then 1 must store 2. |
| `LOCAL_AUTH_FLOW_READY` | `NOT_RUN` | `signUp` on ephemeral Auth. Confirm via Inbucket, or admin-confirm fallback, or autoconfirm session. |
| `PRODUCTION_DEPLOYMENT_PLAN_READY` | `PASS` (offline) | `docs/reports/mandarimproject-deployment-plan.md` — ordered, not executed. |

## Historical 012 (FRESH_REPLAY_ONLY)

`012_pedagogy_consent_rpc_gate.sql` uses `DROP VIEW` then `CREATE VIEW` because
`CREATE OR REPLACE VIEW` cannot rename columns (`42P16`) on a fresh ephemeral replay.
Semantic view body matches hosted. **Do not re-apply 012 to MandarimProject.**

## Contracts

Regenerate with `npm run generate:backend-contracts`:

- `docs/backend/migration-manifest.json`
- `docs/backend/rpc-contract.json`
- `docs/backend/edge-contract.json`
- `docs/backend/grant-surface.json`

Offline gate: `npm run test:backend-contract` (also in `validate:beta`).
Live gate: `npm run rehearse:backend-contract` (GitHub Actions `backend-contract`, Node 22, CLI 2.34.3).

## Production writes

**ZERO.** Read-only MCP/SQL was used to classify drift and grants. No `apply_migration`,
no Edge deploy, no secret writes, no Stripe Live.
