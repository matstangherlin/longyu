# V4.7.8B — MandarimProject controlled apply + hosted validation

**Longyu only.** Production backend: MandarimProject `drjcfalvlbbeblmmyhwj`.

This remessa **stopped at the human gate**. It does not apply migrations,
deploy Edge Functions, create a QA hosted frontend, or run live Auth /
Placement / Sync against production.

The sentence “O backend hospedado real do Longyu está atualizado e Auth +
Placement + Sync funcionam contra ele” is **not proven**. Hosted keys stay
`NOT_RUN`. No PASS is inferred from local/ephemeral automation.

`LONGYU_BACKEND_RC` remains **`v4.7.8-rc.1`**. Product `LONGYU_RC_VERSION`
stays `v4.7.4-rc.1`. Placement **v2**. Production
`VITE_CLOUD_ONBOARDING_V2_ENABLED` stays **false**.

Required token before any write: `APPROVE_MANDARINPROJECT_BACKEND_UPGRADE`.

## Scoreboard

Values: PASS | FAIL | BLOCKED | NOT_RUN. Hosted cells are **NOT_RUN**.
Backup: `MANUAL_LOGICAL_BACKUP_CREATED` / `MANUAL_LOGICAL_BACKUP_VERIFIED`
are **NOT_RUN**. `BACKUP_RECOVERY_GATE` is `WAITING_MANUAL_LOGICAL_BACKUP`
until both PASS (`PASS_WITH_MANUAL_LOGICAL_BACKUP`). Not PITR.

| Campo | Valor | Evidência |
| --- | --- | --- |
| `MANDARINPROJECT_SCHEMA_READY` | `NOT_RUN` | Watermark still `20260810175737`. Pending 11 files in `v478b-pending-delta.md`. |
| `MANDARINPROJECT_GRANTS_READY` | `NOT_RUN` | Live: anon still ALL on personal tables. Least-privilege not applied. |
| `MANDARINPROJECT_RLS_READY` | `NOT_RUN` | RLS on existing tables; hosted A≠B matrix not run. |
| `MANDARINPROJECT_EDGE_READY` | `NOT_RUN` | Missing `commit-placement`, `finalize-onboarding`, `submit-business-lead`. |
| `HOSTED_AUTH_READY` | `NOT_RUN` | Real mailbox / confirm not executed. |
| `HOSTED_PLACEMENT_READY` | `NOT_RUN` | Placement tables/RPC/Edge absent on hosted. |
| `HOSTED_SYNC_READY` | `NOT_RUN` | Monotonic clamp trigger absent. |
| `HOSTED_RECOVERY_READY` | `NOT_RUN` | Password recovery hosted QA not run. Backup gates still `NOT_RUN`. |
| `HOSTED_SECURITY_READY` | `NOT_RUN` | Pre-apply advisors: 0 ERROR / 44 WARN security; AFTER not run. |

Remessa status: **`WAITING_HUMAN_APPROVAL`**.

`PHYSICAL_QA_READY`, `PAYMENTS_READY`, and `READY_FOR_CLOSED_BETA_BR` stay
off this board (`NOT_RUN` / `NOT_READY`). Do not promote them in this remessa.

## Steps completed (0–8)

0. `git fetch origin main` — MAIN_SHA matches expected `3223d43`. Contract
   hashes match `docs/backend/v478-backend-rc.json`.
1. Reconsulted Actions on **this** SHA (refresh 05:45Z). MAIN_SHA CI run
   33143685565 **success**: Portão, build, Chromium, Firefox, WebKit,
   Security, backend-rehearsal, backend-contract **PASS**. #208 Portão on
   `9ca4047` **IN_PROGRESS**. No MandarimProject write: this FASE B prompt is
   **not** approval; backup remains `WAITING_MANUAL_LOGICAL_BACKUP` (dumps
   not confirmed). V4.7.9 was requested and **not started**.
2. No new architecture / i18n / pedagogy / auth / economy / redesign.
3. Read-only refresh: `docs/reports/v478b-preapply-live-state.md`.
4. Delta regenerated: `docs/reports/v478b-pending-delta.md`.
5. Inseparable pairs documented (grants 8→9, monotonic 10→11).
6. Backup gate: `docs/reports/v478b-backup-record.md` → Free Plan
   `MANUAL_LOGICAL` (`CREATED`/`VERIFIED` `NOT_RUN`;
   `BACKUP_RECOVERY_GATE=WAITING_MANUAL_LOGICAL_BACKUP`). Paid upgrade is
   not required for this remessa.
7. Deploy lock policy: `docs/reports/v478b-deploy-lock.md` (`DECLARED_NOT_ARMED`).
8. **STOP** — `docs/reports/v478b-human-gate.md`.

## Steps not run (9–34)

Apply one-by-one, live mastery matrix, grants live, RLS A≠B, Edge inventory
deploy, secrets (presence only in FASE B), QA frontend with onboarding true
**only** on QA, real signup, real email, handoff, idempotency, untrusted
client placement, true beginner, cross-browser sync, stale write, completed
lesson union, economy non-duplication, reload/offline/double-submit, password
recovery, observability, post-upgrade advisors, QA data registry.

## Production writes

**ZERO.** Read-only MCP/SQL refreshed 2026-08-28T05:14:56Z.
