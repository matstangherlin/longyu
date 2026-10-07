# RC2.3.6 — Parent #316 Hosted Truth

| | |
|---|---|
| Parent | [matstangherlin/longyu#316](https://github.com/matstangherlin/longyu/pull/316) (RC2.3.5, stacked on [#315](https://github.com/matstangherlin/longyu/pull/315)) |
| Parent SHA used by RC2.3.6 | **`37d547f653c5a5f20002ec9c6278a38f974be27b`** (= #316 head) |
| Consulted | 2026-10-07T04:43Z |

## #316 @ `37d547f`

| Workflow / job | Conclusion | Run / job |
|---|---|---|
| Android build · Android foundation (contracts + debug APK/AAB) | **success** | run 37568824235 / job 112622619650 |
| Android build · Android runtime (emulator + connectedDebugAndroidTest) | **success** | run 37568824235 / job 112626856929 |
| CI · RC2.3 stack gates | **success** | run 37568824173 / job 112622619512 |
| CI · Portão de qualidade (validate:beta + build) | **in progress** (started 03:53Z) | run 37568824173 / job 112622619362 |
| Security · CodeQL · gitleaks · npm audit | **success** | run 37568824183 |
| Supabase Preview | skipped (integration not configured for previews) | — |
| backend-contract / DB-Edge rehearsal | **not triggered** on #316 (path filters: RC2.3.5 touches no `supabase/`) | — |

## #315 @ `0b3c85e` (grandparent)

backend-contract, DB rehearsal, Edge rehearsal, CodeQL, gitleaks, npm audit, RC2.3 stack gates, Android foundation, Android runtime: **success**. Portão de qualidade: **in progress**.

## Verdict

Parent is **not** called PASS: the long `validate:beta + build` job is still running on both #315 and #316. Every other hosted check is green.
Locally, on the RC2.3.6 head, the same `validate:beta` chain (now including `gate:rc2-3-6-personal-mastery`) was run end to end — result in [`rc2-3-6-closure.md`](rc2-3-6-closure.md).
RC2.3.6 is stacked on `37d547f`; a red result on the parent would be ported here.
