# RC2.2.6 — Culture Progression Loop + Dragon Text Voice

Cultura deixa de ser conteúdo ao lado e passa a ter função de progressão, e o
dragão ganha voz sonora além da visual. Nenhum conteúdo novo entra: a remessa
muda semântica de progressão e apresentação, não currículo.

## Base

| | |
|---|---|
| `BASE_MAIN_SHA` | `555f9cda45e5c65f8086e2e997b2d18f882a2d4c` |
| `#278` merge SHA | `555f9cda45e5c65f8086e2e997b2d18f882a2d4c` (squash de `d871195`) |
| Branch | `cursor/rc2-2-6-culture-progression-dragon-voice-5b4f`, cortada da `main` |
| `#278` na ancestralidade | `git merge-base --is-ancestor 555f9cda HEAD` → **0** ✅ |
| `#277` | permanece **OPEN**; não foi esperado nem mergeado |

### Import da RC2.2.5 (#277)

Três commits portados por `git cherry-pick`, sem merge commit e sem conflito:

| commit original | novo SHA na branch | conteúdo |
|---|---|---|
| `963332264b3f6dd2d199555401b807e72c7a6a84` | `3a843633` | Journey dragon teacher: GuideDialogue handoffs |
| `7ae3c930b64cd0b42d90c9bf33f1abd539cd3ad1` | `aa16a2df` | harden WebKit handoff Continuar |
| `9688355003a8a7065354c68f8b980a33fa6422db` | `6d8961c7` | gate PASS results |

**Paridade com o HEAD do #277** (`9688355`): `git diff 9688355 HEAD` excluindo
`e2e/match-pairs-mobile.spec.ts` retorna **vazio** — a árvore é idêntica fora do
arquivo que o `#278` corrigiu. Artefatos confirmados presentes:
`JourneyGuideExplanation.tsx`, `HANDOFF_LINES` (em `JourneyInlineNode.tsx:195`),
`validate/test:journey-guide-explanations`, `public-beta-pedagogy-gap-baseline.md`,
e o E2E dos handoffs.

## Parte A — Culture Progression Gates

### Restrição que definiu a arquitetura

`scripts/lib/report-meta.mjs` calcula o fingerprint da Jornada como sha256 do
**texto bruto** de `CURRICULUM_SOURCES`, que inclui `src/data/journey.ts`,
`cultureNative.ts`, `cultureLessons.ts` e `lessonTasks.ts`. Qualquer byte escrito
neles move o hash. Como `lessonState()` e `currentLessonId()` vivem em
`journey.ts`, a semântica de marco **não** pôde entrar ali: ela mora em arquivos
novos e decora os call sites — o mesmo padrão que `CULTURE_JOURNEY_BRIDGES` já usa.

### Registry — `src/data/cultureProgressionGates.ts`

`CultureProgressionGate { id, requiredSealId, beforeTopicId, titlePt, titleEn,
reasonPt, reasonEn, priority }`. `requiredCultureItemIds` **não** é campo: é
derivado de `CULTURE_SEALS` por `requiredCultureItemIdsForGate()`, então registry
e selo não podem divergir. Nenhuma moeda nova — a chave é o selo que já existia.

### Os três marcos, com posição real auditada

Índices são posições reais em `ALL_LESSONS` (134 lições), computadas pelo validador:

| marco | selo | alvo (`beforeTopicId`) | idx | requisitos (âncora → idx) | margem |
|---|---|---|---|---|---|
| `gate-social-etiquette` | `social-etiquette` | `l9` "Me apresentar" | **34** | `greetings-nihao`→`l2` (7) · `thanks-keqi`→`l4` (10) · `qingwen-ask`→`p1-qingwen-cortesia` (13) | 21 nós |
| `gate-urban-china` | `urban-china` | `p6-survival-mandarin` | **120** | `digital-pay`→`l27` (107) · `metro-qr`→`p6-cidade-lugares` (110) | 10 nós |
| `gate-chinese-table` | `chinese-table` | `p7-imersao-casa-amigo` | **133** | `shared-dishes`→`l26b` (105) · `chopsticks-rest`→`l26c` (106) | 27 nós |

