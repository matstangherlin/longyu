# RC2.3.7 — Parent #317 Hosted Truth

| | |
|---|---|
| Parent | [matstangherlin/longyu#317](https://github.com/matstangherlin/longyu/pull/317) (RC2.3.6, stacked on #316 → #315) |
| HEAD at the start of this wave | `6c988118782152ed80ad2c4afc2a105186527473` |
| Parent SHA used by RC2.3.7 | **`7c1e339`** (= #317 head after the causal fix below; merged into this branch) |

## Hosted state on `6c98811`

| Workflow / job | Conclusion |
|---|---|
| Security · CodeQL · gitleaks · npm audit | **success** |
| CI · RC2.3 stack gates | **success** |
| Android build · foundation (debug APK/AAB) | **success** |
| Android build · runtime (emulator + connectedDebugAndroidTest) | **success** |
| CI · Portão de qualidade (validate:beta + build) | **failure** — `validate:smart-back-navigation` |
| E2E (Playwright / cross-engine) | skipped (depend on the quality gate) |
| backend-contract / rehearsal | not triggered (#317 touches no `supabase/`) |

## Real failure and causal fix

```
FAIL validate:smart-back-navigation
  - BD: rota sem entrada no inventário: /dominio
  - BD: /dominio sem entrada resolvível
```

RC2.3.6 added the `/dominio` route without a logical parent in the SmartBack inventory (every route must have one).
Fix `7c1e339` on #317: `{ pattern: "/dominio", parent: "/revisao" }` — Seu Domínio is opened from Revisão and returns there.
Validated locally: `validate:smart-back-navigation` PASS, `test:smart-back-navigation` 13/13. No assertion relaxed.

The regression was fixed on the parent, not hidden inside the polish. Hosted re-run of #317 on `7c1e339` is recorded in the closure.
