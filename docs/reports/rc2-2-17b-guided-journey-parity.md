# RC2.2.17B — Guided Journey Player Parity

Status formal: **NO-GO para Public Beta** (segue dependendo de #273, Closed Beta, QA humano e release drill).
Status desta onda: **código pronto e validado no navegador; QA físico Android pendente**. Nenhum PASS físico foi marcado.

Objetivo: a Jornada **parecer e se comportar como o Teste guiado**. A RC2.2.17 tinha entregado só metadado (`data-guidance-level`, `data-guided-phase`, `GuideLine`) em cima do mesmo `<Card>`. Esta onda troca a **camada de apresentação**. O motor é o mesmo: LessonPlayer, StepRenderer, SRS, domínio, XP, erros, conversa, tons, áudio e fala.

## 1. Base

| | |
|---|---|
| main | `8594baa5` (RC2.2.16, #289) |
| Base desta onda | head do #290 (`ddf00fdd`, RC2.2.17) |
| Branch | `claude/rc2-2-17b-guided-journey-parity` (empilhada no #290) |
| Relação com a RC2.2.18 | branch irmã (`claude/rc2-2-18-progressive-discovery`), também sobre o #290. As duas são complementares: a 2.2.18 simplifica **o que se vê no app**, a 2.2.17B simplifica **como se aprende dentro da aula**. Os arquivos quase não se tocam; os únicos pontos em comum previstos no merge são `android-physical-qa.json`, `package.json` (scripts/gates), `curriculumFreeze.ts` (uma exceção cada), `e2e/helpers.ts` e `playwright.config.ts`. |

## 2. Arquitetura (PART A–L, CH/CI)

```
LessonPlayer (mesmo estado, mesmos callbacks)
└─ GuidedLessonShell      data-guided-lesson-shell="true"
   ├─ GuidedLessonHeader  × ━━━━ n/N  (+ vidas compactas só depois de um erro)
   ├─ GuidedStepSurface   o passo DIRETO no viewport (sem <Card>), alinhamento por contrato
   │  └─ StepRenderer     o mesmo; recebe o contexto "guided"
   └─ GuidedLessonActionDock  UMA ação principal, safe-area de baixo
```

- **Primitivos compartilhados com o Teste guiado** (`src/components/guided/GuidedPrimitives.tsx`): `GuidedProgressHeader`, `GuidedBottomAction`, `GuidedChoiceList`, `GuidedFeedback`, `GuidedAudioButton`, com as classes `GUIDED_CLASS` num lugar só. O `GuidedTryPage` foi refatorado para usá-los, então o CSS não é copiado duas vezes.
- **Contrato central** (`src/lib/guidedPresentation.ts` → `STEP_PRESENTATION_CONTRACTS`). Cada um dos 43 StepKinds declara `layout` (GUIDED_NATIVE / GUIDED_ADAPTER / COMPLEX_INLINE), `actionPlacement` (DOCK / INLINE / NONE), `verticalAlignment` (CENTER / TOP_CENTER / CONTENT_SCROLL / CONVERSATION), `scrollPolicy`, `feedbackPolicy` e `interaction` (SELECT_VERIFY / AUTO_CHECK / TYPE_VERIFY / LISTEN_FIRST / READ_CONTINUE). A PART CI proíbe adivinhar CSS por passo.
- **Ação no dock** (PART J): os passos já portavam a ação via `LessonActionPortal`. Onde ainda havia botão dentro do card (Dragão/ensino, ouvir-e-falar, autoavaliação, escrita, escolha por imagem, conserto de conversa, fala da cena), o botão passou ao dock por `GuidedDock`, que não faz nada fora do shell (fixtures, revisão e rollback continuam iguais).
- **Uma ação principal** (PART CM): ações secundárias no dock (não posso ouvir agora, pular, limpar…) viram texto discreto. Continuam alvos de 44px. Regra central em `index.css` sobre `data-button-variant`.

### Exceções explícitas ao dock (PART K)

| StepKind | actionPlacement | Por quê |
|---|---|---|
| `conversation_scene` | INLINE | a resposta/composição da vez do aluno fica junto do balão; **o avanço da fala usa o dock** |
| `match_pairs`, `tone_pair` | NONE | o último par certo conclui e avança sozinho; não existe botão |

### Porcentagem real de passos com ação no dock (PART L)

| Medida | Passos | Dock | Inline | Nenhum | % dock |
|---|---:|---:|---:|---:|---:|
| Plano **real** das 134 lições (varredura E2E, `__longyuLessonQa`) | 1241 | 1109 | 116 | 16 | **89,4%** |
| Passos autorais das 134 lições | 1565 | 1448 | 63 | 54 | **92,5%** |

A meta é ≥ 80%. O plano real é o que o aluno vê: o planner monta rodadas de ~8 passos a partir do currículo.

**Verificação empírica do contrato**: a varredura por StepKind (`docs/release/rc2-2-17b-contract-sweep.json`) cobre 13 lições cuja união de planos reais contém os **36 StepKinds usados** nas 134. Foram **145 passos, 0 violações**. Em cada passo, o contrato DOCK tem a ação no dock (depois da 1ª interação real, nos passos de auto-correção), não há Card antigo nem 2 CTAs principais, não há mais de 2 cards aninhados e há no máximo 1 pílula de metadado.

## 3. Cabeçalho e densidade (PART C, D, CN, CP, CQ)

- Cabeçalho: **× · barra · n/N**. As vidas aparecem como indicador compacto **só depois de um erro** (`showsBreathIndicator`). Fôlego, "Etapa n/N", pílula de tipo e Qi saíram do cabeçalho.
- A etapa curricular continua no DOM só para leitor de tela e QA (`data-lesson-stage` + `sr-only`).
- "Reportar pergunta": cabeçalho no tablet/desktop; no celular fica na folha de erro, onde a dúvida nasce.
- O título da lição aparece **só no PREPARE**. O título do passo continua quando ajuda.
- Cultura: sem pílula "Cultura", sem "Voltar" duplicado (o × tem `culture-back`); "Fontes" virou link discreto.

## 4. PREPARE, micro-páginas e progresso (PART N–Q, AM–AS)

- **PREPARE é um micro-passo visual real**: Dragão + balão curto + título + [Começar] no dock. É um estado de apresentação (`presentationStage`), não um passo do currículo.
  - Regra (`presentationStageFor`): só na abertura (idx 0), com guia HIGH/MEDIUM, e só quando o 1º passo não é o próprio Dragão (intro). A ponte do Teste guiado em l2 sempre abre.
  - Nas primeiras 20 lições, 7 abrem com PREPARE; as outras 13 abrem com a fala do Dragão do próprio passo intro.
- **Não conta** como passo, XP, domínio, tarefa nem SRS: `idx` fica 0, nada de `handleDone`, e o estado vive em RAM. O E2E confere Qi, XP e domínio antes e depois, e o trace não tem `advanced`.
- **Micro-páginas** (`splitTeachPages`): a fala do Dragão com mais de 140 caracteres é quebrada por frase/vírgula, sem perder texto. As páginas passam pelo mesmo `GuideDialogue` e `onDone` só sai na última.
- **Ouvir → falar** é a mesma etapa curricular: micro-página "Ouça a frase" e micro-página "Agora tente você". `onDone` só no Continuar final.
- **Progresso**: n/N conta passos do currículo. As micro-páginas não avançam a barra nem voltam (2/7 permanece).

## 5. Ouvir, tons, escolha, feedback, erro (PART R–Z, AH–AJ)

- **Ouvir** (padrão Teste guiado): "Ouça a frase." + botão grande 🔊. O texto só aparece quando o **motor confirma** o áudio (PLAYING/ENDED); o clique não conta como "ouviu". Com FAILED/UNAVAILABLE, a falha aparece no shell ("Tentar de novo" / "Instalar a voz" quando o Android permite) e o aluno segue **explicitamente** por "Continuar sem áudio". "Não posso ouvir agora" continua como saída secundária.
- **Tom**: o contorno guiado (ToneContour com gesto e altura) sai da caixa interna. O cartão de contraste tonal fica plano no shell (sem card-em-card, sem rótulo duplicado).
- **Escolha**: opções grandes, largura total, sem caixa em volta do áudio. É selecionar e depois [Verificar] ou auto-correção, conforme a família (campo `interaction` do contrato).
- **Feedback** inline, na mesma tela.
- **Erro no fluxo inicial** (guia HIGH/MEDIUM): folha inferior compacta com "Quase.", a correção e [Continuar]. "Tentar de novo por N Qi" vira link discreto. Sem saldo/custo em grade e sem ofertas Pro.
  - A economia é a mesma (mesmos `retryWithQi`/`continueWithMistake`). Em guia LOW/NONE a folha completa continua.

## 6. Conversa (PART AA–AF)

- Sem moldura externa: o cenário vira uma linha discreta; ficam personagens + um balão + ação.
- "Fala N" e a pílula "Conversa" saem; fica só o título da cena.
- Falante ativo 100%, o outro 70% (dentro de 60–75%).
- [Responder]/[Continuar] da fala no dock. A composição da vez do aluno fica junto do balão (exceção INLINE declarada).

## 7. Fala e autoavaliação (PART BQ, BR, DH)

Os botões Falar / Parar / Falar de novo / Continuar e o Gravar / Continuar da autoavaliação ficam no dock. O cartão da autoavaliação fica plano no shell. Sem SpeechRecognition, a autoavaliação continua dentro do shell (E2E DH).

## 8. Hànzì, cultura, prova (PART AG, BU, BV, BG, DB)

- **Hànzì**: o construtor já portava [Verificar] para o dock; no shell perde o card externo.
- **Cultura**: mesmo shell (E2E BU).
- **Prova** (Desafio de fase): mesmo cabeçalho guiado, sem Card, [Próxima] no dock, `data-guidance-level="NONE"`, sem Dragão (E2E DB).

## 9. Recap (PART CR–CT)

A tela de conclusão no shell não tem card. **"Você aprendeu"** (hànzì · pinyin · sentido, até 3, dos `libraryItems` da lição) vem **antes** de estrelas e XP. As conquistas continuam seguradas durante a lição e só aparecem depois (`holdAchievementModals`, sem mudança).

## 10. Transições, movimento, layout (PART AT–AV, BJ–BP)

- Entrada do passo em 180ms, com leve deslize à esquerda. Com movimento reduzido, nenhuma animação (E2E AV).
- Coluna limitada a 680px no desktop/tablet (E2E BJ: 560–760px).
- A safe-area vale no topo (cabeçalho) e embaixo (dock). E2E DI em 360×740, 390×844, 412×915 e 432×960: CTA sempre dentro da tela.
- Teclado: o frame segue o `visualViewport`; o dock sobe e não cobre o campo (E2E DF, com o viewport reduzido a 500px).
- Em 390×844, ouvir, escolha e tom cabem sem rolar (E2E CX/CY; contrato `scrollPolicy: NONE`).

## 11. Guidance ≠ shell; rollback (PART BH, BI, BY, BZ)

- `guidedShell = shellMode === "GUIDED"`: o nível de guia **não** decide o shell. LOW e NONE usam o mesmo shell limpo, com menos ajuda (E2E DA: lição 111, LOW, shell guiado e sem PREPARE).
- `VITE_GUIDED_JOURNEY_SHELL=off` volta ao quadro antigo (rollback visual de DEV/QA), com o mesmo estado da lição. Nenhum progresso se perde.
- Em produção pública, sempre GUIDED. O override de runtime (`longyu:guided-shell`) só vale em sessão de teste semeada; é o que gerou as capturas "antes".

## 12. Primeiras 20 lições (PART BA/BB)

Capturas: `docs/reports/rc2-2-17b-screenshots/first-20/` (2 telas por lição, 390×844). Medições: `docs/release/rc2-2-17b-first-20-audit.json`.

| Critério | Resultado nas 20 |
|---|---|
| shell em tela cheia | 20/20 |
| sem card externo | 20/20 (40/40 telas) |
| ação principal clara (≤ 1) | 40/40 telas |
| sem metadado desnecessário (≤ 1 pílula) | 40/40 telas |
| ensino guiado (Dragão no PREPARE/intro) | 20/20 abrem com PREPARE ou fala do Dragão |
| interação guiada / feedback / recap | mesmo motor; feedback inline; recap pedagógico (§9) |
| captura mobile | 40 capturas |

**"Isso parece Guided Try?"**: revisei as 40 capturas uma a uma. Resposta: **SIM**. Mesmo cabeçalho (× · barra · n/N), mesmo fundo sem card, Dragão + balão na abertura e CTA único embaixo.

Ressalvas honestas vistas nas capturas:
1. Passos complexos (produção livre, Hànzì por fragmentos, "Situação") ainda têm caixas internas de conteúdo. É uma superfície por vez, sem card externo (GUIDED_ADAPTER), mas são mais densos que o Teste guiado.
2. Alguns enunciados antigos do currículo aparecem sem acento ("Ouca", "Voce", "Situacao"). O texto é **conteúdo congelado** (fingerprint), não desta onda; fica como item para uma onda de conteúdo.

## 13. 134 lições — evidência estrutural (ALL 134)

`docs/release/rc2-2-17b-structural-134.json` (varredura E2E): **134/134** lições abrem no `GuidedLessonShell` e **0** têm Card antigo. Não há lição inativa excluída.

## 14. Antes × depois e golden (PART CJ–CL)

- `before-after/` + `step-kinds/` (lado a lado), mesmo passo nos dois shells: PREPARE, ensino (intro), ensino de contraste tonal, ouvir, ouvir revelado, fala, tom, escolha, compreensão, digitação, Hànzì, conversa, escolha por imagem, cultura.
- `golden/`: Teste guiado × Jornada lado a lado (abertura, ouvir, tom). Critérios: cabeçalho igual, densidade parecida, mesmo espaçamento, CTA no mesmo lugar. Não é pixel-idêntico (o tom da Jornada é o exercício de escolha do currículo).

## 15. QA físico Android

`docs/release/android-physical-qa.json` ganhou 8 campos, todos **NOT_RUN**: L1, L2, tom, fala, conversa, Hànzì, intermediária, avançada. Também o risco `ANDROID_RC2_2_17B_GUIDED_JOURNEY_UNVERIFIED` (OPEN). Antes do Closed Beta, esse QA físico precisa passar. O agente não tem aparelho: nenhum PASS foi marcado.

## 16. Fingerprint e currículo

| | |
|---|---|
| Fingerprint | `c48b008c9c1e` (**sem mudança**: só apresentação) |
| Contagens | 134 lições · 113 tópicos · 30/30 cultura · 20 nós · 5 Moments · 12 Tone Transfers · 31 READY · 0 PARTIAL (sem mudança) |
| Exceção de freeze | `RC2_2_17B_GUIDED_JOURNEY_PARITY_EXCEPTION` |
| Mudou | nenhum id, ordem, tópico, StepKind, resposta ou mastery ref; nenhuma cópia pedagógica de tom |
| Não existe | LessonEngineV2, StepRenderer paralelo, novo SRS/XP |

## 17. Gates

**`gate:rc2-2-17b-guided-journey-parity`**: 5 áreas (validate + test), **47 mutações**, todas mortas com o código certo. O módulo de apresentação é **empacotado a partir do texto** (esbuild), então a mutação é executada, não só procurada.

| Área | Mutações | Cobre (lista DJ) |
|---|---:|---|
| guided-shell | 9 | 1, 2, 3, 4, 20, 21 + produção/flag/override |
| presentation-contracts | 8 | 8, 9 + contrato ausente, dock < 80%, exceção sem motivo, evidência 134/varredura |
| presentation-stage | 9 | 5, 13, 15, 16, 17, 18 + micro-páginas |
| guided-action-dock | 9 | 6, 7, 19, 22, 23 + clique=ouviu, falha escondida, ofertas na folha, teclado |
| guided-parity-release | 12 | 10, 11, 12, 14, 24, 25 + falante invisível, tom card-em-card, recap depois do XP, 2º motor, PASS falso, Qi no cabeçalho |

- Entrou em `validate:beta` e nos workflows `android-build` / `android-release`.
- Gate 2.2.17 ajustado só no alvo de uma mutação (M58: o `<main>` do Teste guiado usa a classe compartilhada da coluna).
- **E2E**:
  - `rc2-2-17b-guided-journey-parity.spec.ts`: CU/CV, rollback, PREPARE/DC, ouvir CX, falha de áudio DG, escolha CW, tom CY, conversa CZ, LOW DA, recarregar DD, segundo plano DE, teclado DF, fala DH, 4 áreas seguras DI, desktop BJ, movimento AV, cultura BU, prova DB, varredura das 134 e varredura por StepKind.
  - `rc2-2-17b-screenshots.spec.ts` (`SHOT_PACK=1`): pacote visual.
- Suítes antigas ajustadas ao dock:
  - O avanço da cena é procurado na cena **ou** no dock.
  - Os helpers conhecem "Ouça a frase" / "Continuar sem áudio".
  - O PREPARE só aparece em E2E semeado quando o teste pede (`longyu:e2e-prepare=on`). Fora de sessão de teste, sempre vale.

## 18. P0 / P1

- **P0**: nenhum aberto nesta onda.
- **P1**: QA físico Android da Jornada guiada (§15), bloqueante para o Closed Beta, não para o Internal.

## Regressão

_(preenchido ao final da rodada completa)_

## Pendências honestas

1. QA físico Android (§15): NOT_RUN.
2. Passos complexos ainda mais densos que o Teste guiado (§12, ressalva 1). Candidatos a micro-paginação numa próxima onda: produção livre com dica/modelo e Hànzì por fragmentos.
3. Acentos ausentes em enunciados antigos do currículo (§12, ressalva 2): onda de conteúdo, com registro de fingerprint.
4. Empilhada no #290; a RC2.2.18 é branch irmã (§1).
5. WebKit/Firefox não instalam neste contêiner: rodam no CI da PR.
