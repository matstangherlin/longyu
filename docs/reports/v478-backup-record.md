# V4.7.8 HOST-007 — backup / recovery record (procedure only)

This remessa **did not** take a production backup, PITR bookmark, or logical
dump. Taking those is an operational action for the human who holds
`APPROVE_MANDARINPROJECT_BACKEND_UPGRADE`.

## Recorded restore points (read-only)

| Item | Value |
| --- | --- |
| project | MandarimProject `drjcfalvlbbeblmmyhwj` |
| captured_at | 2026-08-28T03:22:00Z |
| watermark | `20260810175737` `beta_experience_telemetry` |
| remote migration count | 34 |
| profiles | 11 |
| user_progress | 10 |
| user_economy | 9 |
| subscriptions | 1 |
| monotonic trigger | absent |
| repo object hashes | `docs/backend/v478-backend-rc.json` |

No emails, JWTs, `sbp_` tokens, or Stripe keys belong in git.

## What a human must do before HOST-010

1. Supabase Dashboard → Database → Backups: confirm PITR window covers now.
2. Optional: logical dump of `public.profiles`, `public.user_progress`,
   `public.user_economy`, `public.subscriptions` **off-repo**.
3. Write the backup id / PITR timestamp into the apply run notes (not this PR).
4. Hold a deploy lock until watermark ≥ `20260828032249` or the apply is aborted.

`HOSTED_RECOVERY_READY` stays **NOT_RUN**.
