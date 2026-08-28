# V4.7.8B — backup / recovery gate

**Status: `BLOCKED_BACKUP_NOT_CONFIRMED`.**

WAL `archive_mode=on` and `wal_level=logical` were observed live at
2026-08-28T05:14:56Z. That is **not** a confirmed PITR window, backup id, or
dashboard restore point. MCP has no Backups API in this session.

Until a human confirms Dashboard → Database → Backups (PITR covers now, or a
named backup id is recorded **off-repo**), FASE B must not start — even if the
approval token is later sent.

## Recorded restore point (read-only, no PII)

| Item | Value |
| --- | --- |
| captured_at | 2026-08-28T05:14:56Z |
| project | MandarimProject `drjcfalvlbbeblmmyhwj` |
| backend RC | `v4.7.8-rc.1` |
| MAIN_SHA | `3223d4379b5ab4af118a8d88773186e965c504b5` |
| watermark | `20260810175737` `beta_experience_telemetry` |
| remote migration count | 34 |
| profiles | 11 |
| user_progress | 10 |
| user_economy | 9 |
| subscriptions | 1 |
| user_srs | 0 |
| transactions | 0 |
| wal_level | logical |
| archive_mode | on |
| pg_stat_archiver.failed_count | 0 |
| pg_stat_archiver.last_archived_time | 2026-08-28T05:19:27Z |
| monotonic trigger | absent |

WAL archiver is healthy (`failed_count=0`). That is still **not** a Dashboard
PITR window or backup id. Status stays `BLOCKED_BACKUP_NOT_CONFIRMED`.

No emails, JWTs, `sbp_` tokens, or Stripe keys belong in git.

## What the human must confirm before the first write

1. Supabase Dashboard → Database → Backups: PITR window covers now, **or**
   a backup id is written into apply-run notes (not this repository).
2. Optional off-repo logical dump of `public.profiles`, `public.user_progress`,
   `public.user_economy`, `public.subscriptions`.
3. Deploy lock held until watermark ≥ `20260828032249` or the apply is aborted.

`HOSTED_RECOVERY_READY` stays **NOT_RUN** (password-recovery hosted QA is a
later FASE B item, not this WAL check).
