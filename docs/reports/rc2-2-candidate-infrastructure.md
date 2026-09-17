# RC2.2 — Public Beta Candidate Infrastructure

**Resultado: `BLOCKED_CREDENTIALS`.**

A infraestrutura do candidate foi construída inteira em código. Nenhum candidate
foi publicado, porque este ambiente não tem credencial de Netlify nem projeto
Supabase QA. `candidateSha`, `deploymentUrl` e `release_candidate_sha`
continuam **vazios** — e é assim que devem estar.

---

## 1. Stack

| | |
|---|---|
| PR base herdado | [#270](https://github.com/matstangherlin/longyu/pull/270) — RC2.1.2 Guide motion + PUBLIC_BETA feature freeze |
| `STACK_BASE_SHA` | `dd684150eef48ef1e6c32cc707f429f5f5527150` |
| Branch base | `cursor/guide-motion-beta-freeze-5b4f` |
| Branch desta remessa | `claude/compassionate-bell-oqkax4` |
| Base desta branch | HEAD real do #270, verificado |

`git merge-base --is-ancestor dd68415 origin/cursor/guide-motion-beta-freeze-5b4f`
→ verdadeiro. O HEAD remoto do #270 **é** exatamente `dd68415` (não avançou),
então a branch nasce do tip real. Não voltou para `main`, não esperou merge, não
recriou GuideDialogue, Guide Motion, Culture Moments, Culture Atlas nem
PUBLIC_BETA_CORE.

**Nota sobre o nome da branch.** A remessa pediu `cursor/rc2-candidate-infra-`.
Este agente roda sob um harness que designa `claude/compassionate-bell-oqkax4`
e proíbe push para outra branch. A branch designada foi **recriada a partir de
`dd68415`**, o que preserva a exigência real (a stack nasce do HEAD do #270, não
da main). Se abrir PR antes do #270 mergear, a **base do PR deve ser
`cursor/guide-motion-beta-freeze-5b4f`**, nunca `main`.

---

## 2. P0 — Auditoria da infra existente (antes de criar qualquer coisa)

| Item | Estado encontrado | Decisão |
|---|---|---|
| `netlify.toml` | contextos `production` e `deploy-preview` | **reusado**, contexto candidate acrescentado |
| `scripts/assert-netlify-env.mjs` | guard de production + preview, ref de produção inline | **estendido**, ref agora vem do guard compartilhado |
| `scripts/lib/staging-guard.mjs` | já conhece produção (`drjcfalvlbbeblmmyhwj`) | **reusado**, não duplicado |
| `scripts/lib/migration-drift.mjs` | inventário + hash + classificação de drift | **reusado** |
| `scripts/lib/edge-functions.mjs` | catálogo + `verify_jwt` | **reusado** |
| `scripts/apply-staging-migrations.mjs` (`migrate:staging`) | mecanismo oficial de migrations | **reusado**, nenhuma segunda estratégia criada |
| `scripts/vite-build.mjs` | **já emite `dist/version.json`** (#268) | **reusado** — nenhum `buildIdentityV2` criado |
| `validate:rc2-candidate-config` / `-drift` | existiam (#268) | **estendidos**, não substituídos |

### P0.1 — O que **não** foi criado por já existir autoridade

`buildIdentityV2`, `candidateIdentity2`, `versionEndpoint2`, segundo ref de
produção, segunda estratégia de migrations. Nada disso foi criado.

---

## 3. Defeito real encontrado e corrigido

`src/lib/appEnvironment.ts` **não conhecia `qa_candidate`**. Um build com
`VITE_APP_ENV=qa_candidate` caía no fallback e era resolvido como
`production_beta`.

Consequência concreta: o candidate seria indistinguível do ambiente principal em
runtime — mesmo rótulo no painel admin, mesmo `env` no diagnóstico de cliente,
mesmo default de feature flag. Certificar isso não diria nada sobre o candidate
*enquanto candidate*.

Correção: `qa_candidate` virou um `AppEnvironment` de primeira classe, e
`isProductionLikeEnv()` (= `production_beta` **ou** `qa_candidate`) passou a ser
a autoridade para tudo que só pode valer em dev/preview:

| Afrouxamento | Antes em `qa_candidate` | Agora |
|---|---|---|
| Pro Preview (`isProPreviewBuildAllowed`) | bloqueado via fallback | **bloqueado explicitamente** |
| Fixtures (`isTestFixturesAllowed`) | bloqueado via fallback | **bloqueado explicitamente** |
| QA Fast Path `/qa` (`isQaFastPathAllowed`) | bloqueado via fallback | **bloqueado explicitamente** |
| Conta local (`isDevLocalAuthAllowed`) | bloqueado via fallback | **hard-fail se a flag vazar** |
| Handoff V4.7.1 (`isCloudOnboardingV2Enabled`) | **ligado** (divergia de produção) | **desligado, como produção** |

A última linha era a que mais importava: o candidate teria rodado com o handoff
V2 **ligado** enquanto produção o mantém desligado — batendo em Edge Functions
que produção não usa. Um candidate assim não é production-like.

---

## 4. P1 — Topologia QA escolhida

Descoberta primeiro: **não existe** projeto Supabase QA/staging provisionado
(`LONGYU_STAGING_PROJECT_ID` não tem default e não está setado), e não existe
site Netlify QA. Existe apenas o rehearsal efêmero local e o projeto de produção.

Como não havia ambiente QA válido para reutilizar (P1.1) e este ambiente não tem
credenciais para provisionar (P1.2), a topologia foi **especificada e codificada**,
não provisionada:

- **Modelo (A), preferido:** site Netlify QA dedicado — evita confundir PR
  preview / candidate / produção (P6.1).
- **Modelo (B), codificado agora:** branch deploy explícito
  `[context."rc2-candidate".environment]` em `netlify.toml`.

Os dois usam o mesmo contrato de variáveis, então trocar de modelo não muda
código.

**P1.3 respeitado:** nada em RC2 aponta para o banco de produção.

---

## 5. P2 — Supabase QA

| | |
|---|---|
| Ref de produção (proibido em QA) | `drjcfalvlbbeblmmyhwj` (MandarimProject) |
| Ref QA | **não existe** — `BLOCKED_CREDENTIALS` |
| Guard de isolamento | `scripts/lib/staging-guard.mjs`, reusado |

Prova de isolamento (P2.1), em três camadas independentes:

1. **Build** — `assert-netlify-env.mjs` falha com `PRODUCTION_REF` se a URL
   Supabase do candidate contiver o ref de produção.
2. **Manifesto** — `validateRc2CandidateConfig` falha com `PRODUCTION_SUPABASE`.
3. **Deploy real** — `verify:rc2-candidate-identity` varre o HTML servido e falha
   com `PRODUCTION_REF_IN_CANDIDATE`.

**P2.2:** o ref QA é registrado **mascarado** (`maskProjectRef`) em relatório e
log. Nenhum `service_role`, senha ou JWT secret é versionado.

**P2.3:** a anon key é pública por design, mas **não** foi hardcoded: vem do
escopo do provider. `netlify.toml` deliberadamente **não** contém URL nem anon
key de QA — se faltarem, o build falha fechado.

---

## 6. P3/P4 — Migrations

```
npm run audit:rc2-qa-backend
```

| | |
|---|---|
| Migrations esperadas (repo) | **52** |
| Última versão local | `20260914210000_family_entitlement` |
| `schemaVersion` (hash do conjunto) | `d15c77418972cdc3c422967e8adb5dbd45e9d3220378c85159cec718160ffee6` |
| Migrations aplicadas no QA | **desconhecido** — `BLOCKED_CREDENTIALS` |
| Drift | **não avaliável** sem histórico remoto |
| Erros | nenhum na parte local |

**P3.1 respeitado:** o script **não** reporta "aplicado" a partir do Git. Sem
histórico remoto ele diz `BLOCKED_CREDENTIALS` e mantém o candidate bloqueado.

**P3.2:** aplicar continua sendo `migrate:staging` com
`LONGYU_TARGET_PROJECT_ID=<ref QA>`. Nenhuma segunda estratégia foi inventada.

**P4.1:** `MIGRATION_MISSING_IN_QA` ou `MIGRATION_UNKNOWN_IN_QA` mantêm o
candidate `BLOCKED`.
**P4.2:** o script nunca reseta o banco; a mensagem de `MIGRATION_UNKNOWN_IN_QA`
manda entender a origem antes de seguir.

---

## 7. P5 — Edge Functions

Necessárias ao PUBLIC_BETA_CORE (deploy em QA apenas destas):

| Função | `verify_jwt` |
|---|---|
| `create-account` | `false` (cadastro público) |
| `delete-account` | `true` |
| `commit-placement` | `true` |
| `finalize-onboarding` | `true` |
| `issue-anon-ingestion-session` | `false` |

Adiadas (comerciais, não bloqueiam beta gratuita — P25):
`create-checkout-session`, `create-billing-portal`, `stripe-webhook`,
`submit-business-lead`.

**Deployadas em QA: nenhuma** — `BLOCKED_CREDENTIALS`.

**P5.2:** secrets (`TURNSTILE_SECRET_KEY`, `STRIPE_*`, `service_role`) vão para
o Vault/secrets do Supabase. Nunca frontend, nunca `VITE_*`, nunca docs, nunca
commit.

---

## 8. P6–P9 — Netlify candidate e contrato de env

`netlify.toml` ganhou `[context."rc2-candidate".environment]`:

```toml
VITE_APP_ENV = "qa_candidate"
VITE_BACKEND_MODE = "supabase"
VITE_ALLOW_PRO_PREVIEW = "false"
VITE_USE_TEST_FIXTURES = "false"
VITE_CLOUD_ONBOARDING_V2_ENABLED = "false"   # acompanha produção
VITE_ENABLE_BETA_FEEDBACK = "true"           # P23 — prepara o runbook
VITE_ENABLE_TELEMETRY = "true"
```

`VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` ficam **fora** do arquivo, no
escopo do provider (P2.3, P7). Ausentes → build falha.

**P6.3** está codificado: `CONTEXT=deploy-preview` + `VITE_BACKEND_MODE=local`
nunca satisfaz o contrato `qa_candidate`.

**P7.1/P7.2:** o contexto `production` não foi tocado. `assert-netlify-env.mjs`
agora **recusa** `VITE_APP_ENV=qa_candidate` sob `CONTEXT=production`, e
`validate:rc2-candidate-infra` falha com `PRODUCTION_DRIFT` se alguém apontar
produção para QA.

**P8.2** — `qa_candidate` exige: `backendMode=supabase` · Supabase URL presente ·
anon key presente · `fixtures=false` · Pro Preview `false` · conta local `false` ·
ref Supabase ≠ produção. **P8.3** — `VITE_BACKEND_MODE=local` é rejeitado.

---

## 9. P10/P11/P37 — Identidade de deploy

**Reusada**, não recriada: `scripts/vite-build.mjs` (de #268) já emite
`dist/version.json`:

```json
{ "commitSha": "...", "appVersion": "...", "environment": "...", "builtAt": "..." }
```

Público e mínimo (P10.3): sem secrets, sem env completo, sem credencial de banco.
`IDENTITY_OVERSHARE` falha se alguém acrescentar campo.

Gate novo: `npm run verify:rc2-candidate-identity`

| Entrada | `RC2_CANDIDATE_URL` + `RC2_EXPECTED_SHA` (ou manifesto) |
|---|---|
| Saída | expected SHA · actual SHA · environment · headers reais · rotas · PWA |

**P11.1** codificado: `commitSha` precisa casar `/^[0-9a-f]{40}$/`. Branch name,
`latest`, número de PR e short label falham com `AMBIGUOUS_SHA`.

**P37.1:** a URL do candidate **não** é hardcoded em runtime — vem de env ou do
manifesto de release.

**Estado: não executado.** Sem candidate publicado, o gate sai
`BLOCKED_CREDENTIALS` com exit 2.

---

## 10. P12–P17 — Candidate C, deploy, manifestos

| | |
|---|---|
| `RC2_CANDIDATE_CODE_SHA` (C) | **não capturado** |
| SHA de docs (D) | **não criado** |
| `candidateSha` no manifesto | `""` |
| `releaseCandidateSha` no PUBLIC_BETA_CORE | `""` |
| `release_candidate_sha` nos operational checks | `""` |
| URL do candidate | nenhuma |
| `deployedAt` | `null` |
| `backendMode` | `null` |
| `fixtures` | `null` |

Capturar C sem deploy seria preencher um campo cujo significado é "existe uma
build publicada com esta SHA". Não existe. Os gates agora **impedem** isso:
`SHA_WITHOUT_DEPLOY`, `URL_WITHOUT_DEPLOY`, `DEPLOYED_AT_WITHOUT_DEPLOY`.

**P14/P14.1** estão documentados no runbook: C é o último commit de runtime;
`candidateSha=C` só pode ser escrito em D, depois do deploy verificado.

**P16.1:** verdict continua **NO-GO**.
**P17.1/P17.2:** **nenhum** check operacional virou `pass=true`. Todos os 13
continuam `false` com `testedAt: null`. O gate falha com
`CHECK_PASS_WITHOUT_RUN` se alguém marcar `pass` sem `testedAt`.

---

## 11. P18 — Stacked SHA vs main SHA (registrado, não escondido)

Estamos deliberadamente certificando uma stack **ainda não mergeada**. Isso é
permitido para QA.

Mas o projeto usa **squash merge**. Quando a stack for squash-mergeada, a SHA da
`main` será **diferente** de C.

**Consequência:** o candidate C desta fase é um *QA certification candidate*.
**Não** assuma que C será a SHA pública final. RC2.3 captura a SHA final
pós-merge, faz o deploy final e reexecuta os checks que o freshness gate
considerar sensíveis à SHA.

Isto está registrado também em `docs/release/rc2-candidate.json` (`notes`) e no
runbook, não só aqui.

---

## 12. P19–P23 — URL, Auth, CORS, Turnstile, Feedback

| Item | Estado |
|---|---|
| **P19** URL HTTPS | contrato exige HTTPS (`INSECURE_URL` no manifesto, rejeição no gate de identidade). Netlify URL é aceitável; domínio próprio não é exigido ainda |
| **P19** deep routes SPA | `netlify.toml` já tem `/* → /index.html 200`; medido de verdade em `/jornada`, `/cultura`, `/cultura/colecao/china_history`, `/perfil` |
| **P20** Supabase Auth URLs | **não configurado** — `BLOCKED_CREDENTIALS`. Runbook especifica Site URL + `/confirmar-email` + `/redefinir-senha`, **sem wildcard excessivo** (P20.1) |
| **P21** CORS/origins | CSP `connect-src` já permite `https://*.supabase.co` e `wss://*.supabase.co` → a origem QA é coberta sem afrouxar nada. O gate falha com `CSP_NO_SUPABASE` se isso regredir |
| **P22** Turnstile | site key é pública (`VITE_TURNSTILE_SITE_KEY`); `TURNSTILE_SECRET_KEY` fica nos secrets do Supabase QA. Runbook: se bloquear, **corrigir config de QA**, não desligar segurança |
| **P23** Feedback | candidate carrega `VITE_ENABLE_BETA_FEEDBACK=true` para **permitir** o runbook depois. **P23.1: não marcado PASS** |

---

## 13. P24/P25 — League e Comercial

- `leaguePubliclyEnabled` continua **`false`**. Preservado.
  `league_cloud_smoke` continua **condicional** e **não bloqueia** o candidate core.
  O gate falha com `LEAGUE_ENABLED` se alguém ligar sem decisão explícita.
- Nenhum checkout público foi configurado. Pro `planned`, Family `planned`,
  Business `pilot` — **product truth inalterado**.
- Candidate **não** precisa de Stripe Test Mode nem de config de produção Stripe
  para existir.

---

## 14. P26/P27 — Segurança

| Gate | Estado |
|---|---|
| `validate:security-boundaries` | ✅ verde |
| `validate:frontend-secrets` (pós-build) | ✅ verde — zero secrets no bundle |
| Production ref no config do candidate | ✅ bloqueado em 3 camadas |
| `service_role` / `sk_live` / `sk_test` / `whsec_` em `VITE_*` | ✅ `SECRET_IN_FRONTEND` |

---

## 15. P28–P33 — Medições contra o candidate real

**Nenhuma foi executada**: não há candidate. Todas estão **implementadas e
prontas** em `verify:rc2-candidate-identity`, e todas falham fechado hoje.

| Check | Implementado | Executado |
|---|---|---|
| P28 smoke (candidate abre) | parcial (HTTP) | ❌ |
| P29 refresh de rota profunda | ✅ 4 rotas | ❌ |
| P30 headers reais (request de verdade, não inferido do toml) | ✅ CSP, XFO, XCTO, Referrer, Permissions | ❌ |
| P30 `Cache-Control` de `/sw.js` e `/manifest.webmanifest` | ✅ | ❌ |
| P31 PWA básico (manifest carrega, SW responde) | ✅ | ❌ |
| P32 database safety smoke (conta QA fica no QA) | runbook | ❌ |
| P33 rótulo QA em build metadata | ✅ `environment: "qa_candidate"` em `/version.json` | ❌ |

**P28.1:** isto não substitui os runbooks de nuvem (RC2.2.1).

---

## 16. P34–P38 — Drift, identidade e o gate de infra

- **P34/P35:** regra documentada no runbook. Depois de C, só `docs/release/**` e
  `docs/reports/**`. Qualquer mudança em `src/`, `public/`, `netlify.toml`,
  migrations, Edge Functions, build config ou dependência de runtime **invalida C**
  → criar C2, deployar C2, evidência de nuvem passa a ser contra C2.
- **P36:** `validate:rc2-candidate-drift` reusado; `STALE_EVIDENCE` e
  `RUNTIME_DRIFT` já matavam evidência de C usada contra C2.
- **P37:** `verify:rc2-candidate-identity` criado.
- **P38:** `gate:rc2-candidate-infra` criado, exigindo feature freeze, content
  freeze, config do candidate, infra do candidate, drift, security boundaries,
  `validate:beta`, `build` e secrets do frontend.

### Mutações mortas (P42)

`npm run test:rc2-candidate-infra` — **35 mutações**, todas mortas:

| # | Mutação | Código |
|---|---|---|
| 1 | candidate usa backend local | `LOCAL_BACKEND` |
| 2 | candidate usa fixtures | `FIXTURES_ON` |
| 3, 5 | candidate/QA aponta para produção | `PRODUCTION_REF`, `PRODUCTION_SUPABASE`, `CONTEXT_PRODUCTION_REF` |
| 4 | candidate usa app env de produção | `NOT_CANDIDATE_ENV`, `BAD_ENVIRONMENT`, `BAD_APP_ENV` |
| 6 | `release_candidate_sha` antes do deploy | `CANDIDATE_SHA_TOO_EARLY`, `SHA_WITHOUT_DEPLOY` |
| 7 | `candidateSha` ≠ SHA deployada | `SHA_MISMATCH` |
| 8 | identidade de deployment inexistente | `NO_IDENTITY`, `NO_DEPLOY_IDENTITY` |
| 9 | `DEPLOYED` sem `deploymentUrl` | `MISSING_URL` |
| 10 | `deployedAt` vazio com `DEPLOYED` | `MISSING_DEPLOYED_AT` |
| 11 | `backendMode` ≠ supabase | `BAD_BACKEND`, `CONTEXT_BACKEND` |
| 13, 14 | migration ausente / drift ignorado | `MIGRATION_MISSING_IN_QA`, `MIGRATION_UNKNOWN_IN_QA` |
| 15, 16, 17 | `service_role` / Stripe / Turnstile secret no frontend | `SECRET_IN_FRONTEND` |
| 18, 19 | runtime muda depois de C; evidência de C usada contra C2 | `RUNTIME_DRIFT`, `STALE_EVIDENCE` |
| 20 | SHA da branch tratada como SHA final da main | registrado (§11) |
| 26 | League habilitada sem decisão | `LEAGUE_ENABLED` |
| 27 | check vira PASS só porque deployou | `CHECK_PASS_WITHOUT_RUN` |
| — | Pro Preview / conta local ligados no candidate | `PRO_PREVIEW_ON`, `LOCAL_AUTH_ON` |
| — | branch/short SHA como identidade | `AMBIGUOUS_SHA` |
| — | identidade vazando env | `IDENTITY_OVERSHARE` |
| — | verdict GO precoce | `EARLY_GO` |
| — | produção apontada para QA | `PRODUCTION_DRIFT` |

Mutações 12 (conta no banco de produção), 21–25 (CultureItem novo, lesson count,
fingerprint, Pro/Family `available`) são cobertas pelos gates de currículo e
product truth já existentes, que continuam verdes.

---

## 17. P40/P41 — Feature freeze e currículo

**P40 — diff desde #270.** Nenhuma feature. O diff é: release infra, config de
QA, identidade de candidate, guards, testes e docs. A única mudança de
comportamento em `src/` é o reconhecimento de `qa_candidate` e o fechamento dos
afrouxamentos nesse ambiente — que **restringe**, não acrescenta.

**P41 — currículo, depois:**

| Métrica | Congelado | Medido |
|---|---|---|
| lessons | 134 | **134** ✅ |
| teachingTopics | 113 | **113** ✅ |
| cultureItems | 30 | **30** ✅ |
| cultureNativeLessons | 30 | **30** ✅ |
| journeyCultureNodes | 20 | **20** ✅ |
| fingerprint | `516692632525` | **`516692632525`** ✅ |

`FEATURE_FREEZE=PUBLIC_BETA` e `CURRICULUM_FREEZE=RC2_CONTENT_FREEZE`
preservados. Product truth inalterado.

---

## 18. Gates executados

| Gate | Resultado |
|---|---|
| `build` | ✅ PASS (exit 0) — `dist/version.json` com SHA de 40 hex, `sw.js` e `manifest.webmanifest` emitidos |
| `validate:frontend-secrets` (pós-build) | ✅ PASS — nenhum segredo no `dist/` |
| `validate:beta` | ⚠️ **não concluído neste ambiente** — ver nota abaixo |
| `validate:security-boundaries` | ✅ PASS |
| `validate:public-beta-core` | ✅ PASS (**NO-GO**, como esperado) |
| `validate:public-beta-feature-freeze` | ✅ PASS |
| `validate:rc2-content-freeze` | ✅ PASS · 30 items · 20 journey culture · fp `516692632525` |
| `typecheck` | ✅ PASS |
| `validate:app-environment` | ✅ PASS |
| `test:entitlements` / `test:qa-fast-path` | ✅ PASS |
| `validate:production-no-fixtures` | ✅ PASS |
| `validate:rc2-candidate-config` / `-drift` / `-infra` | ✅ PASS |
| `test:rc2-candidate-infra` | ✅ 35 mutações mortas |
| `verify:rc2-candidate-identity` | ⛔ `BLOCKED_CREDENTIALS` (exit 2) |
| `audit:rc2-qa-backend` | ⛔ `BLOCKED_CREDENTIALS` (exit 2) |

### Nota honesta sobre `validate:beta`

A cadeia `validate:beta` tem várias centenas de passos. Este agente roda num
container que **suspende entre turnos**, então o processo acumulou apenas
segundos de CPU ao longo de várias esperas de 10 minutos — concluir a cadeia
inteira aqui não era praticável.

O que de fato aconteceu: a cadeia rodou até
`test:travel-conversation-naturalness` e **todos os passos executados passaram**
(nenhuma falha em nenhum ponto) antes de ser interrompida. Em seguida `build` e
`validate:frontend-secrets` rodaram inteiros e passaram.

Todos os validadores que **esta remessa toca** foram executados
individualmente e passam: `validate:app-environment`, `test:entitlements`,
`test:qa-fast-path`, `validate:production-no-fixtures`,
`validate:rc2-content-freeze`, `validate:rc2-candidate-config`,
`validate:rc2-candidate-drift`, `validate:rc2-candidate-infra`,
`test:rc2-candidate-infra`, `validate:public-beta-core`,
`validate:public-beta-feature-freeze`, `validate:security-boundaries`,
`typecheck`.

**A autoridade sobre `validate:beta` é o CI da PR**, que roda a cadeia completa
mais `build` e `validate:frontend-secrets`. O DoD só está fechado quando o
workflow ficar verde.

Contrato do candidate também exercitado de verdade contra
`scripts/assert-netlify-env.mjs` com env simulada de Netlify:

| Cenário | Resultado |
|---|---|
| candidate válido (supabase QA, fixtures/Pro Preview off) | ✅ exit 0, ref mascarado no log |
| candidate com `VITE_BACKEND_MODE=local` | ✅ exit 1 · `LOCAL_BACKEND` |
| candidate apontando para o Supabase de **produção** | ✅ exit 1 · `PRODUCTION_REF` |

**P39 — CI:** Chromium, WebKit, Firefox e Security rodam no CI da PR. WebKit é
bloqueante desde RC2 P2.1. Este relatório não declara CI verde por conta própria
— o resultado é o do workflow na PR.

---

## 19. `BLOCKED_CREDENTIALS` — lista exata do que falta

Sem segredo neste relatório. O que este ambiente **não** tem:

1. **Netlify** — token (`NETLIFY_AUTH_TOKEN`) ou acesso ao painel, para criar o
   site QA / branch deploy do candidate e setar env no escopo certo.
2. **Projeto Supabase QA** — não existe. Precisa de ref + URL
   (`RC2_QA_PROJECT_REF`), obrigatoriamente ≠ `drjcfalvlbbeblmmyhwj`.
3. **Anon key do Supabase QA** — pública por design, mas inexistente aqui.
4. **`SUPABASE_ACCESS_TOKEN`** com permissão de **ler e aplicar migrations** no
   projeto QA.
5. **Permissão de deploy de Edge Functions** no projeto QA.
6. **Acesso ao Supabase Auth do QA** para Site URL / redirect URLs do candidate.
7. **Turnstile QA** (opcional nesta fase): site key pública + secret no Vault do QA.

Nenhum CLI de deploy está presente no ambiente (`netlify`, `supabase`, `deno`
ausentes).

---

## 20. Próximos blockers

1. Provisionar Supabase QA (≠ produção) e aplicar as 52 migrations via
   `migrate:staging`; rodar `audit:rc2-qa-backend` até `PASS`.
2. Deploy em QA das 5 Edge Functions do PUBLIC_BETA_CORE.
3. Criar site/branch deploy do candidate com as variáveis do contrato.
4. Capturar **C**, deployar C, rodar `verify:rc2-candidate-identity`.
5. Commit **D** (só `docs/release/**`) com `candidateSha=C`,
   `releaseCandidateSha=C`, `release_candidate_sha=C`. Verdict **continua NO-GO**.
6. **RC2.2.1** — cloud certification: `cloud_auth`, `cloud_sync`,
   `feedback_backend` contra C.

**Stop condition respeitada:** nenhuma feature foi corrigida "já que estamos aqui".

---

## Runbook

`docs/release/evidence/rc2-candidate-deploy.md` — passo a passo executável por
quem tiver as credenciais.