**Por que cada um:**

- **Social Etiquette antes de `l9`.** `l9` abre a fase 3, onde o aluno se
  apresenta, pergunta nomes, diz que não entendeu e pede para repetir. A
  interação social deixa de ser frase isolada e vira troca — exatamente o que o
  selo prepara. Anterior: `l2-rev` (33). Posterior: `l9-tudo-bem` (35).
- **Urban China antes de `p6-survival-mandarin`.** O bloco é literalmente
  "pagar, hotel, ajuda", que assume pagamento por celular e QR no transporte.
  Anterior: `p6-compras` (119). Posterior: `l10-rev` (121).
- **Chinese Table antes de `p7-imersao-casa-amigo`.** É a visita à casa da amiga:
  pratos no centro, hashi em repouso, anfitriã insistindo. Sem esse contexto a
  imersão vira só vocabulário. Anterior: `p7-imersao-viagem` (132). É o último nó
  da Jornada, e o selo fecha o percurso antes do capstone de casa.

**Ficaram fora de propósito:** `visitor-ready`, `gift-sense`, `festivals`,
`work-school` — misturam conteúdo EXPLORE, hub-only ou mais tardio. O validador
recusa qualquer um deles como gate obrigatório.

### Deadlock e ciclo

Zero. Todo requisito tem âncora com índice **estritamente menor** que o alvo
(margens de 21, 10 e 27 nós). O validador também recusa um alvo de marco que
seja âncora de requisito (ciclo), e falha se mais de 10 CultureItems virarem
obrigatórios — 7 de 30 hoje.

### Auditoria free / premium

| | |
|---|---|
| Culture Native Lessons premium | **0 de 30** |
| `CultureHubPage` | nenhum gating de premium ou lock |
| Requisitos dos 3 marcos | todos `track: "core"`, todos com lição gratuita |

**Achado a registrar honestamente:** `ALL_LESSONS` tem 35 lições premium, e o
premium começa em `l22` (idx 99), cobrindo tudo dali em diante. Isso significa:

- **Gate 1 é free de ponta a ponta** — alvo (`l9`) e os três requisitos são conteúdo gratuito.
- **Gates 2 e 3 ficam em território premium**: os alvos (`p6-survival-mandarin`,
  `p7-imersao-casa-amigo`) e as âncoras dos requisitos (`l26b`, `l26c`, `l27`,
  `p6-cidade-lugares`) são lições Pro — **de antes desta remessa**. Nenhum marco
  *adiciona* exigência de Pro: o que o marco exige são Culture Lessons gratuitas,
  alcançáveis pelo Hub sem assinatura. Na prática os gates 2 e 3 só disparam para
  quem já tem acesso ao conteúdo que eles guardam.
- **Não é possível movê-los para lição gratuita**: as âncoras dos requisitos estão
  em idx 105–110, depois da fronteira free/premium em 99. Colocar o marco antes
  disso seria deadlock. Decisão do produto nesta remessa: manter os três marcos e
  documentar, em vez de reduzir a wave.

**Energia:** o marco não consome recurso. A Culture Lesson é aberta pelo caminho
normal do player; nada no marco gasta Fôlego, Qi ou cargas, e o CTA não passa por
paywall.

### Autoridade única — `src/lib/cultureProgressionGate.ts`

`evaluateCultureProgressionGate(gate, progress)` → `{ ready, status, completed,
total, completedItemIds, missingItemIds, nextItemId, reasonPt, reasonEn }`, com
`status ∈ { unlocked, locked, legacy_passed }`. Pura: mesma entrada, mesma saída.

Consome **só** progresso canônico — `cultureCompletedIds`, `cultureMasteryById`,
`cultureSeals`, e `completedLessons` apenas para grandfather.
`AUX_NODE_PROGRESS_LOCAL_ONLY` (`journeyNodeProgress.ts:8`) **não** entra: é
estado local-only e não decide currículo obrigatório. Há teste que injeta ruído de
aux node e exige que o marco continue trancado.

