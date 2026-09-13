# RC1.2 — Release Closure

> ## VERDICT: **NO-GO**
>
> **Zero de onze checks operacionais foram executados.** Nenhum deles pode ser
> executado de dentro deste ambiente: todos exigem serviço real, dispositivo
> físico ou permissão de deploy.
>
> O que a RC1.2 entregou foi a outra metade do trabalho — a dívida de navegação
> que travava o CI, os gates que impedem evidência marcada na fé, e os runbooks
> que permitem a um humano fechar cada check. Não existe "quase GO" (P24.1).

| Campo | Valor |
| --- | --- |
| Base | `06d6bcb61f8bd76df90399020b190629cff34cdc` |
| Freeze | `CURRICULUM_FREEZE=RC1` |
| Fingerprint antes / depois | `38e70062857d` / `38e70062857d` — inalterado |
| Lições / temas | 134 / 113 — inalterados |
| Deploy candidate | **não criado** (sem acesso de publicação) |

---

## O que foi resolvido

### P1 — A dívida de history era um bug de produto, não do teste

O `page.goForward()` de `topic-mastery-hardening` dava timeout havia remessas, e
vinha sendo classificado como "falha anterior". Instrumentando a navegação, o
quadro foi outro:

| Medição | Resultado |
| --- | --- |
| `goForward` commitou? | sim, status 200, URL correta |
| `document.readyState` | `interactive` |
| `#root` preenchido? | **não** |
| `domComplete` / `loadEventEnd` | `0` / `0` |
| tipo de navegação | `back_forward` |
| recursos pendentes (performance API) | nenhum |
| `pageshow` | nunca disparou → **não era bfcache** |

Capturando a rede na janela do forward, a resposta apareceu: a request de
`fonts.googleapis.com` ficava **pendurada**. Uma folha de estilo externa
render-blocking segura duas coisas — a execução dos scripts seguintes e o evento
`load`. Com ela pendurada, o módulo do app nunca roda e `#root` fica vazio.

No `goto` a request falha rápido e destrava sozinha; por isso o bug só aparecia
em navegação `back_forward`. **O timeout era sintoma. O teste estava certo o
tempo todo.**

**Isto não é artefato de ambiente de teste.** Qualquer rede que engula o CDN de
fontes — firewall corporativo, captive portal, ou a China continental, que é
exatamente para onde este curso prepara o aluno — deixava o app sem abrir.

#### A primeira correção estava errada

`rel="preload"` + `onload="this.rel='stylesheet'"` passou em todos os testes
locais. E teria quebrado em produção: a CSP do site declara
`script-src-attr 'none'`, então o handler inline seria **ignorado**, e as
webfonts nunca apareceriam — sem erro visível, e sem os testes locais notarem,
porque o preview não aplica os headers do `netlify.toml`.

A versão final promove a folha no `src/main.tsx` (script de `'self'`, que a CSP
permite) e **espera o evento `load`** — promover de forma síncrona recriava o
problema original.

Pior caso hoje: o app roda nos fallbacks já declarados (`system-ui`, `Georgia`,
`Songti SC`). Nenhuma tela depende da webfont para montar.

| Suíte | Antes | Depois |
| --- | --- | --- |
| `topic-mastery-hardening` | 3 falhas em 4,9 min | **11/11 em 45 s** |
| `navigation-history-integrity` | não existia | **4/4** |

**Controle negativo:** com o `rel="stylesheet"` bloqueante de volta, o teste de
deep link falha em 50 s. O teste **pendura** o CDN em vez de abortá-lo — uma
request abortada falha rápido e destrava o parser sozinha, então a versão
bloqueante passaria despercebida.

### P17 — Migração de quem já usava o app

Snapshot anterior à RC1.1 (sem `topicPassStarsById` nem `plusRoundById`), nas
versões persistidas 21 e 24: o app monta, e lições concluídas, estrelas,
mastery, XP, ofensiva, caracteres, chunks e SRS chegam intactos. Os campos novos
nascem vazios — a migração nunca inventa um Reforço + já concluído.

### P19 / P20 — Secrets e configuração

