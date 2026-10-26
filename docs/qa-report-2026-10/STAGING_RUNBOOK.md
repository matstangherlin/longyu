# Runbook — staging do Longyu (LGY-039)

Staging ainda não existe. Produção continua sendo o projeto Supabase MandarimProject, ref `drjcfalvlbbeblmmyhwj`, região `us-west-2`, site `https://singular-meringue-7838cd.netlify.app`. Este arquivo não cria nada remoto. Quem cria é o Matty, no painel.

## O que já existe no repositório

- `scripts/lib/staging-guard.mjs` recusa o ref de produção (`REFUSING_TO_USE_PRODUCTION_AS_STAGING`). Sem `LONGYU_STAGING_PROJECT_ID`, o resultado é `BLOCKED_REMOTE_STAGING`. Não há ref padrão.
- Comandos já prontos, todos fechados para produção: `identify:staging`, `migrate:staging`, `inventory:staging-migrations`, `assert:staging-schema`, `audit:staging-secrets`, `deploy:staging-functions`, `test:rls:staging`.
- `check:schema-health` e `smoke:edge-preflight` são somente leitura (prompts 03 e 05).
- O Netlify de produção aponta para o Supabase de produção. O deploy-preview usa backend local. O contexto `rc2-candidate` espera URL e anon key de QA no painel do Netlify, não no arquivo.
- `npm run qa:staging` (este prompt) só roda depois que as variáveis apontam para o projeto novo. Ele para no primeiro erro.

## O que falta para o staging ficar ativo

1. Um projeto Supabase separado, no plano gratuito, na mesma região da produção (`us-west-2`).
2. Um site Netlify separado apontando para esse projeto.
3. Secrets locais e do GitHub com os nomes abaixo, sem valores no git.
4. Auth do projeto novo: URLs de redirect e, no prompt 13, os templates de e-mail.
5. Contas de teste só nesse projeto.
6. Uma execução humana de `npm run qa:staging` depois que o item 1 estiver `ACTIVE_HEALTHY`.

O plano gratuito da Supabase conta dois projetos ativos. Produção já ocupa um. O staging ocupa o outro. Não há PITR nesse plano. Se o segundo slot estiver cheio, pause o projeto que não é produção — nunca pause o MandarimProject para abrir espaço sem anotar antes.

## 1. Criar o projeto Supabase

1. Painel Supabase → New project. Nome sugerido: `longyu-staging`. Organização à parte da de produção, se a cota permitir; senão, a mesma organização, projeto novo.
2. Região: `us-west-2` (a mesma do MandarimProject).
3. Senha do banco só no gerenciador de senhas. Não cole em chat, commit ou PR.
4. Espere o status `ACTIVE_HEALTHY`. Anote o ref (20 caracteres). A URL é `https://<ref>.supabase.co`.
5. Em Project Settings → API, copie a anon key. A service role fica só no gerenciador e nos secrets do GitHub. Ela não entra em `src/`, no bundle, nem no passo de Playwright.

Confira o ref com os olhos antes de continuar. Se for `drjcfalvlbbeblmmyhwj`, pare. Esse é produção.

## 2. Variáveis locais

No `.env.local`, que não é commitado:

```bash
LONGYU_STAGING_PROJECT_ID=<ref do staging>
STAGING_SUPABASE_URL=https://<ref>.supabase.co
STAGING_SUPABASE_ANON_KEY=<anon do staging>
STAGING_SUPABASE_SERVICE_ROLE_KEY=<service role do staging>
SUPABASE_ACCESS_TOKEN=<token pessoal da conta Supabase, para a Management API>
ALLOW_STAGING_SECURITY_TESTS=true
STAGING_WEB_URL=https://<site-de-staging>.netlify.app
PLAYWRIGHT_BASE_URL=https://<site-de-staging>.netlify.app
```

`SUPABASE_ACCESS_TOKEN` é o token da conta (formato de access token do painel), não a service role. Sem ele, `identify:staging` não confirma o status e `migrate:staging` não aplica.

Secrets do GitHub (Settings → Secrets → Actions), com os mesmos nomes e sem aparecer no log:

- `LONGYU_STAGING_PROJECT_ID`
- `SUPABASE_ACCESS_TOKEN`
- `STAGING_SUPABASE_URL`
- `STAGING_SUPABASE_ANON_KEY`
- `STAGING_SUPABASE_SERVICE_ROLE_KEY`
- `STAGING_WEB_URL`

O workflow `.github/workflows/qa-staging.yml` só roda em `workflow_dispatch`. Não há `push` nem `pull_request`.

## 3. Schema

Só depois de conferir que `LONGYU_STAGING_PROJECT_ID` não é o de produção:

```bash
npm run identify:staging
npm run migrate:staging -- --plan
npm run migrate:staging
npm run assert:staging-schema
```

`migrate:staging` lê `supabase/migrations` em ordem e para no primeiro erro. O `--plan` não escreve. Se o comando imprimir `REFUSING_TO_USE_PRODUCTION_AS_STAGING`, ele não chegou a escrever. Não use `npm run db:push`, `db:apply-api` nem `supabase db push`: esses caminhos conhecem o projeto de produção.

SQL em `supabase/pending/` não entra nessa lista sozinho. Se uma migration pendente precisar ir para o staging, ela tem de ser promovida a `supabase/migrations` num PR antes. Não aplique SQL de produção neste passo.

## 4. Funções

```bash
npm run deploy:staging-functions -- --plan
npm run deploy:staging-functions
```

O plano lista. O deploy sem `--plan` publica no ref de staging. Recusa o MandarimProject. Não publique função em produção a partir daqui.

## 5. Site Netlify

Crie um site novo (Add new site → mesmo repositório). Não reutilize o site `singular-meringue-7838cd`. No site novo, nas variáveis de ambiente do contexto que realmente publica:

- `VITE_APP_ENV=qa_candidate`
- `VITE_BACKEND_MODE=supabase`
- `VITE_SUPABASE_URL=https://<ref-do-staging>.supabase.co`
- `VITE_SUPABASE_ANON_KEY=<anon do staging>`
- `VITE_USE_TEST_FIXTURES=false`
- `VITE_ALLOW_PRO_PREVIEW=false`
- `VITE_SITE_URL=https://<site-de-staging>.netlify.app`

A anon key é pública no bundle. A service role não entra no Netlify.

O deploy-preview do site de produção continua local de propósito. Não aponte esse preview para o Supabase de produção para "testar staging".

## 6. Auth

No projeto de staging, Authentication → URL configuration:

- Site URL: `https://<site-de-staging>.netlify.app`
- Redirect URLs:
  - `https://<site-de-staging>.netlify.app/auth/callback`
  - `https://<site-de-staging>.netlify.app/redefinir-senha`
  - `https://<site-de-staging>.netlify.app/confirmar-email`

Templates de e-mail e SMTP ficam no prompt 13. Até lá o staging usa o SMTP padrão do Supabase.

Contas só neste projeto, com os e-mails `qa.free@longyu.app` e `qa.pro@longyu.app`. A senha fica no gerenciador. São usuários diferentes dos de produção, mesmo com o mesmo e-mail. Não copie a senha para o repositório.

## 7. Verificação única

```bash
npm run qa:staging
```

Ordem, parando no primeiro erro: `identify:staging` → `assert:staging-schema` → `check:schema-health` → `test:rls:staging` → `smoke:edge-preflight` → Playwright `@qa-staging` no Chromium.

O Playwright desse comando não sobe o preview local. O processo do browser não recebe service role nem access token.

No GitHub: Actions → QA staging (manual) → Run workflow. Sem os secrets, o job falha fechado. Isso é o comportamento certo.

## Specs `@qa-staging`

| Arquivo | O que faz |
|---|---|
| `e2e/qa-staging-smoke.spec.ts` | Abre `/` no site remoto e confere o título Longyu. Não grava dado. Sem `PLAYWRIGHT_BASE_URL`, o teste se pula. |

Os specs de fixture (`e2e/qa-*.spec.ts` de login, perfil, áudio, isolamento, e o restante que importa `e2e/helpers.ts`) semeiam `localStorage` e só valem no preview local. Com `PLAYWRIGHT_BASE_URL` num host que não é localhost, eles se pulam. Não os marque como staging.

Dados descartáveis de um spec futuro usam o prefixo `qa-e2e-` e apagam o que criaram. Este prompt não adiciona spec que escreve.

## Como destruir e recriar

1. Confirme de novo que o ref anotado não é `drjcfalvlbbeblmmyhwj`.
2. No painel do projeto de staging: Settings → General → Delete project. Digite o nome do projeto de staging.
3. Apague os secrets locais e do GitHub que apontavam para ele, ou troque pelos do projeto novo.
4. Crie outro projeto (`us-west-2`), atualize os secrets e o Netlify, e rode de novo a partir do passo 3 (`migrate:staging`).
5. Não delete, pause nem restaure o MandarimProject neste procedimento.

## Custo

Começa no plano gratuito dos dois lados (Supabase e Netlify). O limite que importa agora é o de dois projetos Supabase ativos. Staging pausado libera o slot e exige restore antes do próximo `qa:staging`. Sem PITR, um restore de staging volta ao backup do plano, não a um ponto no tempo. Produção também está sem PITR; isso não se resolve criando o staging.
