# RC1.3 — Learning Integrity · Review · Tones

> ## O que esta remessa resolve
>
> Cinco defeitos vistos por QA humano com o app na mão. Nenhum deles era de
> conteúdo: os cinco eram de **runtime**, e por isso nenhum gate anterior os
> pegou. O currículo não mudou — nem uma lição, nem um passo.

| Campo | Valor |
| --- | --- |
| BASE_SHA_REAL | `5c0caf0fcbb6a16029a7ce3a6316b4ca63dc27ba` |
| Base conhecida no planejamento | `5c0caf0fcbb6a16029a7ce3a6316b4ca63dc27ba` — confere |
| Fingerprint antes / depois | `38e70062857d` / `38e70062857d` — **inalterado** |
| Lições / temas | 134 / 113 — **inalterados** |
| Escopo | BUGFIX · PEDAGOGICAL INTEGRITY · REVIEW UX · TONE PEDAGOGY · ASSET CORRECTION |
| V4.10B (Business Operations) | **pausada** — nenhum arquivo de Groups / Programs / Reports nesta PR |

---

## Sumário dos cinco bugs

| # | Sintoma relatado | Causa-raiz | Correção |
| --- | --- | --- | --- |
| 1 | A revisão volta à mesma atividade indefinidamente | Fila recalculada a cada resposta + `key` que remontava a sessão | Plano finito e imutável (`reviewSessionPlan.ts`) |
| 2 | Pergunta de 请问 corrigida com 我叫马修 | `stepIndex` do PLANO resolvido contra os passos AUTORAIS | Resolução por identidade + resposta canônica única + falha fechada |
| 3 | Revisão mais difícil e menos apoiada que a tarefa original | Não existia contrato de paridade de tarefa nem de ajuda | `reviewTaskParity.ts` + `reviewHelpParity.ts` + dica na revisão |
| 4 | Árvore com fundo/pixels ao redor da base | Caminhos de fundo do VTracer que o detector antigo não classificava | 12 caminhos removidos de 5 arquivos SVG + gate novo |
| 5 | Victory desktop com vazio enorme antes do CTA | Card preso a ~100dvh mesmo com pouco conteúdo | Altura acompanha o conteúdo a partir de `sm` |

---

## P0 — Reprodução antes da correção

### BUG 1 · a revisão em loop

Duas linhas, em `LessonPlayer.tsx`, produziam o loop juntas:

```
// fila recalculada a cada render do pai
const reviewQueue =
  errorReviewMode === "review" && remainingErrors.length > 0
    ? remainingErrors
    : committedErrors;          // ← quando tudo é corrigido, VOLTA ao conjunto inteiro

// e a key mudava a cada correção → o componente remontava com index = 0
key={`review-${correctedErrorIds.join("|")}-${reviewQueue.length}`}
```

Corrigir o último item pendente esvaziava `remainingErrors`, o ternário caía em
`committedErrors` e a sessão recomeçava do zero. O CTA "Continuar revisão" do
resumo fechava o círculo: errar → resumo → revisar de novo → errar, sem teto.

| Campo | Valor |
| --- | --- |
| lessonId | `p1-qingwen-cortesia` |
| task kind | `dialogue_choice`, `conversation_scene` |
| reviewSessionId | não existia — a sessão não tinha identidade |
| plannedItems / retryBudget | não existiam |

### BUG 2 · 请问 corrigido com 我叫马修

Reproduzido com o motor real. O erro é gravado como
`questionId = ${lessonId}:${stepIndex}:${kind}`, onde `stepIndex` indexa o
**plano da sessão** (o que `lessonRoundStepsFor` montou para aquela pass).
`stepForMistake` resolvia esse índice contra `lesson.steps`, o array **autoral**
do catálogo. Os dois arrays divergem sempre que há mastery pass:

```
p1-qingwen-cortesia · pass 1
  idx 4: PLANO     conversation_scene / "Meu nome é Matheus."   ← o aluno errou aqui
         AUTORAL   dialogue_choice    / 请问                     ← e foi isto que a revisão leu
```

Resultado exato do que o QA fotografou:

| Superfície | Origem | Valor |
| --- | --- | --- |
| prompt | `error.step` (passo ERRADO) | "Você quer pedir informação na loja ou na rua. O que abre a pergunta?" |
| explicação | `error.step` (passo ERRADO) | "请问 = com licença; abre a pergunta." |
| RESPOSTA CERTA | `mistake.expectedAnswer` (passo certo) | **我叫马修** |