`validate:frontend-secrets` e `validate:production-no-fixtures` passam. A
varredura manual do `dist/` encontrou `service_role` e foi investigada: as
únicas ocorrências estão dentro da **lógica de redação** que remove esse termo
dos textos enviados, e de uma denylist de chaves. É a proteção, não um
vazamento. Nenhum `sk_live_`, `sk_test_`, `whsec_` ou chave privada.

As flags de preview são lidas em runtime de `import.meta.env`, e o
`netlify.toml` declara `VITE_USE_TEST_FIXTURES="false"` e
`VITE_ALLOW_PRO_PREVIEW="false"` no bloco de produção.

---

## Gates novos (P25–P27)

| Gate | O que recusa |
| --- | --- |
| `validate/test:navigation-history-integrity` | folha externa render-blocking, `onload` inline que a CSP ignora, promoção síncrona, e2e que esconde o bug com `fixme` |
| `validate/test:operational-evidence` | `pass: true` sem evidência, evidência inexistente, sem `testedAt`/`environment`/`commitSha`, runbook ainda `NOT_RUN`, device sem modelo, rollback sem SHA, verdict incoerente |
| `validate/test:release-evidence-freshness` | evidência de outro SHA, candidate não declarado, história do freeze sobrescrita |
| `validate:rc1-2-freeze` | fingerprint, contagem de lições e de temas |

Todos ligados ao `validate:beta`, cada um com o `test:*` que o mata por mutação.

**Duas decisões de projeto dos gates:**

1. O gate de navegação **lê a CSP do `netlify.toml`**. Foi a única forma de
   pegar a minha própria primeira correção, que passava em tudo localmente e
   morreria em produção.
2. O gate de evidência recusa `pass: true` cujo runbook ainda diga `NOT_RUN`.
   Sem isso, marcar verde continuaria sendo uma edição de uma linha de JSON.

---

## Checks operacionais — todos NOT_RUN

| Check | Status | Bloqueio |
| --- | --- | --- |
| `cloud_auth` | NOT_RUN | Supabase de QA com credenciais |
| `cloud_sync` | NOT_RUN | dois dispositivos + backend de QA |
| `feedback_backend` | NOT_RUN | backend de feedback no ar |
| `stripe_test_mode_e2e` | NOT_RUN | conta Stripe Test Mode + webhook para o candidate |
| `stripe_production_config` | NOT_RUN | conta Stripe de produção |
| `android_real_device` | NOT_RUN | Android físico |
| `ios_real_device` | NOT_RUN | iPhone/iPad físico |
| `rollback_drill` | NOT_RUN | permissão de publicar e reverter |
| `pwa_upgrade` | NOT_RUN | dois deploys em sequência |
| `league_cloud_smoke` | NOT_RUN | três contas reais em backend de QA |

Cada um tem runbook executável em `docs/release/evidence/`, com pré-requisitos
e passos. Índice em [`docs/release/evidence/README.md`](../release/evidence/README.md).

**O deploy preview do PR não fecha nenhum destes seis primeiros.** O
`netlify.toml` dá ao contexto `deploy-preview` o `VITE_BACKEND_MODE = "local"`
com Supabase vazio: o preview roda sem backend, então auth, sync, feedback,
Stripe e liga não têm o que exercitar ali. Serve para conferir header real e
para abrir num device pelo QR code — nada além disso. O índice de evidência
registra isso para ninguém fechar check contra o alvo errado.

**P9.1 aplicado:** `stripe_live` era ambíguo e virou `stripe_test_mode_e2e` +
`stripe_production_config`. Test Mode passando não autoriza marcar produção — o
gate recusa essa combinação explicitamente.

**P22.1 aplicado:** `curriculum_base_sha` (o freeze, `c4441b6`) e
`release_candidate_sha` (vazio) são campos separados. O gate recusa
sobrescrever um com o outro.

---

## Browser matrix (P2 / P23) — parcial

| Engine | Local | CI | Bloqueia merge? |
| --- | --- | --- | --- |
| Chromium | ✅ executado | ✅ job `Testes E2E` | **sim** |
| Firefox | ❌ **não instalado neste ambiente** | ✅ job cross-engine | **sim** |
| WebKit | ❌ **não instalado neste ambiente** | ⚠️ roda, mas o passo é `continue-on-error: true` | **não** |