Quatro superfícies leem a MESMA função:

| superfície | ponto |
|---|---|
| Card da Jornada | `JourneyPage.tsx` — `cultureGateForTopic` decora `lessonState` |
| Deep link / URL direta | `proAccess.ts` `canStartLesson` → `reasonCode: "culture_gate_required"` |
| Dica do nó trancado | `lockedLessonMessage` recebe o progresso cultural |
| CTA / próximo item | `nextItemId` da mesma avaliação |

### Deep link

Bloquear o card sem bloquear a URL não é gate. O guard vive em `canStartLesson`,
que o `LessonPlayer` já consulta em `startAccess`. Fica **depois** da checagem de
"lição já concluída", para que conteúdo já feito nunca seja re-trancado.

### Grandfather

`hasLegacyProgressPastGate`: se o aluno concluiu o próprio tópico guardado **ou
qualquer posterior**, ele passou por ali antes do marco existir → `legacy_passed`,
`ready: true`. Cultura continua disponível para completar depois, mas nada é
retirado. Progresso apenas *antes* do marco não dá passe livre.

### Hub ↔ Journey

`isCultureItemDone` aceita `cultureCompletedIds` (o que o Hub escreve) **ou**
mastery com `stars >= 1` (caminho Jornada). O teste compara as duas entradas e
exige `status` idêntico: o Hub não é uma segunda realidade.

### Selo, review e estrelas

- `sealsEarnedFromMastery` (pré-existente) já exige `stars >= 1`, não 3 — o marco
  herda isso. Uma estrela ou `completed` basta; perfect score não é exigido.
- Selos são unidos com `unionIds` e nunca removidos, e a avaliação trata
  `cultureSeals` como destravamento definitivo. `review_due` reagenda memória e
  **não** revoga o marco — há teste com `reviewDueAt` no passado.
- Nenhum XP novo: o marco não concede recompensa própria. O XP de Culture Mission
  segue o caminho existente, com a idempotência dele.