| Campo | Valor |
| --- | --- |
| lessonId | `p1-qingwen-cortesia` |
| stepId autoral do 请问 | índice 4 · `dialogue_choice` |
| stepId do plano colidente | índice 4 · `conversation_scene` (cena `como-se-chama`) |
| correct answer id | `opt:请问` |
| option order original | `["请问", "再见", "不客气", "我很好"]` |
| option order shuffled | `["不客气", "我很好", "再见", "请问"]` (seed = id do erro) |

Um segundo defeito apareceu no mesmo caminho: para uma `conversation_scene` com
checkpoint `choose_meaning`, o alvo era buscado casando `line.hanzi` com a
resposta — que está em **português**. Sem casar, caía na ÚLTIMA fala com hànzì,
que é a réplica do NPC (你好，Matheus！). O áudio da correção tocava outra frase.

---

## P1/P2 — A revisão agora é finita

`src/features/lesson/reviewSessionPlan.ts`

### Contrato da sessão

```
ReviewSessionPlan {
  reviewSessionId
  plannedItems       // IMUTÁVEL — construído UMA vez (P1.1)
  retryBudget
  maxRenderedTasks   // = plannedItems.length + retryBudget
}
```

### Máquina de estados

```
startReviewSession ─→ [active] ──answerReviewItem──→ [active]
                         │                              │
                         │ advanceReviewSession          │ disjuntor
                         ↓                              ↓
                    [complete] ←── endReviewSession  [aborted]
```

`answerReviewItem` registra o resultado e, quando o aluno erra, concede **no
máximo um retry atrasado** — inserido no FIM da fila (A B C A′), e só se houver
ao menos um outro item entre a falha e a volta. Sem item no meio, repetir seria
"A A", que P1.4 proíbe: a fraqueza segue para o SRS e a sessão continua.

### Invariantes (P1.5), verificados por execução

```
renderedTasks <= plannedItems.length + retryBudget
occurrences(logicalReviewItemId) <= 2
```

Resultado da simulação com 5 itens (`retryBudget = 5`, teto = 10):

| Oráculo | Terminou? | Renderizados | Ordem | Ocorrências | Não resolvidos |
| --- | --- | --- | --- | --- | --- |
| sempre erra | sim | 10 | A B C D E A′ B′ C′ D′ E′ | todas = 2 | A B C D E |
| sempre acerta | sim | 5 | A B C D E | todas = 1 | — |
| alterna | sim | 7 | A B C D E B′ D′ | ≤ 2 | B |
| erra só o último | sim | 5 | A B C D E | todas = 1 | E |
| erra só o primeiro | sim | 6 | A B C D E A′ | ≤ 2 | — |

"Erra só o último" não concede retry: não há item entre a falha e a volta (P1.4).

### Retry budget e teto de ocorrências

- `REVIEW_RETRY_BUDGET_PER_ITEM = 1`
- `REVIEW_MAX_OCCURRENCES_PER_LOGICAL_ITEM = 2`
- Erros do MESMO conhecimento **colapsam** no plano: cinco erros do mesmo alvo
  viram um item. É isso que torna "5 pontos para firmar" (P2.1) honesto.

### Circuit breaker (P1.8)

| Código | Dispara quando |
| --- | --- |
| `RENDER_BUDGET_EXCEEDED` | renderizações passam de `plannedItems + retryBudget` |
| `OCCURRENCE_LIMIT_EXCEEDED` | um conhecimento tenta aparecer uma 3ª vez |
| `CURSOR_STALLED` | o cursor não anda depois de `REVIEW_STALL_LIMIT` transições |

Ao abrir, a sessão encerra com diagnóstico no console e o aluno vai ao resumo.
Nunca fica preso na tela.

### P1.6 / P1.9 / P2.2

- O que a revisão não resolveu entra no SRS como `again` — inclusive quando o
  disjuntor encerrou a sessão no meio.
- O avanço continua **local-first**: nenhum destino depende de `cloudSyncState`.
- O CTA "Continuar revisão" do resumo **foi removido**. A revisão ensina de novo
  e termina; "Refazer lição" continua, porque é uma tentativa NOVA com plano novo.
- "Sair da revisão" existe em todo card: ela não é prisão.

---

## P3 — Paridade de tarefa

`src/features/lesson/reviewTaskParity.ts`

`REVIEW_KINDS_BY_SOURCE_KIND` declara, para cada tipo de tarefa original, quais
motores a revisão pode usar. A causa do erro continua dirigindo o formato, mas
agora **dentro** da paridade: se ela apontar para fora, é ignorada.

