# V4.7.8 HOST-009 — human gate (STOP before first write)

**STOP.** V4.7.8 ends here. Do not apply DDL, deploy Edge, set secrets, or
flip production onboarding.

Required token (exact string, later remessa only):

`APPROVE_MANDARINPROJECT_BACKEND_UPGRADE`

Without that token, hosted scoreboard keys remain `NOT_RUN` and remessa status
is `READY_FOR_CONTROLLED_UPGRADE`.

## Checklist the human must see

1. Pre-deployment snapshot: `docs/reports/v478-predeployment-snapshot.md`
   (11 profiles, watermark `20260810175737`, 2026-08-28T03:22Z).
2. Pending migrations (11 files): `docs/reports/v478-migration-risk-plan.md`.
   HIGH: placement onboarding + handoff. Never apply 8 without 9, 10 without 11.
3. Missing Edges: `commit-placement`, `finalize-onboarding`, `submit-business-lead`.
4. Rollback: drop new tables only if unused; drop monotonic trigger to return to
   last-write-wins; do not re-grant anon ALL except documented incident.
5. HOST-008: production `VITE_CLOUD_ONBOARDING_V2_ENABLED` stays `"false"`.
6. HOST-007: backup/PITR not taken in this remessa — take it immediately before apply.
7. FASE 0: **done.** #206 merged to `main` as `0f2dfe4` (Firefox PASS). This
   branch is rebased on that SHA.

## Explicitly blocked (HOST-010+)

- apply migrations one-by-one on MandarimProject
- live hosted auth / placement / sync QA
- Edge deploy
- Stripe Live
- PHYSICAL_QA_READY / PAYMENTS_READY / READY_FOR_CLOSED_BETA_BR PASS

This file is not permission to proceed. The token is.
