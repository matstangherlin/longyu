# RC2.3.10C — Controlled production activation closure

`cloud.certification` = **BLOCKED**. This wave wired fail-closed production apply and prepared Batch A. It did **not** write production, deploy Edge Functions, or claim cloud PASS.

## What this wave did

| Item | Result | Evidence |
|---|---|---|
| Fail-closed workflows | Apply-all / leagues replay / auth replace-all refused | `gate:rc2-3-10c`, `.github/workflows/apply-beta-feedback.yml` |
| Stripe webhook retry classes (code only) | RPC errors → 500/400; duplicates → `ALREADY_PROCESSED` | `supabase/functions/stripe-webhook/index.ts` (not redeployed) |
| Edge contract hash | Regenerated after webhook edit | `docs/backend/edge-contract.json` (`eeb0cafa`) |
| Hotfix body compare | `KEEP_PROD_BODY` for `claim_mission`, `grant_story_energy`, `grant_lesson_reward` | `docs/launch/rc2-3-10c-hotfix-body-compare.json` |
| Live re-prove 2026-10-09 | Function hashes unchanged; `league_viewer_scope` absent; recursive peers policy still live; `profiles.instruction_locale` absent | same + `rc2-3-10c-function-body-hashes.json` |
| Client gates | social / family / business / pearl fail soft | `npm run test:backend-capability` PASS |
| Backup preflight | Dry-run PASS (destination outside repo); no dump | `npm run backup:production-preflight` |
| Batch A package | League policy fix ready; `PRODUCTION_MIGRATION_READY` = **BLOCKED** | `docs/launch/rc2-3-10c-batch-a-ready.json` |
| Single-file apply path | Allowlist + readiness gate; never `db:apply-api` | `scripts/apply-production-migration.mjs` |

## Batch A blockers (honest)

`productionMigrationReady` on `docs/launch/rc2-3-10c-batch-a-ready.json`:

1. `ledgerReconciled` — owner accepts ledger-as-authority (`OA-MIGRATION-RECONCILIATION-DECISION`)
2. `backupVerified` — owner runs `OA-DATA-EXPORT` and records counts in the PR
3. `ownerApproval` — owner approves `OA-LEAGUE-POLICY-FIX`

Scoped schema proof for Batch A is `PASS` (`docs/launch/rc2-3-10c-batch-a-schema-proof.json`). Full column diff remains BLOCKED and is out of Batch A scope.

## Explicitly not applied

- No SQL on MandarimProject
- No Edge redeploy (`commit-placement`, `finalize-onboarding`, `create-account`, `stripe-webhook`, `triage-feedback`)
- No Auth allowlist PATCH (merge script exists; owner still confirms URLs)
- No placement / telemetry / least-privilege / social / pearl migrations
- No overwrite of economy hotfix bodies
- No merge of #322 / #323 / #324 / #273

## How Batch A applies (after the three blockers clear)

1. Update `docs/launch/rc2-3-10c-batch-a-ready.json` so `request.ledger.status`, `request.backup`, and `request.ownerApproval` make `productionMigrationReady` return PASS (candidate SHA = merge SHA on `main`).
2. Merge this stack to `main` (human merge; agent does not merge).
3. GitHub → Actions → **Apply Beta Feedback** → `environment: production` approval:
   - `migration_id` = `rc2-3-10-league-memberships-policy-recursion`
   - `confirm` = `APPLY-rc2-3-10-league-memberships-policy-recursion`
   - `expected_sha` = merge SHA
   - `project_ref` = `drjcfalvlbbeblmmyhwj`
4. Verify: policy uses `league_viewer_scope`; no `42P17`; advisors + cloud smoke.

## Parent hosted truth (snapshot)

Reconsult before any write. At packaging time: #323 green except E2E pending; #324 re-running after contract hash fix. Do not treat this document as hosted PASS.

## Owner one-pager

`docs/release/OWNER_NEXT_ACTIONS.md`