| Tarefa original | Revisão |
| --- | --- |
| `image_choice`, `compare_with_image` | `image` — a MESMA imagem, nunca texto puro |
| `listen_select`, `audio_discrimination` | `listen` — continua pelo ouvido |
| `sentence_build`, `translation_build`, `hanzi_build` | `build` — continua montando |
| `fill_blank` | `blank` |
| `match_pairs`, `tone_pair` | `pair` |
| `free_production`, `transfer_task` | `build` — volta COM apoio |

`image_choice → choice` foi removido do mapa de propósito: os **339 itens
visuais** do currículo resolvem o conceito canônico e voltam como `image`
(medido), então um fallback textual declarado só serviria para se abrir sozinho
no dia em que um asset quebrasse.

As oito conversões que mudam de modalidade estão em
`AUTHORIZED_REMEDIATION_TRANSFORMS`, cada uma com o motivo pedagógico escrito.
Qualquer outra é "conversão silenciosa" e reprova o gate.

### Motor novo: `image`

A associação visual errada volta como associação visual — a imagem do conceito
canônico continua na tela e hànzì/pinyin/significado saem do MESMO ref.

---

## P4/P5 — Paridade de ajuda

`src/features/lesson/reviewHelpParity.ts`

```
reviewHelpFloor   >= sourceHelpInitial
reviewHelpCeiling >= sourceHelpCeiling
```

"Preciso de uma dica" — a mesma copy da lição — passa a existir na revisão, com
escada progressiva por modalidade:

| Modalidade | Escada (P5) |
| --- | --- |
| MEANING / MCQ | áudio → pinyin → contexto → eliminar uma → revelar |
| VISUAL ASSOCIATION | imagem → áudio → pinyin → eliminar uma → revelar |
| SENTENCE BUILD | pinyin → estrutura → reduzir distratoras → revelar |
| LISTENING | ouvir de novo → ouvir devagar → pista de significado → eliminar → revelar |
| TOM | áudio → ouvir devagar → contexto → eliminar → revelar |

- **Nenhuma** escada começa em "revelar" (P4.4) e **todas** terminam nele, para
  que ninguém fique sem saída.
- Listening e tom são **audio-first**: o alvo escrito não aparece antes do som.
- Achado na varredura: um `substitution_drill` de `l9` (我叫 ___) ficava com UMA
  alternativa e nenhum degrau de dica, porque a lacuna só lia `bank`/`distractors`
  e as opções viviam em `step.options`. Corrigido, e a frase completa (我叫Ana)
  virou degrau de áudio — dica honesta num alvo de escrita latina.

---

## P6/P7/P8 — Resposta canônica

`src/features/lesson/canonicalAnswer.ts`

```
correctResponse = { id, hanzi, pinyin, meaning, explanation, audioTarget, display, value }
```

Fluxo do P6.3, sem índice em nenhum ponto:

```
opções originais → ids estáveis (derivados do rótulo) → shuffle de apresentação
   → aluno seleciona optionId → evaluator compara com correctOptionId
```

| Superfície | Fonte |
| --- | --- |
| avaliação | `optionSet.correctOptionId` |
| "Resposta certa" | `canonical.display` + `canonical.pinyin` |
| significado | `canonical.meaning` |
| explicação | `canonical.explanation` |
| áudio automático | `canonical.audioTarget` |

### Shuffle — 100 seeds

Item de 请问, 100 seeds: em **todas**, a opção correta continuou 请问, a resposta
canônica continuou 请问, o avaliador aceitou apenas 请问, e nem
`canonical.display` nem `canonical.audioTarget` contiveram 我叫.

### Falha fechada (P8)

Quando a resposta canônica e a explicação nomeiam hànzì diferentes, a linha
"Resposta certa" **não é apresentada**; a tela mostra que a correção está
indisponível e o console registra `ANSWER_INTEGRITY_MISMATCH`. Melhor um item sem
correção do que a correção errada.

A checagem é conservadora: só acusa quando a explicação nomeia hànzì E nenhum é o
alvo. Explicação sem hànzì — a maioria — nunca reprova.

### Varredura completa do corpus

Todas as lições × 4 passes. Sobraram **4** itens em que prompt, resposta e
explicação divergem. Todos são passos GERADOS pelo planejador de mastery em
`lessonTasks.ts`, que está dentro do fingerprint congelado:

| Item | Prompt | Resposta | Explicação |
| --- | --- | --- | --- |
| `p2-comparar-tom-2-3#4:1` | "Aplicar o contraste em 你 / 好." | 麻 | "…sílabas de 你好" |
| `p4-num-910#4:1` | "Usar 十 para fechar uma contagem." | 九 | "usar 十 como 'dez'…" |
| `p4-char-zhong#2:0` | "…caracteres vizinhos de 中." | 人 | "os caracteres centrais de 中" |
| `l19-logica-ma#2:0` | "…vizinhos de Quando 马 dá som." | 妈 | "…de Quando 马 dá som" |

Não estão varridos para debaixo do tapete: em runtime **falham fechados**, o
aluno não vê correção errada nenhuma, e estão listados em
`KNOWN_FROZEN_ANSWER_MISMATCHES` para que um item NOVO com o mesmo defeito
reprove o gate. Corrigi-los exige mexer no planejador congelado — **trabalho da
próxima remessa**.

---

## P9 — Áudio do feedback

RC1.1 preservado: erra → a correção aparece → o mandarim correto toca uma vez.
RC1.3 acrescenta a garantia de QUAL mandarim: `canonical.audioTarget`. Mute,
autoplay, dedupe e o botão de replay continuam decididos por
`decideFeedbackAudio` (`feedbackAudioPolicy.ts`), intocado.

No item de 请问, o áudio automático é **请问**.

---

## P10/P11 — Assets transparentes

### O arquivo da árvore

`src/assets/visuals/nature/tree.svg` — corrigido no ARQUIVO, nunca por CSS.

Duas classes de resíduo, ambas do traçado VTracer:

| Classe | Caminhos | O que era |
| --- | --- | --- |
| `ground-residue` | `#9EBFA0`, `#B5CEB7`, `#98BA9A` | manchas de chão soltas na base (y 541–559 de 600) |
| `canvas-over-drawing` | `#EAF0EA` × 4 | halo do fundo pintado POR CIMA dos galhos |

Por que o detector antigo não pegava:

- as manchas de chão ficam **fora** da família estrita do canvas (min de canal
  152–181, abaixo do limiar 0xC0);
- os halos de canvas eram **preservados** porque a métrica antiga lia "revelou
  sujeito" como "mudou a silhueta" — quando é exatamente o contrário: revelar o
  desenho é a prova de que aquilo era fundo.

### Verificação de alpha (P10.5)

Renderizada a 240×240 sobre preto, branco, Longyu dark e xadrez: **0** pixels
claros de fundo na faixa inferior (antes: manchas visíveis em preto e no dark).

Evidência: `docs/screenshots/rc1-3/` (antes/depois nas quatro superfícies foram
verificados durante a correção).

### Auditoria do pipeline (P11) — 5 arquivos, 12 caminhos

| Arquivo | Removidos |
| --- | --- |
| `nature/tree.svg` | 4 canvas-over-drawing + 3 ground-residue |
| `nature/forest.svg` | 2 canvas-over-drawing |
| `people/friend.svg` | 1 ground-residue |
| `people/mother.svg` | 1 ground-residue |
| `people/woman.svg` | 1 ground-residue |

**P11.1 respeitado — o que NÃO foi tocado e por quê:**

A primeira passagem do detector ia apagar arte legítima. Verificação visual
antes/depois mostrou:

- `objects/home.svg` — as seis formas `#C6DCD2`…`#CDE0D7` são as **vidraças** da
  casa; removê-las abria buracos na parede;
- `people/friend.svg` — o `#EDF1EC` de 2007px é a **camiseta branca** da pessoa
  à direita;
- `objects/money.svg`, `daily-life/tea.svg`, `nature/water.svg` — brilhos e
  papel da cédula.

A regra foi então apertada com um critério objetivo: tinta de canvas é
**quase-branca** (min de canal ≥ 0xE0) e cobre **≤ 1% da silhueta**. As vidraças
(min 0xC6) e a camiseta (9,18% da silhueta) ficam de fora, e os halos da árvore
(0,22–0,68%) e da floresta (0,39–0,46%) entram. Só então os arquivos foram
reescritos, e cada um foi conferido no olho.

### `validate:visual-asset-transparency`

Para todo asset `backgroundStyle: "transparent"`:

- **SVG** — sem placa de canvas, sem tinta de canvas por cima do desenho, sem
  resíduo de chão na margem inferior;
- **raster** — os quatro cantos com alpha 0;
- **anti-disfarce** — `mix-blend-mode` nos renderers de imagem reprova o gate
  (mutação 14): esconder não é corrigir.

---

## P12 — Integridade da associação visual

A árvore deriva do ref canônico, e o gate prova:

