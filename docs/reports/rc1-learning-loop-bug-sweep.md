# RC1.1 — Bug sweep do loop de aprendizagem

Cada entrada segue o mesmo formato: **evidência → causa raiz → correção →
teste de regressão**. Nenhuma delas é uma suspeita: todas foram reproduzidas
de forma determinística antes de virar código.

| Campo | Valor |
| --- | --- |
| Freeze | `CURRICULUM_FREEZE=RC1` |
| Fingerprint (antes e depois) | `38e70062857d` |
| Lições / temas de ensino | 134 / 113 |
| Escopo | bugfix + pedagogia de runtime + UX |

---

## MODALITY

### M-1 · "Monte a frase" debaixo de um objetivo de tom

**Evidência (QA).** Tela com objetivo `identificar 1º tom`, rótulo `PRODUÇÃO`,
enunciado `MONTE A FRASE`, banco `妈 / 一 / 人 / 木` e um botão `🎤 Falar`.
Nenhuma combinação dessas peças responde "identificar 1º tom".

**Causa raiz.** `genericFidelityBonus` (`src/data/topicMasteryBonus.ts`,
pass 3) montava um `sentence_build` a partir de `parts = [...hanzi]`. Quando o
núcleo do tema tem UM caractere, `parts` tem comprimento 1 — não há frase para
montar. O banco vinha de `uniqueOptions(..., ["一", "人", "木"])`, a mesma lista
de enchimento usada como distrator de múltipla escolha nas passes 1 e 2. Em
outras palavras: distratores de escolha viraram peças de montagem.

Reproduzido varrendo o plano real das 134 lições × 4 passes:
**26 lições** emitiam esse passo, todas na pass 3, entre elas
`p2-ma-primeiro-tom` (妈), `p2-ma-quarto-tom` (骂), `l5`, `l14`, `p4-num-123`
(一) e `l19-logica-ma`.

**Correção.** Reparo em runtime, em `src/data/masteryPilot.ts`
(`coherentBonusSteps`), e **não** no gerador: `topicMasteryBonus.ts` faz parte
da identidade congelada do currículo, e editá-lo mudaria o fingerprint. Com um
caractere só, a produção coerente é montar o próprio caractere (`hanzi_build`,
que tem fragmentos de verdade) ou dizê-lo (`reverse_recall`, que o gerador já
emite ao lado). O Phrase Builder simplesmente não entra.

`src/features/lesson/taskModalityCoherence.ts` guarda o contrato
SKILL → STEP KIND → AFFORDANCE e o requisito de três partes do Phrase Builder
(`productionTarget` + banco com sentido + resposta montável).

**Resultado.** Varredura pós-correção: **0 violações** em 445 passos de
montagem, nas 134 lições × 4 passes. Fingerprint inalterado.

**Regressão.** `validate:task-modality-coherence` (varre o plano real, não só
o contrato) · `test:task-modality-coherence` (5 mutações) ·
`e2e/rc1-1-learning-loop.spec.ts` → "a lição de tom nunca mostra 'Monte a frase'"
(assert no renderer `data-assembly-board`, não na copy).

### M-2 · Produção de tom por microfone sem avaliador acústico

**Evidência.** O mesmo passo oferecia `🎤 Falar` para uma tarefa de tom.

**Causa raiz.** Não existe avaliação acústica de contorno tonal no app; a
affordance de voz sugeria uma medição que não acontece.

**Correção.** `allowsSpeechScoring(skill, hasAcousticToneEvaluator)` recusa
score tonal por microfone enquanto não houver avaliador. Reconhecimento por voz
continua valendo para frase e lexema.

**Regressão.** `test:task-modality-coherence` → mutação
"tom volta a ser pontuado por microfone sem avaliador".

---

## AUDIO

### A-1 · A correção aparece escrita e não toca

**Evidência (QA).** Teste de módulo "Cortesia e despedida", item 2/15.
Resposta errada; a correção `再见 / zàijiàn / Até logo` aparece corretamente —
mas só escrita. O som, que é a parte que ensina o tom, dependia de o aluno
descobrir o botão.

**Causa raiz.** Nenhuma das três superfícies de feedback (revisão, teste de
módulo, atividades da lição) disparava áudio ao revelar a correção. O
`SpeakButton` existia, mas como ação manual.

**Correção.** `src/features/lesson/feedbackAudioPolicy.ts` concentra a decisão
(pura, sem React e sem Web Speech): dado alvo, resultado e preferências,
responde "tocar agora?" e por quê. Ligado nas três superfícies.

Regras que a política carrega:
- dedupe por `stepId + attemptId + outcome` — re-render não repete, e uma
  atividade de escuta que acabou de tocar não dispara a terceira vez;
