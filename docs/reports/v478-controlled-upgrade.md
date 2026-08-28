# V4.7.8 — MandarimProject controlled backend upgrade (HOST-001…009)

**Longyu only.** Production: MandarimProject `drjcfalvlbbeblmmyhwj`.
This remessa does **not** apply migrations, deploy Edge Functions, set secrets,
flip `VITE_CLOUD_ONBOARDING_V2_ENABLED`, or write rows.

`LONGYU_BACKEND_RC` = **`v4.7.8-rc.1`**. Product `LONGYU_RC_VERSION` stays
`v4.7.4-rc.1` (`test:rc-hardening`). Placement version **2**.

Human token required before any write: `APPROVE_MANDARINPROJECT_BACKEND_UPGRADE`.
Without it, hosted keys stay `NOT_RUN` and remessa status is
`READY_FOR_CONTROLLED_UPGRADE`.

`STAGING_READY`, `PHYSICAL_QA_READY`, `PAYMENTS_READY`, and
`READY_FOR_CLOSED_BETA_BR` stay off this hosted board (`NOT_READY` / `NOT_RUN`).

## FASE 0

PR **#206** (`cursor/v477-backend-contract-freeze-3618`, HEAD `1823d7d`) **merged**
to `main` at `2026-08-28T03:30:52Z` as `0f2dfe4` after required Firefox E2E
passed. #205 commits landed with that merge (GitHub marks #205 MERGED).
#204 was already closed.

- `origin/main` at freeze: `0f2dfe453a10902449adaa262748d368839dce3a`
- V4.7.7 HEAD: `1823d7d6a96c021eb7a55a5c94cf480ce4590a1d`

## Scoreboard (hosted)

Values: PASS | FAIL | BLOCKED | NOT_RUN. Hosted cells stay **NOT_RUN** until a
later remessa applies with the approval token and live QA fills them. This
file does **not** invent PASS.

| Campo | Valor | Evidência |
| --- | --- | --- |
| `MANDARINPROJECT_SCHEMA_READY` | `NOT_RUN` | Watermark still `20260810175737`. Pending LOCAL_ONLY listed in `docs/reports/v478-migration-risk-plan.md`. |
| `MANDARINPROJECT_GRANTS_READY` | `NOT_RUN` | Production still has anon ALL on user-owned tables. Planned revoke is not applied. |
| `MANDARINPROJECT_RLS_READY` | `NOT_RUN` | RLS already on in production; negative matrix not run hosted. |
| `MANDARINPROJECT_EDGE_READY` | `NOT_RUN` | Missing `commit-placement`, `finalize-onboarding`, `submit-business-lead`. |
| `HOSTED_AUTH_READY` | `NOT_RUN` | Real mailbox / confirm not executed against MandarimProject. |
| `HOSTED_PLACEMENT_READY` | `NOT_RUN` | Placement tables/RPC/Edge absent on hosted. |
| `HOSTED_SYNC_READY` | `NOT_RUN` | Monotonic clamp trigger not on production. |
| `HOSTED_RECOVERY_READY` | `NOT_RUN` | Backup/PITR not taken this remessa (procedure recorded only). |
| `HOSTED_SECURITY_READY` | `NOT_RUN` | Advisors: security 0 ERROR / 44 WARN (pre-upgrade). HOST-031 later: no new ERROR. |

Remessa status: **`READY_FOR_CONTROLLED_UPGRADE`**.

## HOST-001 — backend RC freeze

Identity: `scripts/lib/v478-backend-rc.mjs` + `docs/backend/v478-backend-rc.json`
(regenerate with `npm run generate:backend-contracts`). Print live hashes with
`npm run v478:identity`.

`canonical_schema_hash` stays `NOT_RUN` until ephemeral
`rehearse:backend-contract` / CI fills it. Do not copy an invented hash.

If backend SQL/contracts change after this freeze, bump to `v4.7.8-rc.2`.

## HOST-002 / HOST-003 — mastery clamp

New file `supabase/migrations/20260828032249_progress_mastery_monotonic_clamp.sql`
(created with `supabase migration new`). Frozen
`20260828030000_progress_mastery_monotonic.sql` is unchanged.

- VALID LEVELS = integer **0..4**
- Sanitize: null, `""`, `"abc"`, array, non-object entry → 0
- `-1` → 0; `5`/`999` → 4; `2.5` → trunc then clamp (2)
- `search_path = ''`; names qualified; execute revoked from public/anon/authenticated
- BEFORE **INSERT OR UPDATE** so the first write is clamped

Offline: `npm run test:mastery-monotonic-contract`.
Live (ephemeral): `runMalformedMasteryMatrix` inside `rehearse:backend-contract`.

## HOST-004…007

- Snapshot: `docs/reports/v478-predeployment-snapshot.md` (counts only, no PII)
- Delta: regenerate via `classifyMigrationDrift` + `describeProductionDelta`
- Risk: `docs/reports/v478-migration-risk-plan.md`
- Backup: procedure only; no production backup was taken

## HOST-008

`netlify.toml` `[context.production]` keeps `VITE_CLOUD_ONBOARDING_V2_ENABLED = "false"`.
Backend may be planned without flipping public onboarding.

## HOST-009 — STOP

See `docs/reports/v478-human-gate.md`. HOST-010+ (apply one-by-one, Edge deploy,
hosted auth/placement/sync) is **blocked** until the exact approval token.

## Production writes

**ZERO.** Read-only MCP/SQL refreshed 2026-08-28T03:22Z. No `apply_migration`,
no Edge deploy, no secret writes, no Stripe Live.
