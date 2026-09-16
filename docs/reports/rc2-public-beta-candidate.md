# RC2 — Public Beta Release Candidate

> ## Veredito
>
> **NO-GO.**
>
> Por dois motivos independentes, e nenhum deles é "faltou tempo":
>
> 1. **WebKit está vermelho.** A RC2 tornou o Safari bloqueante (P2.1) e a
>    primeira execução com a trava ativa encontrou **7 falhas reais** que o
>    `continue-on-error` vinha escondendo. Duas delas são offline-PWA em
>    **mobile-safari** — exatamente o caminho de iPhone que a RC2 existe para
>    cobrir. Por P2.1 e P30.1, isso sozinho é NO-GO.
> 2. **Nenhum dos 12 checks operacionais foi executado.** Não por decisão:
>    o ambiente que rodou esta remessa não tem projeto Supabase de QA, chaves
>    Stripe, acesso de deploy, aparelhos físicos nem testadores humanos.
>    Marcá-los seria inventar evidência, que é precisamente o que a P25.1
>    proíbe.
>
> O candidate **não foi congelado**: o congelamento depende do merge, o merge
> depende do CI, e o CI depende do WebKit. A trava funcionou.

| Campo | Valor |
| --- | --- |
| RC1.5 merge SHA | **não mergeada** — PR [#262](https://github.com/matstangherlin/longyu/pull/262) aberta, bloqueada por WebKit |
| RC2_CODE_SHA | **não capturada** — depende do merge |
| Branch candidata | `claude/bold-wright-7y973w` |
| Head avaliada | `a8a7702e04dc22dc59f012e0bc0f4e5cf2e2dc6d` |
| Base | `edd3e191a70206eee6f76f675644ca5c09d762dc` (#261, RC1.4) |
| Fingerprint | `7c054f2255e7` — inalterado |
| Lições / temas | 134 / 113 — inalterados |
| `release_candidate_sha` no contrato | continua `""` — correto, não há candidate |

---

## P0 · Por que o candidate não foi congelado

A P0 exige congelar em `RC2_CODE_SHA` obtido de `git rev-parse HEAD` na main
**pós-merge**. O merge não aconteceu, então não existe SHA candidata — e
inventar uma a partir da branch violaria a própria P0 ("nunca trabalhar sobre
SHA assumido").

O `beta:rc-status` diz a mesma coisa, sem ambiguidade:

```
on main tip: NÃO — HEAD ≠ origin/main
Aviso: congele a RC na tip de origin/main, não neste HEAD.
```

`release_candidate_sha` permanece `""` em
`docs/release/rc1-operational-checks.json`. Isso é a resposta certa: o campo
descreve o candidate que as evidências descrevem, e não há nem candidate nem
evidência.

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

### Atribuição — conferida, não presumida

- `docs/reports/closed-beta-release-candidate.md:56,61` documenta **um** flake
  conhecido de WebKit: `topic-pass-return`. **Nenhuma das sete é ele.**
- As duas de `/missoes` são as únicas que poderiam vir desta remessa, já que a
  RC1.5 adicionou a missão `daily-speak` àquela tela. **Atribuição
  indeterminada** — ver abaixo.

Conclusão: cinco das sete reproduzem de forma determinística em duas execuções
(heads `0f1b7fa` e `6fb4680`), então não são flake. Duas — `business.spec.ts:140`
e `rc1-4-generated-learning-integrity.spec.ts:118` — passaram no retry da
segunda execução e são flaky de verdade.

| Head | Resultado |
| --- | --- |
| `0f1b7fa` | 7 failed · 2 flaky · 553 passed |
| `6fb4680` | **5 failed** · 5 flaky · 552 passed |

O núcleo determinístico de 5: `missions-responsive:42`,
`missions-responsive:209`, `mobile-device:162` (webkit **e** mobile-safari) e
`v492b-lesson-media:324`.

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
| `npm run validate:beta` | ✅ local | verde após a correção do `test:rc-hardening` |
| `npm run build` | ✅ | |
| `npm run test:e2e` (Chromium) | ✅ após `a8a7702` | falhou antes por vazamento EN, corrigido |
| `npm run test:e2e:firefox` | ✅ no CI | não executável localmente (CDN bloqueado) |
| `npm run test:e2e:webkit` | ❌ **7 falhas** | **bloqueante — P2.1** |

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

1. **WebKit vermelho: 7 falhas.** Bloqueante por P2.1/P30.1. Precisa de
   diagnóstico em máquina com WebKit instalado.
2. Ambiente candidate production-like (P5.2) não existe.
3. `cloud_auth`, `cloud_sync`, `feedback_backend`, `league_cloud_smoke`,
   `family_plan_live`, `business_seats_live` — sem backend/credenciais.
4. `stripe_test_mode_e2e`, `stripe_production_config` — sem chaves nem slots.
5. `android_real_device`, `ios_real_device` — sem aparelhos físicos.
6. `rollback_drill`, `pwa_upgrade` — sem acesso de deploy.
7. P21 (headers/CSP) e P22 (deep links) — preview inalcançável do ambiente.
8. `test:rls`, `test:stripe` — sem `service_role` nem chaves Stripe.
9. P23 QA humano e P24 smoke externo — exigem pessoas.
10. Merge da RC1.5 bloqueado ⇒ sem `RC2_CODE_SHA` ⇒ sem congelamento (P0/P6).

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

## O que a RC2 entregou, mesmo com NO-GO

A pergunta da RC2 era: *"este EXATO SHA foi realmente exercitado nas condições
em que o beta vai rodar?"*

A resposta é **não** — e descobrir isso é o resultado. Dois defeitos reais
apareceram na máquina de release, nenhum deles achável lendo código:

1. O CI estava **estruturalmente configurado** para que o único motor que roda
   em todo iPhone não pudesse barrar um lançamento, com um gate ativo
   garantindo que continuasse assim. Sete falhas legítimas estavam atrás dessa
   chave, duas delas offline-PWA em mobile-safari.
2. O sinal de frescor dos relatórios de qualidade está quebrado desde a RC1.3.

O congelamento não aconteceu porque a trava que esta remessa instalou fez
exatamente o que deveria fazer.
