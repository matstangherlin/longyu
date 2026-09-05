# V4.9.3 — as 20 primeiras sessões como experiência

Gerado por `npm run validate:first20-instruction-order`. Cada linha é uma
sessão do aluno, não um teste: o que ele recebe, o que lhe é pedido, e com
quanto apoio.

## Métricas

- first20SessionsAudited: 20
- surpriseGradedTasks: 0
- firstInstructionAfterFirstGrade: 0
- foundationUnknownTargets: 0
- foundationCognitiveLoadViolations: 0
- coreInstructionSlots: 5
- foundationCapsules: 5
- firstMeaningfulWinSession: 1

## Sessão a sessão

| # | tópico | pass | aula recebida | ensinado | perguntado | assumido | scaffold | carga | produção |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | p1-o-que-e-mandarim | M1 | instruction:foundation:mandarin | 5 | 5 | — | 4/4 | 0 | RECEPTIVE |
| 2 | p1-o-que-e-mandarim | M2 | — | 3 | 5 | — | 5/5 | 0 | RECEPTIVE |
| 3 | p1-o-que-e-mandarim | M3 | — | 3 | 5 | — | 5/5 | 0 | PRODUCTIVE |
| 4 | p1-o-que-e-mandarim | M4 | — | 0 | 5 | — | 5/5 | 0 | RECEPTIVE |
| 5 | p1-o-que-e-pinyin | M1 | instruction:foundation:pinyin | 4 | 4 | — | 5/5 | 0 | RECEPTIVE |
| 6 | p1-o-que-e-pinyin | M2 | — | 2 | 4 | — | 6/6 | 0 | RECEPTIVE |
| 7 | p1-o-que-e-pinyin | M3 | — | 2 | 4 | — | 5/5 | 0 | RECEPTIVE |
| 8 | p1-o-que-e-pinyin | M4 | — | 2 | 4 | — | 6/6 | 0 | RECEPTIVE |
| 9 | p1-o-que-e-tom | M1 | instruction:foundation:tone | 7 | 5 | — | 4/4 | 0 | RECEPTIVE |
| 10 | p1-o-que-e-tom | M2 | — | 6 | 5 | — | 4/4 | 0 | RECEPTIVE |
| 11 | p1-o-que-e-tom | M3 | — | 5 | 9 | — | 5/5 | 0 | RECEPTIVE |
| 12 | p1-o-que-e-tom | M4 | — | 4 | 9 | — | 5/5 | 0 | RECEPTIVE |
| 13 | p1-o-que-e-hanzi | M1 | instruction:foundation:hanzi | 4 | 4 | — | 5/5 | 0 | RECEPTIVE |
| 14 | p1-o-que-e-hanzi | M2 | — | 4 | 4 | — | 5/5 | 0 | RECEPTIVE |
| 15 | p1-o-que-e-hanzi | M3 | — | 3 | 4 | — | 5/5 | 0 | PRODUCTIVE |
| 16 | p1-o-que-e-hanzi | M4 | — | 4 | 4 | — | 6/6 | 0 | RECEPTIVE |
| 17 | p1-primeiros-hanzi | M1 | instruction:foundation:hanzi-components | 3 | 3 | — | 2/2 | 0 | PRODUCTIVE |
| 18 | p1-primeiros-hanzi | M2 | — | 3 | 3 | — | 3/3 | 0 | PRODUCTIVE |
| 19 | p1-primeiros-hanzi | M3 | — | 4 | 5 | — | 4/4 | 0 | PRODUCTIVE |
| 20 | p1-primeiros-hanzi | M4 | — | 5 | 5 | — | 5/5 | 0 | PRODUCTIVE |

## O que cada coluna quer dizer

- **aula recebida**: o `CoreInstructionSlot` que abre a sessão, quando há.
- **assumido**: alvos cobrados sem instrução nem exposição anterior. É a
  coluna que precisa ficar vazia — cada item aqui é uma surpresa.
- **scaffold**: tarefas avaliadas com apoio, sobre o total de avaliadas.
- **carga**: maior número de dificuldades estreando numa mesma tarefa
  avaliada. Acima de 1, o aluno não sabe qual delas errou.