| Campo | Valor | Fonte |
| --- | --- | --- |
| conceito | `tree` | `visualVocabulary.ts` |
| charId | `mu` | ref canônico |
| hànzì | 木 | `characters.ts` via ref |
| pinyin | mù | `characters.ts` via ref |
| significado | árvore | conceito |
| imagem | `nature/tree.svg` | conceito |

Nenhum "mù" hardcoded em `StepImageChoice`, `LessonPlayer` ou na remediação
(mutação 15). Todos os 87 conceitos têm hànzì e pinyin idênticos aos do seu ref.

---

## P13–P22 — Pedagogia de tom

### P14 — Auditoria das aulas de tom

26 lições tocam tom. As 7 focadas no contraste da base `ma`:

| Lição | Ensina | Testa | Par apresentado antes? |
| --- | --- | --- | --- |
| `p1-o-que-e-tom` | 妈 马 麻 骂 (significado só no passo 6) | `tone` nos passos 1,2,4,5 · `listen_select` no 3 | **NÃO** — teste antes do ensino |
| `p2-ma-primeiro-tom` | 妈 (listen + pt) | `tone` no passo 2 | parcial (só 妈) |
| `p2-ma-segundo-tom` | 麻 | `listen_select` 妈/麻/马/骂 no passo 2 | parcial |
| `p2-ma-terceiro-tom` | 马 | `listen_select` 妈/麻/马/骂 | parcial |
| `p2-ma-quarto-tom` | 骂 | `listen_select` 妈/麻/马/骂 | parcial |
| `p2-comparar-tom-1-4` | 妈 + 骂 (listen com pt) | `tone`, `listen_select` | **sim** no autoral; **não** nas passes |
| `p2-comparar-tom-2-3` | 麻 + 马 (listen com pt) | `tone`, `match_pairs` | **sim** no autoral; **não** nas passes |

O buraco mais grave é `p1-o-que-e-tom`: quatro passos `tone` cobrando 妈/马/麻/骂
**antes** do `match_pairs` que finalmente mostra que 妈 é mãe e 马 é cavalo
(mutação 20). E nas mastery passes, até as aulas de comparação perdem os passos
`listen` que faziam a apresentação.

### P15 — `ToneContrastSet`

`src/data/toneContrastSets.ts`

| id | base | A | B | Ensinado em |
| --- | --- | --- | --- | --- |
| `ma-1-3` | ma | 妈 mā 1º · mãe | 马 mǎ 3º · cavalo | `p1-o-que-e-tom`, `p2-ma-primeiro-tom`, `p2-ma-terceiro-tom` |
| `ma-1-4` | ma | 妈 mā 1º · mãe | 骂 mà 4º · xingar | `p2-comparar-tom-1-4`, `p2-ma-quarto-tom` |
| `ma-2-3` | ma | 麻 má 2º · cânhamo | 马 mǎ 3º · cavalo | `p2-comparar-tom-2-3`, `p2-ma-segundo-tom` |

Invariantes verificados em código (P15.1/P15.2):

```
stripToneMarks(a.pinyin) == stripToneMarks(b.pinyin)   // mesma base
a.dictionaryTone != b.dictionaryTone                   // tons diferentes
a.meaningPt != b.meaningPt                             // função lexical
a.audioTarget && b.audioTarget                         // áudio nos dois
```

`stripToneMarks` remove **só** as quatro marcas de tom: o trema do `ü` fica, para
que `lǜ` não colapse em `lu` e invente um contraste que não existe.

### P13.2 — o que a copy diz e o que NÃO diz

A explicação é sempre "mesma **sílaba-base** ma, tons diferentes, **palavras
diferentes, com hànzì diferentes**". Nunca "o mesmo caractere muda de significado
com o tom" — 妈 e 马 são caracteres distintos.

### P13.4 / P19 — pares descobertos, aceitos e rejeitados

| Par | Situação |
| --- | --- |
| 妈/马, 妈/骂, 麻/马 | **aceitos** — já apresentados nas próprias tone lessons |
| qualquer par fora da base `ma` | **rejeitado** — não há segundo par completo já ensinado no corpus |
| adicionar 马 "porque é o exemplo famoso" | **não aplicável** — 马 já está no corpus destas aulas |

Nenhuma palavra foi adicionada ao currículo. Prova de "no new vocabulary":

| Membro | `contrastOnly` | Em `newHanzi` de alguma lição? |
| --- | --- | --- |
| 妈 | não (ensinado em `l16` / `p5-nv-ma-mae`) | sim, legitimamente |
| 马 | **sim** | não |
| 麻 | **sim** | não |
| 骂 | **sim** | não |

