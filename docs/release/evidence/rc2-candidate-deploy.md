# Runbook — RC2.2 Candidate Deploy (QA production-like)

Este runbook publica o **alvo** contra o qual RC2.2.1 (nuvem), RC2.2.2
(dispositivos/PWA/rollback) e RC2.2.3 (QA humano) vão rodar. Ele **não** fecha
nenhum check operacional: ao final, todos continuam `false`.

Quem executa precisa de: acesso ao Netlify, um projeto Supabase QA (ou permissão
para criar um) e `SUPABASE_ACCESS_TOKEN` com permissão de migrations/Edge
Functions nesse projeto. **Nenhum desses valores entra neste repositório.**

---

## Regra que não se negocia

**Deploy preview normal NÃO é RC2 candidate.** O contexto `deploy-preview` roda
com `VITE_BACKEND_MODE=local`, então não prova auth, sync, feedback cloud,
league cloud nem entitlements. Se `CONTEXT=deploy-preview` e
`VITE_BACKEND_MODE=local`, aquilo não é candidate — é preview.

**Produção nunca é o alvo de QA.** O projeto de produção é
`drjcfalvlbbeblmmyhwj` (MandarimProject). O guard
(`scripts/lib/staging-guard.mjs`) recusa esse ref em qualquer caminho de QA.

---

## P1 — Topologia QA

1. Verifique se já existe ambiente QA válido (projeto Supabase de staging,
   site Netlify QA). **Reutilize** — não crie duplicata.
2. Se não existir, provisione um projeto Supabase QA separado.
3. Atenção à cota de projetos ativos do plano Free do Supabase.

## P2 — Supabase QA

```bash
export RC2_QA_PROJECT_REF=<ref do projeto QA>        # != drjcfalvlbbeblmmyhwj
export SUPABASE_ACCESS_TOKEN=<token>                 # nunca commitar
```

O `ref` e a `anon key` são públicos por design (aparecem no bundle). O que
**nunca** sai do Vault/provider: `service_role`, senha do banco, JWT secret,
`TURNSTILE_SECRET_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`.

## P3/P4 — Migrations: inventário, drift, aplicação

```bash
npm run audit:rc2-qa-backend       # só lê; mostra expected/applied/drift
```

- `MIGRATION_MISSING_IN_QA` → aplique com o mecanismo já existente:
  ```bash
  LONGYU_TARGET_PROJECT_ID=$RC2_QA_PROJECT_REF npm run migrate:staging
  ```
- `MIGRATION_UNKNOWN_IN_QA` → **entenda a origem antes de seguir.**
  Não apague o banco QA só para ficar verde.
- Rode o audit de novo até `PASS`. Registre expected/applied/drift/schemaVersion.

## P5 — Edge Functions

Deploy em QA **apenas** das funções necessárias ao PUBLIC_BETA_CORE:
`create-account`, `delete-account`, `commit-placement`, `finalize-onboarding`,
`issue-anon-ingestion-session`.

```bash
LONGYU_TARGET_PROJECT_ID=$RC2_QA_PROJECT_REF npm run deploy:staging-functions
```

As funções comerciais (`create-checkout-session`, `create-billing-portal`,
`stripe-webhook`, `submit-business-lead`) **não** são necessárias: Pro/Family
continuam `planned` e o checkout público não completa.

## P6/P7 — Netlify candidate

Dois modelos aceitáveis. Prefira (A) se já houver infraestrutura:

- **(A) Site Netlify QA dedicado** — evita confundir preview / candidate /
  produção. As variáveis abaixo vão no escopo do site.
- **(B) Branch deploy** — crie a branch `rc2-candidate` apontando para o commit
  C. `netlify.toml` já traz `[context."rc2-candidate".environment]`.

Variáveis que **precisam** vir do provider (não estão versionadas):

```
VITE_SUPABASE_URL=https://<ref QA>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon do QA>
VITE_SITE_URL=<URL do candidate>
```

Já vêm do `netlify.toml`: `VITE_APP_ENV=qa_candidate`,
`VITE_BACKEND_MODE=supabase`, `VITE_USE_TEST_FIXTURES=false`,
`VITE_ALLOW_PRO_PREVIEW=false`.

