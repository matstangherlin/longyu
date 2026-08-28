# V4.7.8B — backup / recovery gate (Free Plan, manual logical)

**Apply approval: this file is not `APPROVE_MANDARINPROJECT_BACKEND_UPGRADE`.**
Zero MandarimProject writes.

Paid Dashboard PITR / scheduled backups remain unavailable on **FREE**.
The paid-upgrade blocker `BLOCKED_BACKUP_NOT_CONFIRMED` stays replaced.
This is **not PITR**.

| Gate | Current |
| --- | --- |
| backup type | `MANUAL_LOGICAL` |
| `MANUAL_LOGICAL_BACKUP_CREATED` | **`PASS`** |
| `MANUAL_LOGICAL_BACKUP_VERIFIED` | **`PASS`** |
| `BACKUP_RECOVERY_GATE` | **`PASS_WITH_MANUAL_LOGICAL_BACKUP`** |
| dump `created_at` | **`2026-08-28`** (calendar date; exact UTC second not transmitted) |
| files | 5 off-repo (`roles.sql` `schema.sql` `data.sql` `history_schema.sql` `history_data.sql`) |
| sizes / sha256 | **not transmitted** (kept off-repo; human confirmed `exists=true`, non-empty) |
| `cli_exit` | 0 |
| `parse_ok` | yes |
| restore rehearsal | yes (local/ephemeral; not MandarimProject) |
| `AUTH_RECOVERY` | **`OUT_OF_SCOPE_THIS_MIGRATION`** |
| PITR | **unavailable on current Free Plan** |
| RPO | dump calendar date `2026-08-28` (not “now”, not WAL) |
| RTO | manual / slower than managed physical restore |
| `BACKUP_STILL_VALID` | **`PASS`** (production unchanged vs dump at 2026-08-28T11:00:47Z) |

Do **not** ask for dump contents, passwords, or a DB URL. Do **not** commit
dumps. Do **not** upload PII to GitHub.

## What this is (and is not)

- **Not PITR.** There is no Dashboard restore window on Free.
- **RPO** = the off-repo dump date (`2026-08-28`), not the apply instant.
- **Recovery is slower** than a physical / Dashboard restore: `psql` replay of
  roles → schema → data → migration history. Auth login rows are
  **out of scope** for this migration (`OUT_OF_SCOPE_THIS_MIGRATION`).
- **Adequate** for this **controlled** 11-migration apply while Longyu remains
  on the Free Plan.

WAL `archive_mode=on` is still **not** a restore button.

## Off-repo files (never in git)

Human confirmed, **outside GitHub and outside this repository**, CLI dumps
against **MandarimProject** (`drjcfalvlbbeblmmyhwj`):

| File | exists | size_bytes | sha256 |
| --- | --- | --- | --- |
| `roles.sql` | true | not transmitted | not transmitted |
| `schema.sql` | true | not transmitted | not transmitted |
| `data.sql` | true | not transmitted | not transmitted |
| `history_schema.sql` | true | not transmitted | not transmitted |
| `history_data.sql` | true | not transmitted | not transmitted |

Commands used (conceptual; `--db-url` stays in a local env var, never in git):

```
supabase db dump --role-only            → roles.sql
supabase db dump                        → schema.sql
supabase db dump --data-only --use-copy → data.sql
supabase db dump --schema supabase_migrations → history_schema.sql
supabase db dump --data-only --use-copy --schema supabase_migrations → history_data.sql
```

## Row counts (no PII)

| table | PRE_BACKUP | RESTORED |
| --- | ---: | ---: |
| profiles | 11 | 11 |
| user_progress | 10 | 10 |
| user_srs | 0 | 0 |
| user_economy | 9 | 9 |
| subscriptions | 1 | 1 |
| transactions | 0 | 0 |

Watermark at dump and on restore: `20260810175737` `beta_experience_telemetry`.

Live reconsult **2026-08-28T11:00:47Z**: MandarimProject `ACTIVE_HEALTHY`,
same watermark, 34 remote migrations, same critical counts, same 11 pending
LOCAL_ONLY files, same 3 missing Edges. `BACKUP_STILL_VALID=PASS`.
`BACKUP_REFRESH_REQUIRED` is not set.

## Auth recovery

`AUTH_RECOVERY = OUT_OF_SCOPE_THIS_MIGRATION`.

`auth.users` / `auth.identities` were **not** exported for this remessa.
Login-row recovery is out of scope. The five files cover schema/public
learner tables + `supabase_migrations` history. The unused alternative
remains `EXPORTED_SEPARATELY` (off-repo only).

## Apply still stopped

`BACKUP_RECOVERY_GATE` is `PASS_WITH_MANUAL_LOGICAL_BACKUP`. FASE B still
requires a **later** message containing exactly:

```
APPROVE_MANDARINPROJECT_BACKEND_UPGRADE
```

This file is **not** that token. Zero `apply_migration`. Zero Edge deploy.

`HOSTED_RECOVERY_READY` stays **NOT_RUN** (password-recovery QA is separate).