- `mute` e `autoPlayAudio` vencem sempre;
- som de vitória nunca sobrepõe o feedback (P17);
- autoplay bloqueado (Safari sem gesto) não trava nada: o replay continua
  disponível, e é renderizado sempre, não como fallback de erro.

**Regressão.** `validate:feedback-audio` · `test:feedback-audio`
(7 mutações + exercício da função pura: mute, dedupe, sobreposição, ausência
de alvo mandarim).

### A-2 · O nome do aluno era apagado do alvo

**Evidência.** `我叫 Matheus。` chegava ao TTS como `我叫`.

**Causa raiz.** `mandarinSpeechText` tratava TODO latim de um texto com hànzì
como andaime visual. A regra é certa para `A: 谢谢！ B: ___` e errada para o
nome próprio dentro de uma frase que o aluno vai mesmo dizer.

**Correção.** Nomes declarados (nome do aluno + NPCs do catálogo, via
`speakableProperNames`) são falados — mas só quando o texto inteiro é
mandarim + nomes + pontuação. Basta sobrar uma palavra de interface para a
frase voltar a ser tratada como enunciado.

É essa condição, e não uma lista de palavras proibidas, que mantém copy PT/EN
fora do TTS por construção:

| Entrada | Saída |
| --- | --- |
| `我叫 Matheus。` | `我叫 Matheus` |
| `我叫Matheus。` | `我叫 Matheus` |
| `O que Matheus responde com 我叫Matheus?` | `我叫` |
| `Escolha abaixo: 你好` | `你好` |
| `A: 谢谢！ B: ___` | `谢谢！` |
| `nǐ hǎo` | `nǐ hǎo` |

**Regressão.** `test:feedback-audio` (payloads acima, um a um) ·
`test:mandarin-speech-text` (gate existente, mantido verde) ·
e2e "nenhum botão de áudio carrega copy de interface", via o novo
`data-audio-text` — o texto sanitizado que o TTS realmente receberia.

---

## ADVANCE / REVIEW

### R-1 · O item respondido voltava colado

**Evidência.** Responder o último item da revisão devolvia a mesma pergunta em
seguida.

**Causa raiz.** Errar empurra uma cópia de retry para o fim de
`queue = [...baseQueue, ...retryQueue]`. Estando no último item base,
`setPos(p => p + 1)` caía exatamente nessa cópia.

**Correção.** `nextQueuePosition` (em `taskFlowMachine.ts`) pula o item
recém-respondido **quando existe outro depois dele**. Quando o retry é a única
coisa que sobrou, ele continua sendo o último: adiar ali seria descartá-lo, não
espaçá-lo.

**Regressão.** `validate:review-advance` (exige `nextQueuePosition` na tela) ·
`test:review-advance` → mutação "item respondido volta colado na fila" ·
e2e "responder na revisão leva ao próximo item e encerra no último", que compara
`data-review-position` antes e depois.

### R-2 · Estado da tarefa derivado de booleans conflitantes

**Evidência.** Relato de revisão presa depois de responder: feedback na tela e
nenhum CTA óbvio.

**Causa raiz.** O fluxo vivia em booleans independentes (`revealed`,
`selected`, `exerciseCorrect`, `finished`). Nada impedia
`feedback && waitingForAnswer` ao mesmo tempo — e nesse estado nenhum CTA é o
CTA certo.

**Correção.** `src/features/lesson/taskFlowMachine.ts` formaliza
`idle → answered → feedback → advancing → completed` com transições explícitas,
`taskFlowCta()` (que CTA mostrar) e `assertTaskFlowInvariant()` (o estado
híbrido é recusado por construção). Inclui `CompletionLedger` para
idempotência e `completeLocalFirst` para a ordem persistir → UI → avançar →
sync.

**Regressão.** `validate:review-advance` · `test:review-advance`
(10 mutações, incluindo remoção do estado de feedback e do invariante).

### R-3 · Sync de nuvem no caminho da navegação

**Evidência.** Suspeita de que "Sincronizando progresso…" interferia no avanço.

**Causa raiz.** O `LessonPlayer` assinava `cloudSyncState` e a Victory exibia o
rótulo de sincronização, então o estado da nuvem participava do render da tela
de conclusão.

**Correção.** O player deixou de assinar `cloudSyncState` — não há mais como um
estado de nuvem participar da navegação. `resolveAdvanceDestination` não recebe
estado de sync na assinatura, de propósito.

**Regressão.** `test:review-advance` → mutação
"sync da nuvem volta a decidir a navegação" (o gate falha se o player voltar a
assinar `cloudSyncState`).

---

## PLUS

### P-1 · Tema "dominado" com média 2.0

**Evidência.** Quatro rodadas com 2★ cada fechavam o tema com "Tema dominado".

