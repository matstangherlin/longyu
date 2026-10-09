# RC2.3.10 — Certificação de RLS em produção

**Gate `PRODUCTION_RLS_PASS` = `BLOCKED`.** O isolamento entre contas está provado. O que bloqueia: um defeito de policy (`league_memberships`, recursão) e a defesa em profundidade pendente (GRANTs).

Projeto `drjcfalvlbbeblmmyhwj`, leitura de 2026-10-08. Nenhum usuário real foi usado.

## Método

Blocos `DO` executados como `postgres` via MCP:
- `SET LOCAL ROLE anon`; ou
- `SET LOCAL ROLE authenticated` com `request.jwt.claims.sub = 00000000-0000-4000-8000-0000000a0001` (UUID sintético, sem conta).

Toda tentativa de escrita roda num sub-bloco que **sempre** levanta exceção e é desfeito. As sondas de `DELETE` ficaram retidas pela confirmação humana do MCP e **não rodaram**; as contagens relidas depois estavam inalteradas (14 / 15 / 182 / 1 / 13 / 5).

## Resultados

| Verificação | Resultado |
|---|---|
| `ANON_CANNOT_ACCESS_PRIVATE_DATA` | **PASS**: 18 tabelas com dados reais (`user_progress` 14, `profiles` 15, `economy_ledger` 182, `beta_pedagogy_events` 1 888, `beta_feedback` 5, `subscriptions` 1, …); `anon` enxerga **0** linhas em todas |
| `USER_A_CANNOT_READ_USER_B` | **PASS**: usuário sintético enxerga **0** linhas nas mesmas 18 tabelas |
| `USER_A_CANNOT_UPDATE_USER_B` | **PASS**: `UPDATE … where user_id <> auth.uid()` afeta **0** linhas (`user_progress`, `user_srs`, `profiles`) |
| Inserir em nome de B | **PASS**: `insert into user_progress(user_id = B)` → `42501` (WITH CHECK); `anon` → `42501` |
| `USER_A_CANNOT_DELETE_USER_B` | **PASS estático**: RLS ligado em **todas** as 37 tabelas e **nenhuma** policy `DELETE`/`ALL`, então DELETE não casa nenhuma linha. Sonda de comportamento `NOT_RUN` (retida pelo MCP). |
| `SERVICE_ROLE_NOT_EXPOSED` | **PASS**: o gate `validate:apk-provenance` varre o bundle construído (191 arquivos) procurando JWT com `role=service_role`, `sb_secret_`, string de conexão Postgres e nomes de env secretos. Nada encontrado; a anon key pública, corretamente, não é sinalizada. O passo de CI faz o mesmo no APK desempacotado. |
| UPDATE tem SELECT + `WITH CHECK` | **PASS**: `profiles`, `user_progress`, `user_srs` (USING e WITH CHECK `auth.uid() = id/user_id`) |
| `TO authenticated` como substituto de ownership | Só em `league_tiers` (catálogo público, `using true`), intencional |
| Views | `admin_user_overview`: `security_invoker=true`, sem GRANT para `anon`/`authenticated` |
| SECURITY DEFINER públicas | 2 para `anon` (ingestão de feedback/telemetria, com sessão + quota). Amostra de `authenticated` com parâmetro de usuário (`sync_league_week`, `ensure_league_membership`) recusa `p_user_id ≠ auth.uid()`. As 28 seguem como `WARN` de advisor para revisão contínua. |
| Storage | Sem buckets, sem objetos |

## Defeitos encontrados

1. **`league_memberships_select_peers` → `42P17 infinite recursion detected in policy`** para qualquer `authenticated` que leia a tabela diretamente. A policy (repo `004_leagues.sql:584` e produção) consulta a própria tabela no `USING`. Falha fechada; o app não é afetado (lê ligas só via RPCs). Correção preparada, **não aplicada**: `supabase/pending/rc2-3-10-league-memberships-policy-recursion.sql` (helper `league_viewer_scope()` que devolve só a linha do próprio usuário, `search_path=''`, sem EXECUTE para `anon`) → `OA-LEAGUE-POLICY-FIX`.
2. **GRANTs de DELETE/TRUNCATE para `anon`/`authenticated`** em ~30 tabelas: `least_privilege_api_grants` não foi aplicada. O RLS bloqueia DELETE; TRUNCATE não é exposto pelo PostgREST e esses papéis não fazem login direto. Mesmo assim, falta essa camada de defesa (`REPO_ONLY` no ledger).
3. **Leaked password protection desligada** (advisor) → `OA-AUTH-RATE-LIMITS-READ`.

## Para virar PASS

`OA-LEAGUE-POLICY-FIX` aplicado e, junto, a aplicação controlada das migrations de GRANT (via `PRODUCTION_MIGRATION_READY`). Depois, rodar de novo esta matriz e o `cloud-smoke` (passo `account_isolation_basic`).