`validate:tone-contrast-no-new-vocab` reprova se um `contrastOnly` aparecer em
`newHanzi` ou `libraryItems` (mutações 21 e 22). O cartão avisa o aluno em texto:
"estas palavras entram só para você ouvir a diferença de tom".

### P16/P18 — teach-before-test, sem tocar no currículo

`src/features/lesson/toneContrastEnrichment.ts`

Corrigir no catálogo mudaria o fingerprint. O contrato de ensino entra em
**runtime**: antes do primeiro item pontuado que cobra um contraste, o plano
recebe um cartão `intro` (não pontuado) com os dois membros.

Resultado, autoral + 4 passes por lição:

| Lição | Gaps antes | Gaps depois |
| --- | --- | --- |
| `p1-o-que-e-tom` | 1 (autoral e nas 4 passes) | **0** |
| `p2-ma-primeiro-tom` | 1 | **0** |
| `p2-ma-segundo-tom` | 1 | **0** |
| `p2-ma-terceiro-tom` | 1 | **0** |
| `p2-ma-quarto-tom` | 1 | **0** |
| `p2-comparar-tom-1-4` | 1 (só nas passes) | **0** |
| `p2-comparar-tom-2-3` | 1 (só nas passes) | **0** |

### P16.1/P16.3/P17 — o cartão

`src/components/tone/ToneContrastCard.tsx` mostra, para cada membro: hànzì,
pinyin, número do tom, contorno visual (reaproveitando `ToneContour`), descrição
do contorno e significado; e os controles **Ouvir A**, **Ouvir B**, **Ouvir
comparação** (A, pausa, B) e **Ouvir devagar**.

### P20 — sandhi

`dictionaryTone` é o tom da palavra isolada, declarado como tal. A remessa não
vira curso de fonologia; só evita que o engine ensine uma mentira ao chamar de
"tom" algo que já é realização contextual.

### P21 — fala de tom, sem score falso

`SpeechRecognition` devolve texto, não contorno de F0. `claimsFakeToneScore`
reprova "seu 3º tom está 87% correto", "Pronúncia perfeita!", "tone accuracy" e
"nota de pronúncia" em qualquer superfície do app (mutação 23). Continuam
permitidos: "Repita em voz alta", "Compare com o áudio".

---

## P23 — Recuperação da estrela

- **Finito (P23.1):** não conseguiu, a revisão termina assim mesmo, a estrela não
  volta, a fraqueza segue no SRS.
- **Copy honesta (P23.2):**

| Antes | Depois |
| --- | --- |
| "a 3ª estrela volta se você acertar" | "você pode recuperar a 3ª estrela nesta revisão" |
| "acerte e a 3ª estrela volta" | "acerte e você recupera a 3ª estrela" |
| "domine o item na revisão e ela volta sozinha" | "domine o item na revisão para recuperá-la" |

- **Idempotência (P23.3):** `applyAttemptRecovery` mantém `recoveryAppliedRef` e
  o `claimReward` por `leagueXpKeyLesson(lessonId, attemptId)` — a mesma revisão
  não recupera a estrela duas vezes nem duplica XP/League XP.

---

## P24 — Victory compacta no desktop

Preservado o desenho da RC1.1 (P24.1): mascote, estrelas, XP, precisão, ponto
forte e foco, um CTA. Mudou **só a altura**.

| Viewport | Antes | Depois |
| --- | --- | --- |
| desktop 1280×900 | card esticado a ~100dvh, centenas de px de vazio antes do CTA | card acompanha o conteúdo (≈600px), CTA logo abaixo do resumo |
| 390×844 | CTA colado embaixo | **inalterado** — sticky continua (P24.3) |

Medido no e2e: a distância entre o fim do resumo e o começo do CTA é < 120px, e o
card ocupa < 95% da viewport.

Evidência: `docs/screenshots/rc1-3/victory-desktop.png`, `victory-390.png`.

---

## P25 — Gates novos

