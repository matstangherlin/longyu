# Runbook — export/backup de produção (antes de qualquer migration)

**Gate `PRE_MIGRATION_BACKUP_REQUIRED`** → `BACKUP_EXPORT_PASS` = `OWNER_ACTION_REQUIRED` até o owner executar e verificar (`OA-DATA-EXPORT`).

Projeto: **MandarimProject `drjcfalvlbbeblmmyhwj`** (plano free: **sem backups e sem PITR**, reconfirmado em 2026-10-08 via `get_organization` → `plan: free`).

## 1. Quando

Antes de **toda** migration de produção. `PRODUCTION_MIGRATION_READY` recusa sem `backup.verified`, `sourceProject` e `takenAt`.

## 2. Schema-only

```bash
npx supabase login                      # token só na sua máquina
npx supabase link --project-ref drjcfalvlbbeblmmyhwj
# Supabase CLI 2.109.1 (`npx supabase db dump --help`): sem --data-only o dump é só de schema.
npx supabase db dump --linked --schema public,auth,storage -f prod-schema-$(date -u +%Y%m%dT%H%MZ).sql
```

## 3. Dados críticos

```bash
npx supabase db dump --linked --data-only --use-copy --schema public -f prod-data-$(date -u +%Y%m%dT%H%MZ).sql
```

As tabelas críticas que **precisam** estar no arquivo (auditadas no schema de 2026-10-08):

| Tabela | Por quê |
|---|---|
| `user_progress` | progresso do aluno (`client_snapshot`) |
| `profiles` | perfil/username |
| `subscriptions`, `entitlement_grants`, `transactions` | verdade de cobrança/entitlement |
| `economy_ledger`, `user_economy`, `user_missions`, `user_chests`, `user_achievements` | economia (idempotência por ledger) |
| `league_memberships`, `league_weekly_results`, `league_xp_events` | ligas |
| `referral_*`, `referrals` | indicações e recompensas |
| `beta_feedback` | feedback (texto livre) |
| `beta_pedagogy_events`, `beta_pedagogy_daily_metrics` | telemetria (antes de qualquer retenção) |
| `reserved_usernames`, `beta_admins` | regras de identidade/admin |

## 4. Auth

- `auth.users`/`auth.identities` só no dump schema+dados de `auth`, e somente se a migration tocar Auth. Senhas ficam como hash; o arquivo continua sendo **altamente sensível**.
- Restaurar Auth em outro projeto exige o mesmo JWT secret. Para incidentes, prefira restaurar no **mesmo** projeto.

## 5. Verificação do export

1. `grep -c "COPY public.user_progress" prod-data-*.sql` (precisa existir).
2. Restaurar num Postgres **local** (`npx supabase start` + `psql -f prod-schema… -f prod-data…`) e comparar as contagens por tabela com produção (`select count(*)` por tabela, lida na mesma janela).
3. Registrar no PR: horário UTC, project ref, SHA candidato e contagem por tabela (**nada de dados**).

## 6. Guarda

- Criptografar (`age`/`gpg`) e guardar fora do repo e fora de nuvem compartilhada.
- **Nunca** commitar o dump. O `.gitignore` não é a defesa; o lugar é que é.
- Reter até a migration seguinte estar validada (advisors + cloud smoke) e, no mínimo, 30 dias.

## 7. Restore

Incidente pós-migration:
1. Pare as escritas: Netlify → publicar o deploy anterior (rollback do frontend).
2. Aplique o "Down" da migration (cada migration tem um, ou nota de irreversível).
3. Se o Down não bastar, restaure as tabelas afetadas a partir do dump verificado (`psql` com `--single-transaction`).
4. Rode advisors, `cloud-smoke` e `npm run generate:product-truth`.
