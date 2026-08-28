# V4.7.8B — backup / recovery gate (Free Plan, manual logical)

**This remessa is not dump confirmation and is not apply approval.**

Paid Dashboard PITR / scheduled backups are **not required** to finish V4.7.8B
while MandarimProject stays on **FREE**. The paid-upgrade blocker
`BLOCKED_BACKUP_NOT_CONFIRMED` is **replaced**.

| Gate | Current |
| --- | --- |
| backup type | `MANUAL_LOGICAL` |
| `MANUAL_LOGICAL_BACKUP_CREATED` | **`NOT_RUN`** |
| `MANUAL_LOGICAL_BACKUP_VERIFIED` | **`NOT_RUN`** |
| `BACKUP_RECOVERY_GATE` | **`WAITING_MANUAL_LOGICAL_BACKUP`** |
| dump `created_at` | **`NOT_RUN`** (human timestamp only, later) |
| auth.users / auth.identities | **`NOT_RUN`** |
| PITR | **no** — this is not PITR |
| RPO | the moment the dump is created (not “now”, not WAL) |

`BACKUP_RECOVERY_GATE` becomes `PASS_WITH_MANUAL_LOGICAL_BACKUP` **only if**
both `MANUAL_LOGICAL_BACKUP_CREATED` and `MANUAL_LOGICAL_BACKUP_VERIFIED`
are **PASS**. This remessa does **not** set them PASS.

Do **not** ask for dump contents, passwords, or a DB URL. Do **not** commit
dumps. Do **not** upload PII to GitHub.

## What this is (and is not)

- **Not PITR.** There is no Dashboard restore window on Free.
- **RPO** = the timestamp of the off-repo dump, not the apply instant.
- **Recovery is slower** than a physical / Dashboard restore: `psql` replay of
  roles → schema → data → migration history, then any auth handling below.
- **Adequate** for this **controlled** 11-migration apply while Longyu remains
  on the Free Plan. It is not a substitute for Pro backups on a later plan.

WAL `archive_mode=on` is still **not** a restore button.

## Required off-repo files (never in git)

Created **outside GitHub and outside this repository**, with Supabase CLI
linked to **MandarimProject** (`drjcfalvlbbeblmmyhwj`) — prefer `--linked` so
the connection string never appears in chat or git:

```
supabase db dump --linked -f roles.sql --role-only
supabase db dump --linked -f schema.sql
supabase db dump --linked -f data.sql --use-copy --data-only
supabase db dump --linked -f history_schema.sql --schema supabase_migrations
supabase db dump --linked -f history_data.sql --use-copy --data-only --schema supabase_migrations
```

All five must exist before `MANUAL_LOGICAL_BACKUP_CREATED` can be PASS:

| File | Role |
| --- | --- |
| `roles.sql` | roles only |
| `schema.sql` | schema |
| `data.sql` | data (`COPY`) |
| `history_schema.sql` | `supabase_migrations` schema |
| `history_data.sql` | `supabase_migrations` data |

Keep them private (disk / password manager / offline media). `.gitignore`
blocks the root filenames if they are dropped here by mistake.

## Auth recovery (required statement, no files in git)

`MANUAL_LOGICAL_BACKUP_VERIFIED` cannot become PASS until a later human
remessa states **one** of:

1. **`EXPORTED_SEPARATELY`** — `auth.users` and `auth.identities` were dumped
   off-repo (separate files, not committed). Report timestamp only.
2. **`OUT_OF_SCOPE_THIS_MIGRATION`** — login-row recovery is explicitly
   **out of scope** for this apply. Schema/public learner tables are what the
   five files cover. If auth rows were lost, this remessa would **not** restore
   them.

Do not paste those tables, emails, hashes, or JWTs here.

## Metadata recorded in git (non-sensitive only)

| Item | Value |
| --- | --- |
| captured_at (live inventory) | 2026-08-28T06:03Z (Dashboard) / 2026-08-28T05:59Z (SQL) |
| project | MandarimProject `drjcfalvlbbeblmmyhwj` |
| supabase_plan | **FREE** |
| backup type | `MANUAL_LOGICAL` |
| dump created_at | **NOT_RUN** |
| verification status | **NOT_RUN** |
| pre-migration watermark | `20260810175737` `beta_experience_telemetry` |
| remote migration count | 34 |
| profiles | 11 |
| user_progress | 10 |
| user_economy | 9 |
| subscriptions | 1 |
| scheduled_backups_available | **NO** |
| PITR_available | **NO** |
| restore_to_new_project | **NO** (Pro) |
| wal_level | logical |
| archive_mode | on |
| pg_stat_archiver.failed_count | 0 |
| backend RC | `v4.7.8-rc.1` |
| MAIN_SHA | `3223d4379b5ab4af118a8d88773186e965c504b5` |

## How CREATED / VERIFIED become PASS (later remessa)

A **later** human message (not this file, not a PR merge) must confirm,
without attaching dumps:

1. The five filenames exist off-repo, produced with CLI against MandarimProject.
2. `created_at` as an ISO timestamp only (no path, no URL).
3. Auth: `EXPORTED_SEPARATELY` **or** `OUT_OF_SCOPE_THIS_MIGRATION`.
4. **Preferred:** dump restored against a **local / ephemeral** Postgres
   (not MandarimProject) and critical counts match the table above; watermark
   `20260810175737` still present in history. That is the bar for
   `MANUAL_LOGICAL_BACKUP_VERIFIED=PASS`.

Until that confirmation: both gates stay `NOT_RUN` and
`BACKUP_RECOVERY_GATE` stays `WAITING_MANUAL_LOGICAL_BACKUP`.

## Apply still stopped

Even after both backup gates PASS, FASE B still requires a later message
containing exactly:

```
APPROVE_MANDARINPROJECT_BACKEND_UPGRADE
```

This prompt is **not** that token. Zero `apply_migration`. Zero Edge deploy.

`HOSTED_RECOVERY_READY` stays **NOT_RUN** (password-recovery QA is separate).