| Gate | O que executa |
| --- | --- |
| `validate:review-finite-session` | contrato + roda a máquina com 5 oráculos, inclusive "erra tudo" |
| `test:review-finite-session` | mutações 1, 2, 3, 4, 24, 26 + disjuntor + retry atrasado |
| `validate:review-task-parity` | mapa + varre todas as lições × 4 passes medindo o motor escolhido |
| `test:review-task-parity` | mutações 6 e 7 (146 itens de listening verificados) |
| `validate:review-answer-integrity` | contrato + 100 seeds + varredura do corpus |
| `test:review-answer-integrity` | mutações 8, 9, 10, 11, 12 + a raiz do BUG 2 |
| `validate:review-help-parity` | contrato + escada por modalidade + varredura |
| `test:review-help-parity` | mutação 5 + progressividade + "Preciso de uma dica" |
| `validate:visual-asset-transparency` | 87 assets: placa, resíduo, cantos alpha, anti-CSS |
| `validate:visual-association-integrity` | imagem ↔ ref ↔ hànzì ↔ pinyin ↔ significado |
| `test:visual-association-integrity` | mutações 13, 14, 15 + pixels na base da árvore |
| `validate:tone-contrast-progression` | invariantes + teach-before-test em 35 planos |
| `test:tone-contrast-progression` | mutações 16–23 + recall atrasado |
| `validate:tone-contrast-no-new-vocab` | `contrastOnly` fora de `newHanzi`/`libraryItems` |
| `validate:completion-layout` | altura da Victory sem redesenho |
| `validate:rc13-curriculum-freeze` | fingerprint + 134/113 + escopo (sem Groups/Programs/Reports) |

Todos entram em `validate:beta`, logo após `validate:rc1-2-freeze`.

---

## P26 — Gates preservados

Verificados um a um, todos **PASS**:

`validate:review-advance` · `test:review-advance` · `validate:feedback-audio` ·
`test:feedback-audio` · `validate:task-modality-coherence` ·
`validate:adaptive-plus-round` · `test:adaptive-plus-round` ·
`validate:adaptive-remediation-diversity` · `test:adaptive-remediation-diversity` ·
`validate:victory-minimalism` · `test:victory-minimalism` ·
`validate:tone-integration` · `test:tone-integration` · `validate:tone-progression` ·
`validate:tone-teach-before-test` · `test:tone-learning-ladder` ·
`validate:listening-affordance` · `validate:exercise-affordance` ·
`validate:teach-before-test` · `validate:production-scaffolding` ·
`test:production-scaffolding` · `validate:conversation-lexical-bridge` ·
`validate:completion-experience` · `test:completion-experience` ·
`test:immediate-remediation` · `test:review-ux` · `validate:review-content-integrity` ·
`validate:image-exercises` · `validate:visual-consistency` · `validate:visual-assets` ·
`test:player-ux` · `validate:i18n` · `test:i18n` · `build`

---

## P27–P31 — E2E

`e2e/rc1-3-learning-integrity.spec.ts` — **9 specs, todas passando**.

| Spec | O que prova |
| --- | --- |
| P27 | errando SEMPRE, a sessão avança, respeita o teto `planned + retry` e chega ao resumo |
| P2.2 | "Sair da revisão" encerra a qualquer momento |
| P28 | no item de 请问 a correção é 请问 — nunca 我叫马修; e em QUALQUER item resposta e explicação compartilham hànzì, ou a correção falha fechada |
| P29 | "Preciso de uma dica" existe antes de responder, a primeira dica não revela, e a modalidade pertence à família da origem |
| P30 (asset) | nenhum caminho de fundo no arquivo; 0 pixels claros na base sobre o dark |
| P30 (ref) | a árvore deriva de 木 / mù / árvore |
| P31 | o cartão apresenta os dois membros com pinyin, significado, contorno e os quatro controles de áudio, ANTES do teste tonal |
| P24 | vazio entre resumo e CTA < 120px no desktop |
| P24.3 | CTA na metade de baixo em 390×844 |

---

## P32 — Mutações

