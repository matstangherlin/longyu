# V4.7.8B — backup / recovery gate

**Status: `BLOCKED_BACKUP_NOT_CONFIRMED`.**

Human Dashboard capture **2026-08-28T06:03Z**: MandarimProject `main PRODUCTION`,
org plan badge **FREE**. Tab **Restore to new project (BETA)** shows:

> Restore to a new project requires Pro Plan and above.

PITR / scheduled Dashboard backups are **not** a usable restore path on Free.
WAL `archive_mode=on` is **not** a restore button. MCP has no Backups API.

Supabase docs (Free): export with CLI `db dump` and keep an **off-site** copy.
Daily Dashboard backups start on Pro+. PITR is a Pro+ add-on.

## Recorded restore point (read-only, no PII)

| Item | Value |
| --- | --- |
| captured_at | 2026-08-28T06:03Z (Dashboard) / 2026-08-28T05:59Z (SQL) |
| project | MandarimProject `drjcfalvlbbeblmmyhwj` |
| supabase_plan | **FREE** |
| scheduled_backups_available | **NO** (Free; Pro+ per docs) |
| PITR_available | **NO** |
| restore_to_new_project | **NO** (requires Pro + physical backups) |
| restore window | none |
| backup id | none |
| backend RC | `v4.7.8-rc.1` |
| MAIN_SHA | `3223d4379b5ab4af118a8d88773186e965c504b5` |
| watermark | `20260810175737` `beta_experience_telemetry` |
| remote migration count | 34 |
| profiles | 11 |
| user_progress | 10 |
| user_economy | 9 |
| subscriptions | 1 |
| wal_level | logical |
| archive_mode | on |
| pg_stat_archiver.failed_count | 0 |

No emails, JWTs, or Stripe keys belong in git. Do **not** commit a logical dump
to this repository.

## How to proceed on Free (pick one)

**A — Upgrade to Pro (recommended for 11 live profiles).**  
Dashboard → Upgrade. Then Database → Backups → Scheduled (and PITR if wanted).
Reply with a backup id or “PITR window covers now”, **off-repo**, plus
`APPROVE_MANDARINPROJECT_BACKEND_UPGRADE`.

**B — Off-repo logical dump (accepted recovery on Free).**  
On your machine, not in GitHub:

```
supabase db dump --linked -f longyu-mandarimproject-pre-v478b.dump
```

Keep that file private. Reply: dump taken (timestamp only, no path with
emails) **and** `APPROVE_MANDARINPROJECT_BACKEND_UPGRADE`.

**C — Do not apply yet.** #208 stays open. Hosted keys stay `NOT_RUN`.

FASE B still requires the exact approval token in a later message. This file
is not permission to apply.

`HOSTED_RECOVERY_READY` stays **NOT_RUN** (password-recovery QA is separate).
