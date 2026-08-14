# V3.9 — Real Device Integrity

Resposta ao QA manual em Android real. Base: `main` em `96d74c4`.

O ponto de partida da remessa vale registrar: as capturas de tela encontraram
três classes de problema que o conjunto de validators verdes não pegava —
conteúdo incoerente, geometria mobile e custo real de CPU. Cada correção abaixo
vem com a medição que a sustenta.

---

## P0-001/002/003 — Revisão misturava itens

**Reproduzido.** O card exibia:

```
明天见 · nǐ hǎo · Até amanhã.
```

O banco estava correto o tempo todo (`chunk:mingtianjian` = `míngtiān jiàn`).
A corrupção nascia na montagem do card.

### Causa raiz

`buildReviewExerciseFromMistake` resolvia a entidade a partir de
`mistake.targets[0]`. Mas `reviewTargetsForMistake` acumula alvos na ordem em
que o passo declara os textos — num `match_pairs`, `targets[0]` é o **primeiro
par da tela**, não o que o aluno errou. O enunciado vinha do registro do erro e
a entidade (pinyin, áudio, feedback) vinha de outro item.

Duas hipóteses foram testadas e **descartadas** antes de chegar aqui:

| hipótese | verificação | resultado |
| --- | --- | --- |
| glosa autoral errada na jornada | 826 glosas auditadas | 0 incoerências |
| `step.pinyin` vazando no registro de erro | 5.327 passos de planos gerados | 0 incoerências |

### Correções

- Novo `errorLexicalIdentity`: hànzì, pinyin e significado saem sempre da mesma
  unidade, com o banco como fonte da verdade. Composição por caractere é último
  recurso e **nunca** reprova pinyin autoral — sandhi (`不` bù→bú) e tom neutro
  (`谢谢` xièxie) tornariam pinyin correto em falso erro.
- `primaryMistakeTarget` segue o item efetivamente errado.
- Entidade e enunciado conciliados: quando o alvo do SRS diverge do erro, o
  registro do erro manda.
- Pinyin incoerente é descartado **e registrado** — nunca substituído pelo de
  outro item.

### Achado adicional (P0)

O validador novo encontrou um segundo bug real: em `pinyin_reverse` de chunks a
resposta mantinha a pontuação (`你好吗？`) enquanto as opções saíam normalizadas
(`你好吗`). A alternativa correta nunca batia com a resposta — **o aluno era
reprovado ao acertar**. 116 cards afetados.

### TEST-004

`npm run validate:review-content-integrity` gera **12.574 cards** e valida
hànzì↔pinyin, hànzì↔significado, resposta∈opções, peças↔alvo e áudio↔alvo, com
sentinela explícita para `明天见 → nǐ hǎo`. Revertendo as correções, o validador
reproduz o screenshot literalmente. Ligado ao gate `validate:beta`.

---

## MOBILE-006/007/008 — CTA cobrindo as opções

**Reproduzido em emulação** (360×640 e 375×667), com screenshot.

Duas causas independentes:

1. Só a barra do player publicava a própria altura em
   `--lesson-sticky-actions-height`. HanziBuilder e CompareWithImage não
   publicavam nada — o scroller reservava zero.
2. A barra do builder usava `bottom: calc(var(--app-bottom-nav-height)+0.5rem)`.
   Essa variável tem default global de ~4.5rem, mas o player é tela cheia **sem
   TabBar**: a barra flutuava ~80px acima do fim da área rolável, em cima das
   peças.

Correções: hook único `useStickyActionsReserve` (reserva = altura + `bottom`,
valor determinístico — medir a posição já fixada realimentava o layout) e novo
`--activity-actions-offset`, sobrescrito no player para só a safe-area.

`assertNoStickyBarOverlap` compara a geometria real de cada opção com a faixa da
barra. 9 casos passam; com as correções revertidas, reprova. As 59 specs mobile
existentes seguem verdes.

`data-hanzi-builder` foi adicionado ao DOM — o seletor que a spec do iPhone já
usava não existia e nunca casava.

---

## PERF — o congelamento tem causa medida

`ensureStructureExposureIndex` montava o plano de prática das **127 lições** da
jornada para abrir **uma**:

| | antes | depois |
| --- | ---: | ---: |
| abrir a lição 1 | 12.276 ms | **96 ms** |
| abrir a lição 5 | — | 211 ms |
| abrir a lição 15 | — | 836 ms |

