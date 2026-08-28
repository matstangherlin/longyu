# V4.7.8B — operational deploy lock (not armed)

**Lock state: `DECLARED_NOT_ARMED`.**

This remessa records the lock **policy**. It does not take a production schema
lock, pause the project, or apply migrations.

During FASE B (only after `APPROVE_MANDARINPROJECT_BACKEND_UPGRADE` **and**
`BACKUP_RECOVERY_GATE=PASS_WITH_MANUAL_LOGICAL_BACKUP` **and** MAIN_SHA CI
gates terminal-green):

- no other migration on MandarimProject
- no parallel backend deploy
- no manual schema edit
- inseparable pairs applied in the same sitting
- stop at the first failed migration; no destructive improvisation

Until those gates pass, the lock is **not** claimed as held on production.
Other operators should still treat MandarimProject as frozen for schema work
while this human gate is open.

| Campo | Valor |
| --- | --- |
| project | MandarimProject `drjcfalvlbbeblmmyhwj` |
| MAIN_SHA | `3223d4379b5ab4af118a8d88773186e965c504b5` |
| backend RC | `v4.7.8-rc.1` |
| watermark at declaration | `20260810175737` |
| target watermark | `20260828032249` |
| declared_at | 2026-08-28T05:14:56Z |