**Sobre "reveal de selo" (A14.1 / DoD #25) — gap encontrado, declarado:**
auditei o código esperando reutilizar um reveal existente e **não existe um**.
`cultureMastery.ts:284` calcula `newSeals`, `store.ts:3992` o devolve em `outcome`,
e **nenhum componente consome esse retorno** — é estado morto hoje. O que existe
como UI de selo é a faixa estática do Culture Hub (`data-testid="culture-seals"`,
com `data-earned` por selo), que passa a "obtido" quando o selo é ganho.

Então esta remessa usa o que existe, sem inventar reveal novo:

1. a faixa de selos do Hub reflete o selo obtido (UI atual);
2. na Jornada, o marco **sai da trilha** e o tópico guardado destrava — o feedback
   é a progressão em si.

Construir um momento de reveal animado seria superfície de feature nova, o que
esta remessa evita de propósito. Fica registrado como próximo passo barato, com
`newSeals` já disponível como gancho.

### UI do marco

`JourneyCultureGate.tsx` renderiza antes do tópico guardado: emoji do selo, título,
`N de N concluídas`, lista com ✓/○ por requisito, e CTA. O dragão explica o porquê
pelo `JourneyGuideExplanation` importado do `#277` — mesmo `GuideDialogue`
canônico, sem balão novo. Marco resolvido (selo ou legado) não ocupa a trilha.

Copy é preparo, não punição: "Você já sabe as frases. Agora vamos ver como elas
aparecem numa conversa de verdade…". O validador recusa "bloqueado", "pedágio",
"obrigatório", "you can't".

CTA abre `/licao/culture-<itemId>/player?src=jornada&from=/jornada&gate=<id>` —
a **próxima** Culture Lesson faltante, nunca o Hub genérico.

### Culture Hub

`CultureCard` mostra etiqueta discreta "🐉 Faz parte do <Selo>" / "Part of the
<Seal>" nos 7 itens dos marcos. Tom de utilidade, não de paywall.

### Culture Moments

Os 5 seguem exploratórios; nenhum virou obrigatório.

## Parte B — Dragon Text Voice

### Desenho

`guideTextBlip(graphemeIndex)` e `stopGuideTextVoice()` em `src/lib/soundFx.ts`,
sobre o `sharedContext` e a master chain (compressor → limiter) que já existiam.
Timbre: triângulo passa-baixa a ~2.1 kHz com transiente de ruído band-pass quase
inaudível — madeira/jade macio, assinatura original do Longyu.

**Zero asset:** nenhum `.mp3/.wav/.ogg` em `src/` ou `public/` (validador varre as
duas árvores), nenhuma referência a Undertale ou sample de terceiros, nenhum
`fetch`/`decodeAudioData` na voz. Tudo sintetizado.

### Rate e pitch

| | |
|---|---|
| Ritmo | passos alternados de 2 e 3 graphemes elegíveis (média **2.5**) |
| Espaço / quebra de linha | nunca toca |
| Pontuação | nunca toca (mantém a pausa do typewriter, sem blip) |
| Pitch | 3 alturas próximas (`c5`, `d5`, `e5`), escolhidas por `graphemeIndex % 3` |
| Aleatoriedade | nenhuma no pitch — `Math.random` não participa |
| Volume | teto de `0.06`, contra `soundFxVolume` e ganho do tema |

Teste mede a razão real (1 blip a cada 2–3.2 graphemes) e exige que nunca haja
dois blips adjacentes.

### Sincronismo e corte

O blip nasce do **TICK real** do `guideDialogueMachine`: o plano de índices é
calculado uma vez por mensagem (`planGuideTextBlips`, memoizado) e o callback do
timer já existente consulta o plano. Nenhum `setInterval`, nenhum segundo
typewriter, nenhuma estimativa de animação por CSS. O validador conta os
`window.setTimeout` do componente e falha se a voz criar timer próprio.

`stopGuideTextVoice()` está ligado em três pontos:

| gatilho | efeito |
|---|---|
| Antecipar (clique no balão ou em Continuar durante `typing`) | texto completa e a voz para no mesmo instante |
| `phase === "done"` | zero áudio ativo |
| Unmount / troca de diálogo | cancela qualquer voz |

O corte faz fade linear de 8 ms em vez de corte seco, para não estalar. Teste
dirige a máquina real e exige **zero** blip após o corte.

### Settings e ambiente

| condição | comportamento |
|---|---|
| `soundEffects=false` | zero osciladores (provado contando, não presumido) |
| `soundFxVolume=0` | mudo |
| `soundTheme` | ganho e brilho respeitados |
| `document.hidden` | mudo |
| AudioContext suspenso (autoplay negado) | tenta resume, segue **em silêncio**; Guide não bloqueia, não pede interação |
| reduced motion | texto instantâneo → não há fase `typing` → nenhuma sequência |
| 100 blips | **1** AudioContext, 100 vozes curtas |

### Escopo

Validador varre `src/` e exige que o único consumidor de `guideTextBlip` seja
`GuideDialogue.tsx`. Isso cobre Journey Teacher, intros e explicações culturais
que usam o GuideDialogue, e mantém a voz fora de prompts avaliados, respostas,
score, XP, toasts e Culture cards.

### Acessibilidade

Som é decorativo. O contrato de screen reader do `GuideDialogue` não mudou:
`aria-label` com o texto completo e `aria-live` no reveal. Nenhuma informação
depende do áudio.

## Correção encontrada durante a verificação

O E2E de PT/EN reprovou e expôs um defeito real: `localizeUnlockReason`
(`journeyChrome.ts`) traduz por casamento exato de string PT, então a razão do
marco na tela de bloqueio por deep link apareceria **em português para um aluno
EN**. Corrigido com um mapa `reasonPt → reasonEn` derivado do próprio registry
(não uma segunda lista de copy), e travado por caso de E2E no locale EN.

## Verificação executada

| gate | resultado |
|---|---|
| `typecheck` | ✅ PASS |
| `build` | ✅ PASS |
| `validate:culture-progression-gates` | ✅ PASS (0 falhas) |
| `test:culture-progression-gates` | ✅ PASS (16 casos) |
| `validate:guide-text-voice` | ✅ PASS (0 falhas) |
| `test:guide-text-voice` | ✅ PASS (15 casos) |
| `validate/test:journey-guide-explanations` | ✅ PASS |
| `validate:guide-dialogue-contract` · `test:guide-dialogue` | ✅ PASS |
| `validate:guide-dialogue-motion` · `test:guide-dialogue-motion` | ✅ PASS |
| `validate/test:journey-culture-moments` | ✅ PASS |
| `validate:culture-history-integrity` · `-chronology` | ✅ PASS |
| `validate/test:culture-journey-nodes` · `-placement` · `-native-lessons` | ✅ PASS |
| E2E `culture-progression-gates.spec.ts` (Chromium) | ✅ **13/13** |
| E2E `match-pairs-mobile.spec.ts` (G1, Chromium) | ✅ PASS — tema dark segue semeado no store |
| E2E `guided-journey-culture.spec.ts` (Chromium) | ✅ PASS |
| Mobile 390×844 · 375×667 · 360×640 | ✅ PASS — marco < 90% da viewport, CTA ≥ 36 px |
| PT-BR · EN | ✅ PASS (E2E cobre os dois locales na tela de bloqueio) |

Os quatro gates novos foram encadeados no `validate:beta`, para que o CI os
execute de fato em vez de depender de alguém lembrar.

### G1 — regressão do #278

`e2e/match-pairs-mobile.spec.ts` continua com o tema dark semeado no store
persistido via `openMatchPairs(page, { theme: "dark" })`. Nenhum retorno ao
`setAttribute("data-theme", "dark")` no meio do teste — verificado por grep e pelo
E2E verde.

## Identidade do currículo

| métrica | esperado | obtido |
|---|---|---|
| Core lessons | 134 | **134** ✅ |
| Teaching topics | 113 | **113** ✅ |
| CultureItems | 30 | **30** ✅ |
| Culture Native Lessons | 30 | **30** ✅ |
| Journey Culture nodes | 20 | **20** ✅ |
| Culture Moments | 5 | **5** ✅ |
| **Fingerprint** | `516692632525` | **`516692632525`** ✅ |

Nada em `CURRICULUM_SOURCES` foi tocado. Nenhuma lição, tópico, hànzì, chunk,
CultureItem, Culture Lesson ou Culture Moment novo.

## Feature freeze

`CONTROLLED_PUBLIC_BETA_FEATURE_EXCEPTION`. A remessa altera semântica de
progressão (integração Journey ↔ Culture) e apresentação do Guide (áudio). Não é
expansão de currículo.

## Limites desta remessa — o que NÃO foi verificado

Declarado explicitamente para não virar PASS inventado:

- **WebKit não foi executado.** Só Chromium está instalado neste ambiente
  (`/opt/pw-browsers` tem chromium; não há webkit). O job `E2E cross-engine` do CI
  cobre WebKit + Firefox — o resultado dele é a evidência, não este relatório.
- **QA humano do som não foi feito.** "Leve, agradável, não irritante, não alto" é
  julgamento auditivo e é seu. O que está provado aqui é contrato: rate, corte,
  settings, ausência de asset, um AudioContext.
- **Nenhum PASS operacional foi criado.** `cloud_auth`, `cloud_sync`,
  `feedback_backend`, `android_real_device`, `ios_real_device`, `pwa_upgrade`,
  `rollback_drill` seguem sem evidência nova.

## Verdict

**Public Beta: NO-GO.** `#273` continua temporariamente pendente. Esta remessa não
altera o verdict nem inventa evidência operacional.

## Próxima remessa

PEDAGOGY WAVE 2 — TONE TRANSFER CLOSURE. Baseline já documentado em
`docs/reports/public-beta-pedagogy-gap-baseline.md`: 190 tone tasks, 5 em
produção, 0 em transferência. Depois, PEDAGOGY WAVE 3 — fechamento das 11
capabilities PARTIAL.
