# RC2.3.10 — Cloud smoke pós-deploy

**Gate `CLOUD_SMOKE_PASS` = `NOT_RUN`.** O script e o workflow estão prontos; daqui não alcanço `*.supabase.co` nem `*.netlify.app` (egress bloqueado: `000`/`403` no proxy).

- Script: `scripts/cloud-smoke.mjs` (`npm run smoke:cloud`)
- Workflow: `.github/workflows/cloud-smoke.yml` (só `workflow_dispatch`; usa os secrets `VITE_SUPABASE_ANON_KEY`, `LONGYU_QA_EMAIL`, `LONGYU_QA_PASSWORD` da conta de QA semeada por `seed-test-account.yml`, nunca de um aluno real)

## Passos

| Passo | Verifica |
|---|---|
| `site_reachable` | site de produção responde |
| `release_sha` | `/version.json` tem SHA; se `expected_sha` foi informado, precisa bater |
| `security_headers` | CSP com `frame-ancestors 'none'`, `nosniff`, microfone `self`; registra HSTS |
| `supabase_auth_health` | `/auth/v1/health` |
| `edge_triage_requires_auth` | `triage-feedback` sem JWT de usuário → 401/403 |
| `login_synthetic_account` | login da conta de QA |
| `account_isolation_basic` | a conta de QA não lê nenhuma linha de `user_progress` de outro aluno |
| `progress_read_own` | lê a própria linha |
| `feedback_ingestion` | `submit_beta_feedback` com mensagem `[cloud-smoke] <runId>` (categoria `outro`) |
| `logout` | encerra a sessão |

## Garantias

- **Idempotente:** cada execução grava no máximo 1 linha, com namespace (`[cloud-smoke] <runId>`, `client_dedupe_key = runId`). Nenhuma outra escrita, nenhuma compra, nenhuma cobrança.
- **Removível:** depois do export, o owner apaga com `delete from beta_feedback where message like '[cloud-smoke]%'`.
- **Sem segredo no output:** só booleanos, contagens, códigos HTTP e o SHA público. O relatório JSON sobe como artifact.

## Não coberto (e por quê)

- Signup real: o `create-account` exige Turnstile (correto em produção) e não é automatizável sem bypass. Fica no checklist físico.
- Escrita de progresso: a conta de QA não deve ter o progresso alterado por um smoke; a escrita é coberta pela RLS (`rc2-3-10-production-rls.md`) e pelo checklist físico de sync.