| # | Mutação | Onde morre |
| --- | --- | --- |
| 1 | revisão errada se re-adiciona infinitamente | `test:review-finite-session` |
| 2 | mesmo `logicalReviewItem` > 2 aparições | `test:review-finite-session` |
| 3 | último item volta para si mesmo | `test:review-finite-session` |
| 4 | "Praticar o que travou" cria revisão aninhada | `test:review-finite-session` |
| 5 | revisão perde dica existente na tarefa original | `test:review-help-parity` |
| 6 | revisão vira MCQ sem motivo | `test:review-task-parity` |
| 7 | listening revela o alvo antes do áudio | `test:review-task-parity` (146 itens) |
| 8 | 请问 correto, feedback com 我叫马修 | `test:review-answer-integrity` |
| 9 | evaluation e feedback com ids diferentes | `test:review-answer-integrity` |
| 10 | shuffle altera a resposta correta | `test:review-answer-integrity` (100 seeds) |
| 11 | explanation contradiz `correctResponse` | `test:review-answer-integrity` |
| 12 | feedback audio toca a opção errada | `test:review-answer-integrity` |
| 13 | tree raw asset com canvas/fundo opaco | `test:visual-association-integrity` |
| 14 | CSS esconde o fundo, asset continua errado | `test:visual-association-integrity` |
| 15 | imagem da árvore com pinyin de outro ref | `test:visual-association-integrity` |
| 16 | tone pair com sílabas-base diferentes | `test:tone-contrast-progression` |
| 17 | tone pair com o mesmo tom | `test:tone-contrast-progression` |
| 18 | tone pair sem meanings | `test:tone-contrast-progression` |
| 19 | tone pair sem áudio | `test:tone-contrast-progression` |
| 20 | teste tonal antes da apresentação do par | `test:tone-contrast-progression` |
| 21 | vocabulário não ensinado em scored contrast | `test:tone-contrast-progression` |
| 22 | `contrastOnly` entra em mastery | `test:tone-contrast-progression` |
| 23 | SpeechRecognition tratado como Tone Analyzer | `test:tone-contrast-progression` |
| 24 | revisão falhada nunca termina | `test:review-finite-session` |
| 25 | star recovery duplica reward | `recoveryAppliedRef` + `claimReward` idempotente |
| 26 | loop de revisão consome energia de novo | `test:review-finite-session` |
| 27 | Victory desktop com vazio enorme | `validate:completion-layout` + e2e P24 |
| 28 | fingerprint do currículo muda | `validate:rc13-curriculum-freeze` |

Cada arquivo de mutação roda um **controle positivo** antes: o gate real precisa
passar, senão o "KILLED" seria vazio.

---

## P33 — QA humano

Telas capturadas em `docs/screenshots/rc1-3/`, 390×844 e desktop.

| Pergunta | Resposta |
| --- | --- |
| A Review parece a atividade que eu acabei de fazer? | Sim — mesma modalidade, mesmo contexto, mesma imagem quando visual |
| Eu ainda tenho acesso à dica? | Sim — "Preciso de uma dica" antes de responder, progressiva |
| Se eu continuar errando, eu consigo sair? | Sim — a sessão termina sozinha e há "Sair da revisão" em todo card |
| A resposta mostrada como correta é a mesma que o evaluator usa? | Sim — as duas saem de `canonical`; quando não batem, a correção não é exibida |
| O áudio corresponde à correção? | Sim — `canonical.audioTarget`; no item de 请问 toca 请问 |
| O exercício de tom primeiro me ensinou a diferença antes de cobrar? | Sim — o cartão de contraste vem antes do primeiro item pontuado |
| Estou ouvindo duas palavras reais com a mesma sílaba-base? | Sim — 妈 mā e 马 mǎ, com áudio individual e comparação |
| A diferença de significado está clara? | Sim — "mãe" e "cavalo" lado a lado, com contorno |
| A árvore parece realmente transparente? | Sim — sem resíduo em preto, branco, dark e xadrez |

### Três defeitos encontrados NESTE QA humano e corrigidos

1. **Enunciado duplicado** no card de 请问 — o estímulo repetia o prompt palavra
   por palavra. O estímulo agora só aparece quando acrescenta algo.
2. **Explicação duplicada** no cartão de tom — o texto saía dentro do cartão e de
   novo logo abaixo. O passo de ensino não preenche mais `body`.
3. **Rótulo de contorno quebrado** — "1º · ˉ" quebrava em duas linhas na coluna
   estreita. O cartão passa a desenhar só o traço e a descrição por extenso.

---

## Freeze

| Medição | Antes | Depois |
| --- | --- | --- |
| Fingerprint | `38e70062857d` | `38e70062857d` |
| Lições | 134 | 134 |
| Temas de ensino | 113 | 113 |

Nenhum arquivo de `CURRICULUM_SOURCES` foi modificado. As correções pedagógicas
que exigiriam mexer no currículo (teach-before-test tonal, e os 4 itens gerados
com prompt/resposta divergentes) foram resolvidas em runtime ou registradas para
a próxima remessa.

---

## O que NÃO foi feito

- **Groups, Programs, Reports** — V4.10B segue pausada; `validate:rc13-curriculum-freeze`
  reprova se algum desses arquivos aparecer.
- **Nenhum Tone Analyzer, nenhum Pronunciation Score** — não existe avaliador
  acústico, e o gate reprova qualquer copy que finja existir.
- **Nenhum Review Engine paralelo** — o motor atual foi corrigido, não duplicado.
- **Os 4 itens de conteúdo congelado** com prompt/resposta divergentes: falham
  fechados em runtime; corrigi-los exige o planejador congelado.

---

## Depois do merge

Rebasear V4.10B sobre o NOVO SHA da main e continuar normalmente.