CPU de servidor; no aparelho o custo é bem maior. Confirmado o que o relato já
apontava: `startTransition` não tinha como ajudar, porque muda prioridade de
renderização e não tira trabalho síncrono da main thread.

Abrir a lição N só depende do histórico até N — o índice passou a ser construído
incrementalmente, guardando o progresso. **Equivalência verificada:** 508 planos
(127 lições × 4 níveis) comparados antes e depois, nenhuma diferença.

PERF-010: `plannerTiming` mede as fases do planner. O módulo evita `import.meta`
de propósito — `lessonTasks` é compilado para CJS pelos validators e a mistura
quebra o gate.

---

## REVIEW-023/024/026 — os "260 itens"

`npm run report:review-queue` reconstrói a fila. Na Fase 1 · Unidade 1+2:

- **301** entradas exibidas
- **43** memórias-alvo reais
- **258 (86%)** de domínios **nunca praticados**

A chave do SRS inclui o domínio, e `gradeReviewDomain` chamava `ensureSrs` para
todos os 7 domínios do tipo sempre que qualquer um era avaliado. Praticar 你好
uma vez criava sete entradas devidas.

As suspeitas levantadas ficam **descartadas**: zero itens do Atlas, zero
distractors, zero combinações geradas, zero órfãos. A inflação era inteiramente
de domínios não praticados do próprio vocabulário ensinado.

Correções: só o domínio avaliado entra na fila (301 → **43**); o convite passa a
ser "Revisão de hoje · 10" com "+N pendentes" como informação secundária.

---

## VAR-015/016/017 — repetição entre modos

O controle de variedade só enxergava o plano atual. Novo histórico persistido
(`recentActivities`) alimentado por jornada e revisão semeia a janela do
planner; repetição deliberada vai rotulada com `recoveryReason`.

**A causa principal, porém, estava na fila de revisão, não no planner.**
`dueItems` intercalava por item, mas não por família: depois de uma lição de
Hànzì os caracteres vencem juntos e a revisão virava um bloco só.

```
antes  · chunk chunk chunk chunk hanzi hanzi hanzi hanzi hanzi hanzi hanzi hanzi
depois · chunk hanzi chunk chunk hanzi chunk hanzi hanzi hanzi hanzi hanzi hanzi
```

Medição honesta do lado do planner: nas 40 primeiras lições, 2 planos mudam com
histórico de Hànzì e **nenhuma delas abria com Hànzì**. O ganho real está na
fila de revisão.

---

## IMG-018/019/020 — não confirmado

`npm run report:visual-assets-runtime` classifica cada asset por
orphan/wired/reachable/**observed**, contando como entregue só o que aparece em
plano realmente gerado.

- 87 conceitos, 87 arquivos, todos resolvidos
- 47 assets **observados** em planos gerados
- primeira atividade visual na **lição #4**
- **12 das 30 primeiras lições** têm `image_choice`/`compare_with_image` para um
  aluno novo — cadência de 1 a cada 2,5 lições, **acima** do alvo de IMG-021
  (1 a cada 3–5)

Planejamento e resolução de asset estão saudáveis; a observação de campo não se
explica por nenhum dos dois. `VisualConceptImage` cai para `VisualConceptIcon`
quando a imagem falha — uma falha de carregamento apareceria como **ícone**, não
como tela vazia. Fechar o item depende de evidência do aparelho: qual passo
visual foi alcançado e o que renderizou.

---

## O que esta remessa NÃO fecha

Honestidade sobre o critério de aceite:

- **QA-028 (smoke humano em aparelho físico)** — não executado. Nada aqui
  substitui isso, e a régua "nenhum teste verde substitui evidência de aparelho
  real" continua valendo. As reproduções de MOBILE-006 são em emulação Chromium.
- **PERF em aparelho** — a melhora está medida em CPU de servidor. Falta
  confirmar no Android que o congelamento sumiu de fato. Lições mais avançadas
  (a partir da ~40) ainda pagam um índice maior; se o travamento persistir lá,
  o próximo passo é precomputar no build ou mover para Worker (PERF-014).
- **IMG** — depende de evidência do aparelho, como acima.
- **REVIEW-025 (deduplicar equivalentes)** — não implementado. Com a fila em 43
  itens deixou de ser urgente; vale reavaliar depois.
- **P0-005 / peças** — coberto pelo validador, mas `hanzi_build` é exceção
  legítima (monta o caractere a partir dos componentes: 日+月 = 明).
