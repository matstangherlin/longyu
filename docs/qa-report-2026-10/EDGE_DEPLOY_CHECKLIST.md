# Checklist — publicar Edge Functions (o Matty executa)

Nada disto foi publicado por este PR. O workflow continua só `workflow_dispatch`, só a partir de `main`. Confirme `DEPLOY-<nome>` e, se quiser, `expected_sha`.

Decisões deste prompt, padrão não confirmado por você: Business fica de fora (`submit-business-lead` não entra na allowlist). Placement (`commit-placement`, `finalize-onboarding`) também fica de fora até o SQL do #361 estar aplicado. As quatro funções que já respondem em produção e só precisam do CORS novo entram na allowlist.

`supabase/config.toml` não declara todas as funções. O padrão do repo é declarar quem foge do default `verify_jwt = true` (ou quem precisa do comentário). Não acrescentei blocos novos.

## verify_jwt esperado

| Função | verify_jwt | Por quê |
|---|---|---|
| `delete-account` | true (default; sem bloco) | O handler exige o JWT do usuário |
| `create-checkout-session` | true (default; sem bloco) | Sessão do aluno |
| `create-billing-portal` | true (default; sem bloco) | Sessão do aluno |
| `sign-in-identifier` | true (default; sem bloco) | Já publicada; a flag do app continua off |
| `create-account` | false | Cadastro público. Bloco já existe |
| `issue-anon-ingestion-session` | false | Valida `apikey` no handler. Bloco já existe |
| `submit-business-lead` | false | Formulário público. Não publicar nesta beta |
| `commit-placement` | true | Bloco já existe. Não publicar antes do SQL |
| `finalize-onboarding` | true | Bloco já existe. Não publicar antes do SQL |
| `triage-feedback` | true | Já na allowlist |
| `stripe-webhook` | false | Stripe, não o navegador. Sem headers `x-longyu-*` |

## Secrets (só os nomes)

| Função | Nomes |
|---|---|
| `delete-account` | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `APP_CANONICAL_ORIGIN`, `STRIPE_ALLOWED_ORIGINS`, `DELETE_ACCOUNT_MAX_TOKEN_AGE_SECONDS` |
| `create-checkout-session` | `STRIPE_SECRET_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `APP_CANONICAL_ORIGIN`, `STRIPE_ALLOWED_ORIGINS` |
| `create-billing-portal` | `STRIPE_SECRET_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `APP_CANONICAL_ORIGIN`, `STRIPE_ALLOWED_ORIGINS` |
| `issue-anon-ingestion-session` | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ANON_INGESTION_HASH_SECRET` |
| `create-account` | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `TURNSTILE_SECRET_KEY`, `TURNSTILE_ALLOW_SKIP` |
| `commit-placement` / `finalize-onboarding` | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |
| `submit-business-lead` | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `TURNSTILE_SECRET_KEY`, `BUSINESS_LEAD_NOTIFY_WEBHOOK_URL`, `BUSINESS_LEAD_NOTIFY_TOKEN` |
| `stripe-webhook` | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` |

## Ordem

1. Merge desta cadeia no `main`. O workflow só aceita `refs/heads/main`.
2. Staging, se existir: `npm run deploy:staging-functions` (você). Depois `SUPABASE_URL=<staging> npm run smoke:edge-preflight`.
3. Produção, uma função por vez, pelo workflow **Deploy Edge Function**. Primeiro as que já estão no ar e só mudam CORS: `delete-account`, `create-checkout-session`, `create-billing-portal`, `issue-anon-ingestion-session`.
4. `SUPABASE_URL=https://drjcfalvlbbeblmmyhwj.supabase.co npm run smoke:edge-preflight`. R-14: as quatro acima em 2xx com os três `x-longyu-*`.
5. R-15: "Excluir conta" com uma conta descartável, no site já publicado com este cliente. O build de produção hoje é `ec26ffc`; o header `x-longyu-*` sai do cliente novo. Sem um build `[release]`, o navegador antigo pode nem enviar esses headers.
6. `commit-placement` e `finalize-onboarding` só depois do SQL de placement do #361 e de um backup. `submit-business-lead` não entra nesta beta.
7. `create-account` já tem os headers no repo, mas o corpo atual chama o draft de placement. Não republicar até esse SQL existir.

## Se der errado

Rode o mesmo workflow apontando para o SHA anterior da função (o `expected_sha` da `main` anterior, se a função ainda estiver nesse commit) ou redeploy do commit de antes deste PR. Não há rollback automático. Não apague a função.
