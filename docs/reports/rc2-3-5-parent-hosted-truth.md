# RC2.3.5 — Parent #315 Hosted Truth

| | |
|---|---|
| Parent | [matstangherlin/longyu#315](https://github.com/matstangherlin/longyu/pull/315) |
| HEAD observed at the start of this wave | `9f8ed2d9064cc91b9d13d38c4a691c19e077fca8` |
| Parent SHA used by RC2.3.5 | **`0b3c85ec9b6954474c747f0ec3e852e0cd816604`** (= #315 head after the two causal fixes below) |

## Hosted state on `9f8ed2d` (start of wave)

| Workflow / job | Conclusion | Run / job |
|---|---|---|
| backend-contract · Ephemeral backend contract | **failure** at "Offline contract gate" (later steps skipped) | run 37562266939 / job 112601983330 |
| backend-rehearsal · Ephemeral DB / Edge rehearsal | success | run 37562266858 |
| Security · CodeQL, gitleaks, npm audit | success | run 37562266909 |
| CI · RC2.3 stack gates | success | run 37562266921 / job 112601983225 |
| CI · Portão de qualidade | running | run 37562266921 |
| Android build · Android foundation | running | run 37562266943 |

## First real failure

`node scripts/test-backend-contract.mjs` →

```
FAIL test:backend-contract:
  - LOCAL_ONLY unclassified: 20261007120000_jev_feedback_triage.sql
  - LOCAL_ONLY ERROR: 20261007120000_jev_feedback_triage.sql
```

Reproduced locally, identical to hosted — the gate is environment-independent (it compares the repo's migration files with a checked-in, read-only snapshot of production history and needs no secret).

Cause: the RC2.3.4A-era migration `supabase/migrations/20261007120000_jev_feedback_triage.sql` (commit `a13813b`) was added without a drift classification. It **is** on production — applied out of band on 2026-10-07 through the Supabase connector as remote **`20261007013220 jev_feedback_triage`** (read-only `list_migrations` confirms) — but the checked-in remote snapshot predates it, so the drift model sees it as LOCAL_ONLY.

## Causal fix (commit `0a14c41` on #315)

- `scripts/lib/v477-constants.mjs`: classified `RENAMED_EQUIVALENT`, citing the exact remote version and the additive objects (Vault RPC, nullable `ai_*` columns, partial index).
- Regenerated `docs/backend/{migration-manifest,v478-backend-rc,v489-backend-rc}.json` with the repo's own generator (`v489` journey fingerprint was also stale at `c3861b5fb65f`).
- Not done: no skip, no `continue-on-error`, no assertion relaxed, no migration removed, no secret needed, no production change.

## Rerun on `0a14c41`

| Workflow / job | Conclusion | Run |
|---|---|---|
| backend-contract · Ephemeral backend contract | **success** | run 37563800394 / job 112606834527 |
| backend-rehearsal · DB / Edge | success | run 37563800441 |
| Security · CodeQL, gitleaks, npm audit | success | run 37563800439 |
| CI · RC2.3 stack gates | success | run 37563800407 / job 112606834725 |
| CI · Portão de qualidade | **failure** — `test:longyu-only-backend` (step 245 of 430) | run 37563800407 / job 112606834540 |
| Android build · Android foundation (debug APK/AAB) | **success** | run 37563800406 / job 112606834532 |

## Second real failure (surfaced once the first was fixed)

`test:longyu-only-backend` (policy LON-001: this repository must not name or id other products):
RC2.3.4A launch docs named the other free-tier project, the former QA project and their project refs.
Fix (commit `0b3c85e`): the aliases the #273 report already used — `sibling-free-tier-project`, `qa-candidate-project` — and refs omitted. Meaning unchanged; no assertion touched.

Before pushing, every step of `validate:beta` was covered: steps 1–244 passed hosted on `0a14c41`; steps 245–393 (149 gates) and 394–430 were run locally on `0b3c85e` and pass
(`validate:report-freshness` only passes after `validate:exercise-depth` regenerates its report, which is the hosted order).

## Status on `0b3c85e`

Hosted runs were triggered by the push; their result is recorded in the RC2.3.5 closure report and on #315.
RC2.3.5 is stacked on `0b3c85e`.