**Não altere o contexto `production`.** Produção permanece isolada; o candidate
não herda secret de produção.

`scripts/assert-netlify-env.mjs` falha o build se qualquer peça faltar — falha
fechada, de propósito.

## P12 — Criar o commit C

Termine **todas** as alterações de runtime/config antes. Depois:

```bash
npm ci
npm run validate:beta
npm run build
npm run gate:public-beta-core
npm run validate:security-boundaries
npm run validate:frontend-secrets
RC2_CANDIDATE_CODE_SHA=$(git rev-parse HEAD)   # este é o C
```

## P13 — Deployar exatamente C

Publique o commit C (branch deploy apontando para C, ou deploy do site QA a
partir de C).

## P13.1/P37 — Verificar a identidade

```bash
RC2_CANDIDATE_URL=https://<candidate>  RC2_EXPECTED_SHA=$RC2_CANDIDATE_CODE_SHA \
  npm run verify:rc2-candidate-identity
```

Isso mede, no deploy real: `commitSha` vs C, `environment=qa_candidate`,
headers de segurança, `Cache-Control` do SW/manifest, refresh direto em
`/jornada`, `/cultura`, `/cultura/colecao/china_history`, `/perfil`, e que o ref
de produção não aparece. `commitSha != C` → **FAIL**, e nada é registrado.

## P14 — Regra da auto-referência

**Não** tente escrever `candidateSha=C` dentro do próprio commit C — isso mudaria
o SHA. Fluxo correto:

```
C (último commit de runtime) → deploy C → verificar C → commit D (só docs/release)
```

O runtime de D é idêntico ao de C.

## P15/P16/P17 — Commit D (somente evidência)

Em `docs/release/rc2-candidate.json`:

```json
{
  "status": "DEPLOYED",
  "candidateSha": "<C, 40 hex>",
  "deploymentUrl": "https://<candidate>",
  "deployedAt": "<timestamp real>",
  "environment": "qa",
  "appEnv": "qa_candidate",
  "supabaseRef": "<ref QA>",
  "backendMode": "supabase",
  "fixtures": false,
  "fingerprint": "516692632525",
  "contentFreezeSha": "24ba129d79e61124c7d6dd3aaa3756eb9a6adf40"
}
```

- `docs/release/public-beta-core.json` → `releaseCandidateSha: C`.
  **Verdict continua `NO-GO`.**
- `docs/release/rc1-operational-checks.json` → `release_candidate_sha: C`.
  **Nenhum check vira `pass: true`** só porque o candidate foi publicado.

Depois: `npm run gate:rc2-candidate-infra`.

## P20 — Supabase Auth URLs (projeto QA)

Site URL + redirect URLs do candidate, incluindo `/confirmar-email` e
`/redefinir-senha`. Sem wildcard excessivo só para "fazer auth funcionar".

## P22 — Turnstile

Se o cadastro/feedback usa Turnstile, configure chaves **de QA**:
`VITE_TURNSTILE_SITE_KEY` no frontend (pública) e `TURNSTILE_SECRET_KEY` nos
secrets do Supabase QA. Se o Turnstile bloquear o candidate, **corrija a config
de QA** — não desligue a segurança em silêncio.

## P32 — Database safety smoke

1. Crie uma conta QA no candidate.
2. Faça uma operação mínima (concluir uma lição).
3. Confirme que a escrita foi para o projeto QA.
4. **Confirme que produção não recebeu essa conta.**

## P34 — Depois de C

Qualquer commit que altere `src/`, `public/`, `netlify.toml`, migrations, Edge
Functions, build config ou dependência de runtime **invalida C**. Nesse caso:
crie **C2**, faça deploy de C2, atualize os manifestos, e toda a evidência de
nuvem passa a ser contra C2. Evidência de C **não** vale para C2.

Permitido depois de C: commits só em `docs/release/**` e `docs/reports/**`.

## P18 — Squash merge

Esta stack ainda não foi mergeada, e o projeto usa squash merge. Quando a stack
entrar na main, a SHA será **diferente** de C. C é o *QA certification
candidate*, não a SHA pública final. RC2.3 recaptura a SHA pós-merge, redeploya
e reexecuta as evidências que o freshness gate considerar sensíveis à SHA.