**Causa raiz.** `pathComplete` responde "4/4 rodadas?", que não é a mesma
pergunta que "o tema está fechado?". Não existia média das rodadas: apenas
`lessonStarsById`, que guarda a melhor estrela da lição inteira.

**Correção.** `topicPassStarsById` grava a estrela de CADA rodada (mesmo
contrato de best-stars: refazer melhora, nunca piora).
`topicAverageStars` faz a média aritmética das quatro; `<= 2.0` abre o
Reforço +. A média nunca sai de XP, que mistura ofensiva, liga e primeira
conclusão.

Três lugares da tela do tema ainda anunciavam domínio e foram corrigidos: o
rótulo da etapa, a linha do CTA e o selo ✓.

**Regressão.** `validate:adaptive-plus-round` (os cinco exemplos do contrato
verificados um a um) · `test:adaptive-plus-round` (10 mutações) ·
e2e "média 2.0 oferece Reforço + e o tema não é anunciado como dominado".

### P-2 · Remediação que repetiria a mesma pergunta

**Risco.** Uma sessão de reforço montada a partir da lista de erros tende a
devolver as mesmas perguntas — o que ensina a decorar a posição da alternativa,
não o conteúdo.

**Correção.** A escada de remediação em `plusRound.ts` escolhe SEMPRE outra
modalidade para o alvo que falhou (significado em múltipla escolha →
áudio/lacuna/pares; tom → outro item com a mesma distinção; hànzì →
áudio → hànzì → lacuna → uso em frase). `checkRemediationDiversity` recusa um
plano que seja clone dos erros.

**Regressão.** `validate:adaptive-remediation-diversity` ·
`test:adaptive-remediation-diversity` (4 mutações + a escada caso a caso).

---

## VICTORY

### V-1 · "Ponto forte: precisão de 20%"

**Evidência.** A tela elogiava como ponto forte um número que ela mesma exibia
ao lado como ruim.

**Causa raiz.** `buildLessonCompletionSummary` usava
`"Precisão de {n}%."` como **default** do destaque — sem nenhum piso.

**Correção.** O destaque agora exige evidência positiva real (≥ 70% de
precisão, ou sessão perfeita). Sem ela, a linha é uma constatação neutra
("Você concluiu a prática") e a tela não a rotula como "Ponto forte" —
`hasRealStrength` controla o rótulo.

O mesmo cuidado do outro lado: uma sessão ruim sem detalhe por habilidade
recebe um foco honesto ("Refaça esta prática antes de seguir") em vez de
inventar "tons" ou "hànzì" sem evidência.

**Regressão.** `validate:victory-minimalism` · `test:victory-minimalism`
(12 mutações) · e2e, que confere `data-victory-strength` contra a precisão
exibida.

### V-2 · Upsell, sync e segundo CTA na tela de conclusão

**Evidência.** A Victory carregava faixa de oferta Pro, rótulo de
sincronização e um CTA secundário de erros.

**Correção.** Saíram os três. A conclusão é recompensa emocional; Pro tem
superfícies próprias e o sync acontece em background. Sobrou: dragão, headline,
estrelas, XP, precisão, ≤1 destaque, ≤1 foco, 1 CTA.

**Regressão.** `test:victory-minimalism` → mutações "volta a mostrar oferta
Pro", "volta a mostrar estado de sincronização", "ganha um segundo CTA
primário", "volta a ter CTA secundário de erros" · e2e, que verifica contagem
de elementos e ausência das sete copies proibidas.

**Consequência encontrada pelo `validate:beta`.** Remover o rótulo de
sincronização deixou o catálogo `player.save*` sem nenhum consumidor, e
`validate:en-core-surfaces` falhou por isso — ele exigia `player.saveLocalDevice`
dentro do `LessonPlayer`.

Apagar a informação seria a resposta errada: o aluno continua precisando saber
onde o progresso dele está; o que estava errado era mostrar isso por cima da
celebração. O catálogo passou para a tela de **Conta**, que é onde essa
pergunta é feita, e a âncora do gate seguiu a informação em vez de exigir que
ela voltasse para a tela errada. De quebra, `ContaPage` deixou de duplicar a
mesma copy em pt-BR embutida — PT e EN saem do mesmo catálogo agora.

---

## MOBILE

### B-1 · Alcance do CTA em 390×844

**Verificado.** Região de ação visível dentro da viewport e sem rolagem
horizontal, no player e no card de Reforço +.

**Regressão.** e2e `RC1.1 · mobile` (dois testes em 390×844) ·
`validate:review-advance` exige que o CTA da revisão continue sticky.

---

## Fora do escopo desta remessa

`e2e/topic-mastery-hardening.spec.ts › forward do navegador não muda mastery`
falha por timeout em `page.goForward()`. Reproduzido em worktree do commit base
`c47860f` com falha idêntica — é anterior ao RC1.1 e não foi tocado aqui.
