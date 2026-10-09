# RC2.3.10 — Reconciliação do histórico de migrations

**Gate `PRODUCTION_MIGRATION_HISTORY_RECONCILED` / `MIGRATION_HISTORY_PASS` = `BLOCKED`.**
Ledger: `docs/launch/production-migration-ledger.json`, gerado por `npm run ledger:production-migrations` e verificado por `npm run validate:rc2-3-10-cloud` (fica stale se repo ou snapshot mudarem).

## Recontagem (a baseline antiga era histórica)

| | Handoff RC2.3.9 | Agora (2026-10-08) |
|---|---|---|
| Linhas em `supabase_migrations.schema_migrations` | 35 | **36** (a `jev_feedback_triage` entrou em 2026-10-07) |
| Arquivos no repo | 53 | **56** = 53 em `supabase/migrations` + `supabase/pending/rc2-2-11-username-identifier.sql` + 2 pendentes desta wave |

## Método: conteúdo, não nome

Para cada linha de produção: md5 do SQL aplicado (`statements`) depois de remover comentários `--` e todo espaço em branco/`;`. O mesmo hash é calculado para cada arquivo do repo.

- **`MATCH`** só com conteúdo normalizado **igual**.
- Nome igual com conteúdo diferente → **`UNKNOWN`**, nunca equivalente por suposição.
- Linha placeholder → **`UNKNOWN`**. Três linhas de produção não contêm o SQL real:
  - `referrals_mvp`: `-- placeholder; full migration applied via file read`
  - `economy_anti_cheat_qi`: `select 1; -- anti-cheat SQL applied via execute_sql chunks (…)`
  - `harden_economy_reward_trust`: `select 1; -- economy reward trust SQL applied via execute_sql/apply_migration chunks`

  Ou seja, parte do schema de produção foi aplicada **por fora** do histórico. Histórico ≠ schema.

## Resultado

| Estado | Qtde | Conteúdo |
|---|---|---|
| `MATCH` | 19 | 011, 013, 015, 016, 018, 019 (`turnstile_secret_vault_rpc`), 020, 021, 022, `secure_social_profile_boundary`, `erase_account_personal_data`, `harden_referral_qualification`, `revoke_economy_user_is_pro_client`, `harden_client_reward_claims`, `require_referral_reward_review`, `index_referral_review_reviewer`, `beta_experience_telemetry`, `rc2_2_11_username_identifier_login` (= `supabase/pending/rc2-2-11-username-identifier.sql`), `jev_feedback_triage` |
| `UNKNOWN` | 11 | conteúdo difere: `subscription_event_ordering` (014), `pedagogy_consent_rpc_gate` (012), `017_referrals`, `harden_function_privileges`, `harden_anonymous_ingestion`, `admin_roles_user_id`, `harden_subscription_event_ordering`, `abuse_controls_ip_email_snapshot`; placeholders: `referrals_mvp`, `economy_anti_cheat_qi`, `harden_economy_reward_trust` |
| `PROD_ONLY` | 6 | `harden_economy_claim_mission`, `…_grant_story_energy`, `…_claim_league_week_reward`, `…_add_league_weekly_xp`, `…_grant_lesson_reward` (pedaços de `20260808130000_harden_economy_reward_trust.sql` aplicados em partes), `profiles_social_columns` |
| `REPO_ONLY` | 27 | 001–010 (baseline anterior ao histórico: os objetos existem em produção, **exceto** as tabelas sociais de 005); 14 migrations de ago–set (help/mastery telemetry, pearl, business, placement, grants, mastery monotônico, família); 2 pendentes desta wave |
| `LEGACY_EQUIVALENT` | 0 | só depois de um diff por objeto (`OA-SCHEMA-DIFF`) |

## Por que existe divergência

1. Até 2026-08-08 parte do hardening foi aplicada via `execute_sql` em pedaços, com placeholders no histórico.
2. Algumas migrations foram editadas no repo depois de aplicadas (conteúdo diferente com o mesmo nome).
3. Desde 2026-08-10 nenhuma migration do repo foi para produção, exceto a username (de `pending/`) e a Jev triage. O frontend andou com flags de proteção (onboarding V2), mas social, família, business e pearl não têm proteção (ver o diff de schema).

## O que NÃO foi feito (por regra)

- `supabase_migrations` não foi alterada; nada foi marcado como aplicado; nenhum `REPO_ONLY` foi executado.
- Recomendação (`OA-MIGRATION-RECONCILIATION-DECISION`, opção a): manter o histórico como está e usar o ledger como verdade. Toda migration futura passa por `PRODUCTION_MIGRATION_READY` (`scripts/lib/rc2-3-10-cloud.mjs › productionMigrationReady`), que falha fechado sem: SHA candidato, schema diff de ≤ 7 dias, ledger `PASS`, export verificado, revisão, estratégia de down (ou nota de irreversível) e aprovação do owner.

## Regras testadas (`npm run test:rc2-3-10-cloud`)

Mapeamento duplicado, linha de produção sem entrada, `MATCH` com conteúdo diferente, arquivo do repo sem entrada, ledger `PASS` com `UNKNOWN` e placeholder nunca `MATCH`: cada uma dessas mutações é morta.
