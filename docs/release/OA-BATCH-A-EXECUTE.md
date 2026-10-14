# OA-BATCH-A-EXECUTE — um único bloco de aprovação

**Status:** READY_FOR_OWNER · **Não execute** até backup + esta aprovação.

## Migration

| Campo | Valor |
|---|---|
| Id | `rc2-3-10-league-memberships-policy-recursion` |
| Arquivo | `supabase/pending/rc2-3-10-league-memberships-policy-recursion.sql` |
| Remote name | `rc2_3_10_league_memberships_policy_recursion` |
| Projeto | MandarimProject `drjcfalvlbbeblmmyhwj` |
| Caminho | só `scripts/apply-production-migration.mjs` via workflow **Apply Beta Feedback** |
| Ledger | `BATCH_A_LEDGER_SAFE_TO_PROCEED` (`docs/launch/rc2-3-10d-batch-a-ledger-safe.json`) |

## Risco

- Baixo/dados: sem ALTER de coluna, sem backfill, sem DROP de tabela.
- Comportamento: `authenticated` passa a ler peers da mesma divisão/semana (subconjunto do que `get_league_standings` já devolve).
- App beta hoje só lê ligas via SECURITY DEFINER — bug 42P17 é em SELECT direto.

## Rollback

`supabase/pending/rc2-3-10-league-memberships-policy-recursion.down.sql` (safer: own-row only). Não recriar a policy 004 recursiva.

## Backup

| Item | Estado |
|---|---|
| Dry-run preflight | PASS (agente) |
| Export real owner-held | **OWNER_ACTION_REQUIRED** |
| Verificador | `npm run verify:production-backup -- --manifest <fora-do-repo>/production-backup-manifest.json` |

## Schema proof

`docs/launch/rc2-3-10c-batch-a-schema-proof.json` + live 2026-10-09: `league_viewer_scope` ABSENT, peers policy self_ref=true (`usingMd5=9978cb3d…`).

## Resultado esperado pós-apply

1. `league_viewer_scope` existe, `search_path=''`, PUBLIC/anon sem EXECUTE.
2. Policy peers sem subquery em `league_memberships`.
3. Sem `42P17` em SELECT autenticado.
4. `schema_migrations` +1 com remote name acima.
5. Advisors: sem regressão nova ligada a esta policy.

## Como aprovar (cole no PR)

```
OA-BATCH-A-EXECUTE = APPROVE
backupTakenAt = <UTC>
backupManifestVerified = true
by = <seu email>
at = <UTC>
```

Depois: atualizar `docs/launch/rc2-3-10c-batch-a-ready.json` (backup + ownerApproval + candidateSha do merge), merge em `main`, Actions → Apply Beta Feedback com `APPLY-rc2-3-10-league-memberships-policy-recursion`.
