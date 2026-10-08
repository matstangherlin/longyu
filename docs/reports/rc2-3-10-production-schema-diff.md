# RC2.3.10 — Production schema truth (repo × produção)

- **Projeto:** MandarimProject `drjcfalvlbbeblmmyhwj` (org Noba, plano **free**, us-west-2, Postgres 17.6.1.155). Identificado por `.env.production` (`VITE_SUPABASE_URL`), `supabase/baseline/README.md` e `configure-supabase-auth.yml`. Os outros dois projetos da org (`longyu-preview`, inativo, o do #273; `atomurus`, que não é do Longyu) **não foram tocados**.
- **Leitura:** 2026-10-08, só leitura, via Supabase MCP (catálogos `pg_*`, `information_schema`, `supabase_migrations`, `cron.job`, nomes em `vault.secrets`, contagens agregadas). Nenhuma linha de usuário foi lida.
- **Evidência commitada:** `docs/launch/production-snapshot.json` (só fatos de schema e contagens; sem PII, sem valor de segredo).
- **Escopo:** diff por **objeto** (tabelas, views, funções/RPCs, policies, extensões, cron, Edge Functions). O diff por **coluna** exige `npx supabase db diff --linked --schema public` rodado na máquina do owner (Supabase CLI 2.109.1, Docker) → `OA-SCHEMA-DIFF` (`NOT_RUN`).

**Gate `PRODUCTION_SCHEMA_TRUTH_PASS` = `BLOCKED`** (drift de classe `MISSING_IN_PROD`, com cliente dependente, + `PROD_ONLY` + diff por coluna não feito).

## Resumo

| Objeto | Produção | Repo (pretendido) | Classificação |
|---|---|---|---|
| Tabelas `public` | 37 (todas com RLS) | 40 criadas pelas migrations | ver abaixo |
| View | `admin_user_overview` (`security_invoker=true`, só `postgres`/`service_role`) | igual | `EXPECTED` |
| Funções `public` | 87 | contrato `docs/backend/rpc-contract.json` (10 RPCs) | 3 RPCs do contrato ausentes |
| Extensões instaladas | pgcrypto, pg_net, supabase_vault, pg_cron, uuid-ossp, plpgsql, pg_stat_statements | as mesmas | `EXPECTED` |
| Cron | 1 job: `longyu-signup-cleanup-dry-run` (dom 06:00, **dry run**) | igual (020) | `EXPECTED` |
| Storage | 0 buckets, 0 objetos | nenhum bucket no repo | `EXPECTED` |
| Vault (só nomes) | `TURNSTILE_SECRET_KEY`, `TYPESAFE_API_KEY` | 019 + Jev | `EXPECTED` |

## Drift encontrado

### `MISSING_IN_PROD`: objetos do repo que o cliente atual chama

| Objeto | Origem no repo | Quem chama | Efeito em produção hoje |
|---|---|---|---|
| tabelas `user_follows`, `social_activity_events` | `005_social.sql` | `src/services/socialService.ts` | Seguir amigos e atividade social falham (PostgREST 404). |
| RPCs `search_public_profiles`, `get_public_profile_by_username`, `get_public_profiles_by_ids` | social | `socialService.ts` | Busca de perfis falha. |
| RPCs `get_family_overview`, `create_family_invite`, `accept_family_invite`, `revoke_family_invite`, `remove_family_member` | `20260914*_family_*` | `familyService.ts` | Plano Família não funciona. |
| RPCs `get_business_overview`, `get_business_members` + 7 tabelas `organization*`/`business_*` | `20260825*_business_*` | `businessWorkspaceService.ts` | Workspace Business não funciona. |
| RPCs `claim_pearl_milestone`, `activate_pearl_pro_pass` + 3 tabelas `pearl_*` | `20260813180000_pearl_pro_economy.sql` | `economyServerBridge.ts` | Marcos Pearl/Pro Pass falham. |
| RPCs `commit_placement_result`, `save_placement_onboarding_draft` + `placement_attempts`, `placement_onboarding_drafts` | `20260826*`/`20260827*` | Edges `create-account` (versão do repo), `commit-placement`, `finalize-onboarding` | Já é contido: `isCloudOnboardingV2Enabled()` desliga o onboarding V2 em ambiente production-like **porque** esse backend não existe (`src/lib/featureFlags.ts`). |

Classificação: **`DANGEROUS`** para social, família, business e pearl. São superfícies do cliente que chamam backend inexistente e **não têm flag de produção equivalente** à do onboarding. O placement é `EXPECTED` (contido por flag). Nenhuma correção foi aplicada: aplicar essas migrations é escrita em produção e exige `PRODUCTION_MIGRATION_READY` (export + diff + aprovação). A decisão de produto (esconder essas superfícies até o backend existir, ou aplicar as migrations) fica para o owner, junto com `OA-MIGRATION-RECONCILIATION-DECISION`.

### `PROD_ONLY`

| Objeto | Detalhe | Classificação |
|---|---|---|
| `public._jev_triage_tmp` (`request_id bigint`, `feedback_id uuid`), 5 linhas | Resto de uma triagem manual via `pg_net`; nenhuma referência no repo. RLS ligado e nenhuma policy, então nenhum acesso pelo cliente; `anon`/`authenticated` ainda têm GRANT na tabela. | `UNKNOWN` → `OA-JEV-TMP-TABLE` (export, depois drop) |
| `login_rate_events`, `reserved_usernames`, `resolve_login_identity`, `check_and_record_login_rate`, `claim_own_username` | Vieram da migration `rc2_2_11_username_identifier_login`, cujo conteúdo **é idêntico** a `supabase/pending/rc2-2-11-username-identifier.sql` | `LEGACY` (aplicada a partir de `pending/`) |

### Defesa em profundidade pendente (`LEGACY`)

- `20260828013000_api_role_table_grants` e `20260828020000_least_privilege_api_grants` **não** estão em produção: `anon`/`authenticated` mantêm GRANTs de DELETE/TRUNCATE na maioria das tabelas. O RLS bloqueia (ver `rc2-3-10-production-rls.md`), mas é a única barreira.
- `20260828030000_progress_mastery_monotonic(+_clamp)` não estão em produção: a proteção de domínio monotônico só existe no cliente.

### Advisors de segurança (leitura de 2026-10-08)

| Lint | Nível | Qtde | Leitura |
|---|---|---|---|
| `auth_leaked_password_protection` | WARN | 1 | Desligado → `OA-AUTH-RATE-LIMITS-READ` |
| `function_search_path_mutable` | WARN | 14 | Funções `immutable`/helpers sem `search_path`; nenhuma é SECURITY DEFINER exposta |
| `anon_security_definer_function_executable` | WARN | 2 | `submit_beta_feedback`, `submit_beta_pedagogy_event`: **intencional** (ingestão anônima com sessão + quota) |
| `authenticated_security_definer_function_executable` | WARN | 28 | RPCs de economia/liga/referral; amostra auditada (`sync_league_week`, `ensure_league_membership`) recusa `p_user_id ≠ auth.uid()` |
| `rls_enabled_no_policy` | INFO | 16 | Tabelas internas negadas ao cliente por design (incl. `_jev_triage_tmp`) |

## Nada foi alterado

Nenhum DDL, nenhum DML, nenhuma mudança em `supabase_migrations`. O único estado gravado durante a leitura foi um `set_config` de sessão (o resultado das sondas de RLS), sem nada persistido.
