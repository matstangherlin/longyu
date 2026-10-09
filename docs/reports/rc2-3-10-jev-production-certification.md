# RC2.3.10 — Jev: certificação de produção

| Gate | Status |
|---|---|
| `JEV_LEARNER_RUNTIME_DISABLED` | **PASS** |
| `JEV_SERVER_TRIAGE_PASS` | **OWNER_ACTION_REQUIRED** (redeploy a partir da `main` + leitura de créditos) |

## Escopo (inalterado)

O Jev continua **somente server-side**, na triagem administrativa de feedback (`triage-feedback`).
- `JEV_RUNTIME_ENABLED: false` é o default em `supabase/functions/_shared/budgetPolicy.ts`; `resolveCostPolicy` força `ALLOW_PAID_OVERAGE=false`.
- O Product Truth mostra `jev.learnerRuntimeEnabled: false`.
- Nenhum caminho do aluno chama o Jev: o bundle não contém `api.typesafe.ai` (gate de provenance).
- Nada desta wave expande o escopo (sem tutor, hint ou scoring).

## Produção × repo

`triage-feedback` em produção: **v1**, deploy em 2026-10-07T01:33Z, `verify_jwt=true`. Código lido via MCP (`get_edge_function`):

| Garantia | Produção v1 | Repo (`main`) |
|---|---|---|
| Só admin (`is_beta_admin`) | sim | sim |
| Chave só no servidor (`TYPESAFE_API_KEY` em Edge env → fallback Vault via `_edge_get_typesafe_api_key`, sem EXECUTE para `anon`/`authenticated`) | sim | sim |
| Timeout | 8 s | **3 s** |
| Kill switch `JEV_DEV_AUDIT_ENABLED` | **não** | sim (503 quando desligado) |
| Circuit breaker | **não** | sim (3 falhas → 60 s sem chamar) |
| Dedupe | **não** | sim (hash de entrada no lote + reuso de triagem idêntica já feita) |
| Teto por chamada | 25 | 25 |
| Validação de resposta | `answers` precisa ser objeto | idem + checagem de tipo por resposta |
| Logs | correlação sem conteúdo (`logOpsEdge`) | idem |

Checagens do repo: `JEV_KEY_NOT_CLIENT_EXPOSED`, `JEV_BUDGET_GUARD_PRESENT` (kill switch + teto de lote + dedupe + overage forçado off), `JEV_TIMEOUT_PRESENT`, `JEV_CIRCUIT_BREAKER_PRESENT`, `JEV_RUNTIME_FOR_LEARNER_DISABLED`. Todas viram regras em `checkJevGuardrails` (`npm run validate:rc2-3-10-cloud`), com mutações para timeout, breaker, runtime ligado, kill switch removido e chave no cliente.

`JEV_TRIAGE_FAILURE_NON_BLOCKING`: o envio de feedback (`submit_beta_feedback`) é uma RPC separada. A triagem só roda quando um admin a dispara; Jev indisponível nunca bloqueia o aluno e não entra em loop (falha por linha, sem retry).

## Por que não redeployei pelo MCP

O deploy via MCP exigiria redigitar ~580 linhas (4 arquivos) no payload. Um erro de transcrição iria direto para produção, sem prova byte a byte. Em vez disso, criei `.github/workflows/deploy-edge-function.yml`:
- só `workflow_dispatch`, só da `main`, `expected_sha` opcional;
- allowlist `triage-feedback`, confirmação `DEPLOY-triage-feedback`;
- roda `validate:rc2-3-10-cloud` (guardrails) antes;
- deploy com Supabase CLI 2.109.1 (`functions deploy --project-ref … --use-api`; flags confirmadas no `--help`);
- `functions list` vai para o summary como evidência.

Rollback: o código da v1 está registrado neste relatório (tabela acima + leitura MCP de 2026-10-08); para voltar, basta redeployar a v1.

## Owner action

`OA-JEV-CONSOLE-CHECK`:
1. Ler créditos e quota no console da TypeSafe (só o número).
2. Depois do merge, disparar o workflow com `expected_sha` = SHA do merge.

Smoke sintético depois do deploy: `cloud-smoke` (`edge_triage_requires_auth`) confirma `401`/`403` sem JWT. Uma triagem real com um feedback sintético `[cloud-smoke]` só acontece se o admin disparar o painel; nenhum conteúdo de usuário real vai para teste.
