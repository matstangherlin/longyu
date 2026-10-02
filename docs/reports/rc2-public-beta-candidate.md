# RC2 — Public Beta Release Candidate

> ## Atualização V4.11A.3 (Culture Atlas closure)
>
> O currículo cultural fechou com `CURRICULUM_FREEZE=RC2_CONTENT_FREEZE` e
> fingerprint **`516692632525`**. Isso é **content freeze**, não deploy
> candidate. `release_candidate_sha` continua `""`. Qualquer referência a
> `40be45d` / RC2_CODE_SHA antigo como candidate atual está **superseded**.
> Próxima fase: evidência operacional + candidate real de deploy.

> ## Veredito
>
> **NO-GO.**
>
> O blocker de código (WebKit) **fechou**. O blocker operacional **não**.
>
> 1. **WebKit ficou verde** na tip `5523d99` do [#262](https://github.com/matstangherlin/longyu/pull/262)
>    (Portão + Chromium E2E + cross-engine WebKit/Firefox + Security), squash-mergeado
>    em main como `40be45d`. P2.1 cumpriu o papel: a remessa não entrou com Safari
>    vermelho, e as falhas que o `continue-on-error` escondia foram corrigidas
>    antes do merge.
> 2. **Nenhum dos 12 checks operacionais foi executado.** Continua valendo a
>    P25.1: este ambiente não tem Supabase QA, Stripe, deploy candidate, aparelhos
>    físicos nem testadores humanos. Marcá-los seria inventar evidência.
>
> O candidate de **código** está congelado em `RC2_CODE_SHA`. O candidate de
> **lançamento** (deploy production-like + evidências P7–P24) ainda não existe.
> `release_candidate_sha` no contrato permanece `""` — correto: o campo descreve
> o deploy que as evidências descrevem, e não há deploy.

| Campo | Valor |
| --- | --- |
| RC1.5 merge SHA | `40be45dd040c687cfbb710997abe099f9bc3b394` ([#262](https://github.com/matstangherlin/longyu/pull/262)) |
| RC2_CODE_SHA | `40be45dd040c687cfbb710997abe099f9bc3b394` (`git rev-parse HEAD` = `origin/main`) |
| Tip de conteúdo (pré-squash) | `5523d99e8bb8ffb36b47f062ec03ae3de06ec844` |
| CI verde da tip | [run 35170369482](https://github.com/matstangherlin/longyu/actions/runs/35170369482) — Portão + E2E + WebKit/Firefox |
| Branch de acompanhamento | `cursor/rc2-public-beta-candidate-1f8b` |
| Base anterior | `edd3e191a70206eee6f76f675644ca5c09d762dc` (#261, RC1.4) |
| Fingerprint | `7c054f2255e7` — inalterado (`validate:rc15-freeze` PASS) |
| Lições / temas | 134 / 113 — inalterados |
| `release_candidate_sha` no contrato | continua `""` — sem deploy candidate |

---

## P0 · Congelamento

```
RC2_CODE_SHA=40be45dd040c687cfbb710997abe099f9bc3b394
on main tip: sim
working tree: limpa
validate:rc15-freeze: PASS · fingerprint 7c054f2255e7 · 134 lições · 113 temas
```

Capturado com `git fetch origin main && git rev-parse origin/main` depois do
merge do #262. Não é SHA da branch de feature: é a tip de `origin/main`.

`release_candidate_sha` permanece `""` em
`docs/release/rc1-operational-checks.json`. Congelar o código ≠ ter candidate
deploado; o campo só se preenche quando existir ambiente production-like com
evidências apontando para ele.

---

## P2 / P2.1 · Baseline e o achado central

### WebKit passou a bloquear

Até esta remessa, `.github/workflows/ci.yml` rodava o passo WebKit com
`continue-on-error: true`. A justificativa registrada era que o Chromium
segurava o merge e o WebKit apenas informava, com flakes documentados.

Isso é defensável para beta fechada e indefensável para beta pública: **em
iPhone o Safari não é uma engine alternativa, é a única**. Um flake que "não
cobre caminho crítico" no CI cobre 100% do caminho de um usuário de iOS.

O próprio `beta:rc-status` já listava, entre as coisas que não se pode fingir:

> Congelar RC com WebKit vermelho (iPhone/Safari foi fonte dos bugs recentes)

A política estava escrita. O workflow é que não tinha acompanhado.

### O gate que exigia o contrário

Remover o `continue-on-error` quebrou `test:rc-hardening`:

```
FAIL test:rc-hardening:
 - WebKit continue-on-error só no passo
```

O gate não estava errado — ele guardava a política **anterior**, e existia para
impedir que alguém movesse a tolerância para o job inteiro e derrubasse o
Firefox junto. Com a política invertida, a asserção teve de inverter com ela:
agora **proíbe** `continue-on-error: true` em qualquer passo do `ci.yml`.

A checagem é por linha de YAML, não por substring do arquivo, senão o
comentário que documenta a mudança reprovaria o próprio arquivo que a explica.
Verificado nos dois sentidos: reintroduzir o `continue-on-error` faz o gate
falhar; removê-lo faz passar.

### As 7 falhas de WebKit

Primeira execução com a trava ativa (head `0f1b7fa`): `553 passed`, `2 flaky`,
**`7 failed`**.

| Spec | Teste | Projeto |
| --- | --- | --- |
| `business.spec.ts:140` | lead válido dispara envio | webkit |
| `missions-responsive.spec.ts:42` | layout, FAB de Feedback e CTAs sem colisão | webkit |
| `missions-responsive.spec.ts:209` | hero mensal incompleto e vazio de medalhas | webkit |
| `mobile-device.spec.ts:162` | app shell abre offline após precache do SW | webkit |
| `mobile-device.spec.ts:162` | app shell abre offline após precache do SW | **mobile-safari** |
| `rc1-4-generated-learning-integrity.spec.ts:118` | feedback canônico alinhado em zhong e ma | webkit |
| `v492b-lesson-media.spec.ts:324` | arrastar até o fim não conclui a aula | webkit |

Na head avaliada (`6839c82`) o número é o mesmo — `554 passed`, `1 flaky`,
**`7 failed`** — mas a lista não é idêntica:

| Spec | Teste | Projeto |
| --- | --- | --- |
| `business.spec.ts:140` | lead válido dispara envio | webkit |
| `missions-responsive.spec.ts:42` | layout, FAB de Feedback e CTAs sem colisão | webkit |
| `missions-responsive.spec.ts:209` | hero mensal incompleto e vazio de medalhas | webkit |
| `mobile-device.spec.ts:162` | app shell abre offline após precache do SW | webkit |
| `mobile-device.spec.ts:162` | app shell abre offline após precache do SW | **mobile-safari** |
| `v492b-lesson-media.spec.ts:324` | arrastar até o fim não conclui a aula | webkit |
| `v494-builder-ux.spec.ts:108` | Desfazer tira a última peça colocada | webkit |

Saiu `rc1-4-generated-learning-integrity:118`; entrou `v494-builder-ux:108`.
O flaky único foi `ui-consistency.spec.ts:87` (alvos de toque ≥ 44 px), que
passou no retry.

### Atribuição — conferida, não presumida

- `docs/reports/closed-beta-release-candidate.md:56,61` documenta **um** flake
  conhecido de WebKit: `topic-pass-return`. **Nenhuma das sete é ele.**
- As duas de `/missoes` são as únicas que poderiam vir desta remessa, já que a
  RC1.5 adicionou a missão `daily-speak` àquela tela. **Atribuição
  indeterminada** — ver abaixo.

Conclusão: cinco das sete reproduzem de forma determinística em **quatro**
execuções, então não são flake. Em volta delas há uma cauda que troca de
execução para execução.

| Head | WebKit + mobile Safari | Firefox |
| --- | --- | --- |
| `0f1b7fa` | 7 failed · 2 flaky · 553 passed | não executado (passo abortado) |
| `6fb4680` | **5 failed** · 5 flaky · 552 passed | não executado (passo abortado) |
| `6379452` | 7 failed · 3 flaky · 552 passed | ✅ 551 passed · 1 flaky |
| `6839c82` | 7 failed · 1 flaky · 554 passed | ✅ **552 passed · 0 flaky** |

O núcleo determinístico de 5 falhou nas quatro, sempre nas duas tentativas:
`missions-responsive:42`, `missions-responsive:209`, `mobile-device:162`
(webkit **e** mobile-safari) e `v492b-lesson-media:324`.

A cauda, medida teste a teste nas duas últimas execuções:

| Spec | `6379452` | `6839c82` | Leitura |
| --- | --- | --- | --- |
| `business.spec.ts:140` (webkit) | failed | failed | falhou em 3 das 4 execuções, sempre nas duas tentativas; só passou no retry de `6fb4680`. **Não é mais defensável chamar de flake** |
| `v494-builder-ux.spec.ts:108` (webkit) | passou | failed | entrou agora, falhando nas duas tentativas |
| `lesson-player-mobile.spec.ts:177` (390×844, webkit) | failed | passou | saiu |
| `ui-consistency.spec.ts:87` (webkit) | flaky | flaky | passa no retry nas duas |
| `rc1-4-generated-learning-integrity.spec.ts:118` (webkit) | não falhou | não falhou | flaky apenas nas duas primeiras |

Ou seja: a correção anterior deste relatório — que dizia que
`business.spec.ts:140` era "flaky de verdade" — **não se sustenta com mais
dados**. Duas execuções seguidas em que ela falha nas duas tentativas contam
como reprodução, não como sorte. O conjunto que bloqueia hoje tem **6** testes
estáveis, não 5.

### Correção de uma afirmação anterior

Uma versão anterior deste relatório afirmava que as duas falhas de `/missoes`
**não** eram desta remessa, com o argumento de que `daily-speak` só renderiza
com `SpeechRecognition` e os navegadores de CI não expõem a API. Medido
diretamente, isso é **falso para o Chromium**:

```
PROBE {"SpeechRecognition":"function","webkitSpeechRecognition":"function","secure":true}
```

O Chromium headless expõe as duas APIs e `isSecureContext` é `true`, logo a
missão **renderiza** no CI. A crença veio de um comentário em
`v498b1-production-scaffold.spec.ts:13` que não confere com o comportamento
observado.

O que isso muda e o que não muda:

- **Não muda**: no Chromium a missão renderiza *e* `missions-responsive` passa.
  Ou seja, a missão extra não quebra aquele layout no Chromium.
- **Muda**: não sei se o WebKit do Playwright expõe `SpeechRecognition`. Se
  expuser, `daily-speak` renderiza lá também e poderia, em tese, afetar o
  layout de `/missoes` em WebKit.

Portanto **a atribuição das duas falhas de `/missoes` fica em aberto**. As
outras três do núcleo determinístico (offline-PWA em webkit e mobile-safari,
e o player de mídia) não têm relação com `/missoes` nem com esta remessa.

O que resolveria: rodar `missions-responsive` em WebKit na main (sem esta
remessa) e comparar. Não é possível neste ambiente — `cdn.playwright.dev` está
bloqueado e o WebKit não instala.

### O que não foi feito, de propósito

Não houve re-run até dar verde, não se reinstaurou o `continue-on-error`,
nenhum teste foi pulado ou posto em quarentena. "Flake" não é causa-raiz.

Também não houve diagnóstico das sete: a política de rede deste ambiente
bloqueia `cdn.playwright.dev` e `playwright.download.prss.microsoft.com`, então
**WebKit e Firefox não instalam aqui**. Diagnosticá-las exige uma máquina com
WebKit.

### Uma falha que era desta remessa

O Chromium também ficou vermelho, e essa **era** da RC1.5:

```
route crawler: no REAL_UI_LEAK on core EN surfaces
{ "route": "/missoes",
  "text": "Use o microfone em uma tarefa de fala da jornada e fale de verdade." }
```

A missão `daily-speak` seguiu a convenção do módulo (título/desc inline em
PT), mas missões são traduzidas por `src/i18n/overlays/instructionGloss.en.json`
e as duas entradas novas não tinham sido adicionadas — em inglês a missão
aparecia em português. Corrigido em `a8a7702`, com o spec que falhou
reproduzido e verificado localmente.

### Matriz P2

| Check | Estado | Nota |
| --- | --- | --- |
| `npm ci` | ✅ | 0 vulnerabilidades |
| `npm run validate:beta` | ✅ CI tip `5523d99` | Portão `success` no run `35170369482` (conteúdo do squash) |
| `npm run build` | ✅ local e CI | |
| `npm run test:e2e` (Chromium) | ✅ | job `success` em `4c4d878`, `6379452` e `6839c82` |
| `npm run test:e2e:firefox` | ✅ **verde no CI** | `552 passed · 38 skipped` em `6839c82`; ver "Firefox ficou mudo" abaixo |
| `npm run test:e2e:webkit` | ✅ **verde na tip `5523d99`** | bloqueante (P2.1) e passou no run `35170369482` |

### Firefox ficou mudo — defeito meu, corrigido e verificado

Ao remover o `continue-on-error`, o passo do WebKit passou a abortar o job
antes do Firefox. No head `4c4d878` os passos reportaram:

```
E2E WebKit (Safari) + mobile Safari .... failure
E2E Firefox ............................ skipped
```

Enquanto o WebKit estivesse vermelho, a cobertura de Firefox sumiria por
inteiro. Isso é o mesmo defeito que a P2.1 veio corrigir, apenas apontado para
outro motor: troquei "WebKit mudo" por "Firefox mudo".

Corrigido em `6379452` com `if: always()` no passo do Firefox. Não afrouxa
nada — o job continua vermelho se qualquer um dos dois falhar, e
`test:rc-hardening` (que proíbe `continue-on-error: true`) segue verde.

**Verificado nas duas execuções seguintes**, passo a passo, não pela conclusão
do job:

```
6379452 · E2E WebKit (Safari) + mobile Safari .... failure  (21:54:19 → 22:26:53)
6379452 · E2E Firefox ............................ success  (22:26:53 → 22:47:42)
6839c82 · E2E WebKit (Safari) + mobile Safari .... failure  (21:56:14 → 22:27:55)
6839c82 · E2E Firefox ............................ success  (22:27:55 → 22:47:45)
```

O Firefox roda depois do WebKit vermelho, gasta ~20 min de verdade e reporta:
`551 passed · 1 flaky` em `6379452`, `552 passed · 0 flaky` em `6839c82`. O
único flake foi `review-match-pairs-ux.spec.ts:148` (legibilidade no dark),
que passou no retry e não reapareceu.

Só apareceu porque olhei a conclusão **de cada passo**. No nível do job o
resultado era apenas `failure`, que eu já havia atribuído ao WebKit e poderia
ter dado por explicado. As três execuções anteriores rodaram sem sinal nenhum
de Firefox — e o motor estava verde o tempo todo, o que é exatamente o
problema: um resultado verde que ninguém mediu não é evidência de nada.

---

## P3 · Security

| Check | Estado |
| --- | --- |
| Secret scan (gitleaks) | ✅ |
| npm audit (prod + dev) | ✅ — 0 vulnerabilidades |
| CodeQL (javascript-typescript) | executado no CI |
| `validate:frontend-secrets` (pós-build) | ✅ dentro do job de qualidade |
| `validate:security-boundaries` | ✅ dentro de `validate:beta` |
| `validate:production-no-fixtures` | ✅ dentro de `validate:beta` |
| `test:rls` | ❌ **não executado** — exige `SUPABASE_SERVICE_ROLE_KEY` |

Nenhum `sk_live_`, `sk_test_`, `service_role`, webhook secret ou chave privada
no bundle frontend — conferido pelo gate pós-build, não por inspeção visual.

---

## P5 · Ambiente candidate

**Não existe.** A P5.2 pede ambiente production-like com
`VITE_BACKEND_MODE=supabase`, Supabase QA real, Edge Functions reais, CSP e
headers reais e Stripe Test Mode.

O que existe é o Netlify deploy-preview da PR, e a própria P5.1 o
desqualifica. A evidência de que a P5.1 está certa veio do próprio CI: o check
**`Supabase Preview` reporta `skipped`**. Sem backend, os seis checks de nuvem
não têm como fechar.

Além disso, o preview **não é alcançável deste container**: o proxy devolve
`403 CONNECT tunnel failed` para `*.netlify.app`. Logo **P21 (headers/CSP) e
P22 (deep links) também não foram executados** — nem contra o preview, que de
todo modo não serviria como evidência de nuvem.

---

## P7–P18 · Checks operacionais

Todos os 12 continuam `pass: false`, com `testedAt`, `environment` e
`commitSha` nulos. Cada um tem runbook pronto em `docs/release/evidence/`, e
todos os 12 arquivos ainda se declaram `NOT_RUN`.

| Check | Runbook | Por que não foi executado |
| --- | --- | --- |
| `cloud_auth` | `cloud-auth.md` | sem projeto Supabase de QA |
| `cloud_sync` | `cloud-sync.md` | sem backend e sem dois dispositivos reais |
| `feedback_backend` | `feedback-backend.md` | sem backend |
| `stripe_test_mode_e2e` | `stripe-test-mode.md` | sem chaves Stripe nem Price IDs de teste |
| `stripe_production_config` | `stripe-production-config.md` | sem acesso à configuração de produção |
| `android_real_device` | `android-real-device.md` | exige aparelho físico; emulador é proibido |
| `ios_real_device` | `ios-real-device.md` | exige iPhone físico |
| `rollback_drill` | `rollback-drill.md` | sem acesso de deploy |
| `pwa_upgrade` | `pwa-upgrade.md` | exige candidate publicado |
| `league_cloud_smoke` | `league-cloud.md` | sem backend |
| `family_plan_live` | `family-plan-live.md` | sem backend |
| `business_seats_live` | `business-seats-live.md` | sem backend |

`stripe_live` permanece só como alias histórico do contrato, conforme P12.
Nenhum terceiro teste de Stripe foi criado.

O runbook `cloud-auth.md` já registrava, desde antes desta remessa, a mesma
limitação: *"O agente que preparou este arquivo não tem acesso a um projeto
Supabase de QA com credenciais reais, então marcar `pass: true` aqui seria
inventar evidência."* Continua valendo.

---

## P23 / P24 · QA humano e smoke externo

**Não executados.** Exigem pessoas. O `beta:rc-status` lista entre o que não
se pode fingir: aparelho físico iOS/Android com PWA instalado, checkout Stripe
ponta a ponta, entrega real de e-mail, dois dispositivos reais sincronizando,
VoiceOver/TalkBack, e 5–15 testadores reais.

---

## P27 · Evidence freshness

| Gate | Estado |
| --- | --- |
| `validate:operational-evidence` | ✅ PASS |
| `validate:release-evidence-freshness` | ✅ PASS |

Passam porque nenhum check se declara executado. É o estado honesto: os gates
recusariam `pass: true` sem `testedAt`/`environment`/`commitSha`, e recusariam
`pass: true` sobre runbook que ainda diz `NOT_RUN`.

---

## P28 · Verdade comercial preservada

`PRODUCT_TRUTH` intocado. `pro_individual` e `family_plan` seguem `planned`,
`business_workspace` segue `pilot`, `stripe_test_mode_e2e` segue `false`.
Nenhuma promoção automática — e não haveria base para ela, já que o Stripe
Test Mode sequer rodou.

---

## P29 · `beta:rc-status`

```
version:     0.2.0-beta.1
branch:      claude/bold-wright-7y973w
origin/main: edd3e191a70206eee6f76f675644ca5c09d762dc
on main tip: NÃO — HEAD ≠ origin/main

RC checklist rápida:
  1) tip limpa = origin/main
  2) npm run gate:public-beta
  3) npm run test:e2e:webkit   # Safari — obrigatório antes da beta pública
  4) workflow Security verde na tip
```

---

## P30 · Gate final

`gate:public-beta` **não foi executado até o fim**: ele encadeia
`verify:production`, que exige `VITE_BACKEND_MODE=supabase` e um Supabase
alcançável. `gate:production` acrescenta `test:rls` e `test:stripe`, ambos
dependentes de credenciais ausentes.

Executar só as etapas alcançáveis e chamar o gate de verde seria a mesma
mentira que a RC1.5 veio eliminar do produto.

---

## Blockers — lista exata

1. ~~WebKit vermelho~~ — **fechado** em `5523d99` / merge `40be45d` (P2.1 verde).
2. Ambiente candidate production-like (P5.2) não existe.
3. `cloud_auth`, `cloud_sync`, `feedback_backend`, `league_cloud_smoke`,
   `family_plan_live`, `business_seats_live` — sem backend/credenciais.
4. `stripe_test_mode_e2e`, `stripe_production_config` — sem chaves nem slots.
5. `android_real_device`, `ios_real_device` — sem aparelhos físicos.
6. `rollback_drill`, `pwa_upgrade` — sem acesso de deploy.
7. P21 (headers/CSP) e P22 (deep links) — sem candidate deploado.
8. `test:rls`, `test:stripe` — sem `service_role` nem chaves Stripe.
9. P23 QA humano e P24 smoke externo — exigem pessoas.
10. ~~Merge da RC1.5 / `RC2_CODE_SHA`~~ — **fechado** (`40be45d` = tip `origin/main`).

---

## Recomendação fora de escopo

Os relatórios gerados carimbam dentro de si o HEAD do commit que os gerou.
Como commitá-los muda o HEAD, o carimbo se invalida sozinho — o artefato é
auto-invalidante por construção. Consequência observada nesta sessão: **17
arquivos estavam com o Hash da Jornada `38e70062857d`, da RC1.3**, em silêncio,
até serem regenerados hoje.

`validate:report-freshness` compensa isso com uma janela de tolerância de 1h
entre geração e commit, o que faz o fluxo `regenera → commita` convergir para
os 15 arquivos de `reports/`. Os de `docs/reports/` não têm gate nenhum e
ficaram anos-luz desatualizados sem que nada reclamasse.

Não foi alterado aqui — a RC2 não mexe em gerador. Mas quem pegar a RC3 deve
saber que o sinal de frescor desses arquivos nunca foi confiável.

---

## O que a RC2 entregou, mesmo com NO-GO operacional

A pergunta da RC2 era: *"este EXATO SHA foi realmente exercitado nas condições
em que o beta vai rodar?"*

Para **código** (P2/P2.1/P3 de CI): **sim** — `40be45d` / tip `5523d99` passou
Portão, Chromium, WebKit e Firefox no CI, com WebKit bloqueante.

Para **lançamento** (P5 + P7–P24): **não** — não há deploy candidate nem
evidências operacionais reais. O NO-GO restante é só esse eixo.

O que a remessa já entregou na máquina de release:

1. O CI deixou de estar **estruturalmente configurado** para que o único motor
   de todo iPhone não pudesse barrar um lançamento. As falhas que estavam atrás
   do `continue-on-error` foram corrigidas e o merge só entrou com WebKit verde.
2. O sinal de frescor dos relatórios de qualidade segue frágil (ver seção
   "Recomendação fora de escopo") — não resolvido nesta RC.
3. Firefox, que chegou a ficar mudo enquanto o WebKit abortava o job, agora
   roda com `if: always()` e está verde medido passo a passo.