Só o Chromium está disponível aqui (`/opt/pw-browsers` tem apenas Chromium). A
matriz completa depende do workflow `E2E cross-engine (WebKit + Firefox)`, que
roda no CI do PR.

**A coluna que importa é a terceira.** O passo WebKit do `ci.yml` carrega
`continue-on-error: true` desde antes desta remessa: WebKit **roda e é
ignorado**. Um vermelho lá não reprova nada. Então "WebKit passa" não é um fato
que alguém esteja verificando hoje — nem localmente (engine ausente) nem no CI
(falha engolida).

**Consequência honesta:** a classificação de falhas WebKit em
`REAL_PRODUCT_BUG` / `BROWSER_LIMITATION` / `TEST_HARNESS_ONLY` pedida no P2.2
**não foi feita** — não houve como reproduzir localmente, e o CI não produz o
veredito porque não olha para o resultado. Isso fica em aberto e conta contra o
GO. Fechar isso exige um ambiente com WebKit, e é decisão de produto se o passo
vira bloqueante antes do lançamento (o P2.2 pede a classificação primeiro:
tornar bloqueante um job com flakes não triados só troca um problema por outro).

---

## Não feito, e por quê

O contrato pediu mais do que este ambiente comporta. Listado aberto, sem
maquiagem:

| Item | Situação |
| --- | --- |
| P3 deploy candidate | **não criado** — sem acesso de publicação |
| P4–P7 auth / sync / feedback / Stripe | **não executados** — sem serviços reais |
| P8 / P9 Android e iOS físicos | **não executados** — sem dispositivos |
| P10 PWA upgrade | **não executado** — exige dois deploys |
| P11 rollback | **não executado** — sem permissão de deploy |
| P12 liga cloud | **não executado** — sem contas reais |
| P2.2 classificação WebKit | **não feita** — engine indisponível aqui, e no CI o passo é `continue-on-error` |
| P13 Reforço + cross-device | **não executado** — parte do sync real |

O P29 do próprio contrato prevê isso: *"o agente prepara runbook e evidência,
mas o check fica FALSE enquanto não acontecer."* É o que foi feito.

---

## Definição de pronto — onde a RC1.2 está

| # | Critério | Estado |
| --- | --- | --- |
| 1 | browser forward/back confiável | ✅ |
| 2 | navegação não duplica mastery/XP | ✅ |
| 3 | snapshot pré-RC1.1 migra | ✅ |
| 4 | Plus sincroniza entre devices | ❌ não executado |
| 5 | Chromium passa | ✅ |
| 6 | Firefox passa | ⚠️ só no CI |
| 7 | WebKit critical path passa | ❌ ninguém verifica (passo `continue-on-error`) |
| 8–11 | auth / sync / feedback / Stripe reais | ❌ não executados |
| 12–16 | mensal, anual, cancelamento, reativação, isolamento | ❌ não executados |
| 17–18 | Android e iOS reais | ❌ não executados |
| 19–20 | áudio de feedback e nome próprio em device real | ❌ não executados |
| 21–22 | rollback e liga reais | ❌ não executados |
| 23 | fixtures desligadas | ✅ |
| 24 | frontend sem secrets | ✅ |
| 25 | fingerprint `38e70062857d` | ✅ |
| 26 | 134 lições | ✅ |
| 27 | zero BLOCKER | ✅ |
| 28 | zero HIGH | ✅ |
| 29 | checks com evidência | ❌ 0/11 |
| 30 | verdict GO só se tudo passou | ✅ **NO-GO** |

---

## Bugs conhecidos em aberto

Nenhum BLOCKER, nenhum HIGH. A falha de E2E que a RC1.1 carregava como
"anterior" foi corrigida nesta remessa — não sobrou nenhum E2E vermelho
conhecido (P22 do contrato anterior, P24 deste).

## Próximo passo

O caminho para GO não passa por mais código. Passa por alguém com acesso
executar os dez runbooks em `docs/release/evidence/` contra um candidate
publicado, e preencher os blocos `RESULTADO`. Os gates recusam qualquer atalho.
