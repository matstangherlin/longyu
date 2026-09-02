# V4.8.9 — Backup and recovery record

Identity: `backend-rc-v489-preapply`

Project: MandarimProject `drjcfalvlbbeblmmyhwj`

Production watermark: `20260810175737`

## Evidence captured without production writes

The database reported PostgreSQL 17.6, `wal_level=logical`, `archive_mode=on`, and a configured archive command. These properties are useful inventory only: they do not prove a current restorable backup, PITR entitlement, retention window, or a successful restore.

Fresh aggregate snapshot at `2026-09-01T23:48:15.668474Z` (no PII):

| Object | Count |
| --- | ---: |
| `auth.users` | 11 |
| `profiles` | 11 |
| completed onboarding profiles | 9 |
| `user_progress` | 10 |
| `user_srs` | 0 |
| `user_economy` | 9 |
| `subscriptions` | 1 |
| active subscriptions | 1 |
| `entitlement_grants` | 1 |
| `transactions` | 0 |
| `beta_pedagogy_events` | 618 |
| `beta_feedback` | 5 |

## Backup gate

| Gate | Status | Evidence / required action |
| --- | --- | --- |
| `NEW_LOGICAL_BACKUP_READY` | `BLOCKED` | Supabase CLI 2.109.1 is installed, but `supabase projects list` returned `Unauthorized`; no access token or database password was available. No credential was inferred or extracted. |
| `BACKUP_ARTIFACT_ENCRYPTED` | `NOT_RUN` | No dump was produced. Future artifact must be encrypted and stored outside the repository. |
| `BACKUP_RESTORE_VERIFIED` | `BLOCKED` | A backup cannot be called verified until it restores into an isolated non-production database and key counts/schema are checked. |
| `PITR_VERIFIED` | `BLOCKED` | Configuration flags are insufficient; dashboard/API evidence of retention and restore point is required. |
| `RECOVERY_DRILL_READY` | `BLOCKED` | Requires a fresh backup and an isolated restore target. |

The human decision needed is to provide an approved, least-privilege backup path (CLI access plus database password, or an operator-created logical backup) and an isolated restore target. Credentials must never be committed or pasted into reports.

Until that drill succeeds, `PRODUCTION_APPLY_READY = BLOCKED` and the only safe terminal state is `PRODUCTION_WRITE_BOUNDARY_REACHED`.

`MANDARIMPROJECT_WRITES = 0`

`STRIPE_LIVE_WRITES = 0`
