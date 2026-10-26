# Lint de conteúdo

Comando: `npm run lint:content`. Na máquina deste agente o scan das 134 lições, nos 4 passes, terminou em **49,6 s**. Exit 0 com a linha de base. Exit 1 se aparecer violação nova, se sobrar entrada obsoleta, ou se as fases `p1` e `p2` tiverem qualquer violação.

O texto de CL001–CL003 é o que o aluno lê: o mesmo `polishLearnerText` do prompt 09, com "Matheus" trocado por Lucas. `..` que esse corretor já remove não conta. `..` que ainda apareceria na tela conta.

## Regras

| ID | O que pega | Como corrigir |
|---|---|---|
| CL001-double-punctuation | `..`, `.?`, `?.` no enunciado. `...` fica. | Tirar o ponto extra. `joinSentence` em `src/lib/text/learnerCopy.ts`. |
| CL002-unresolved-placeholder | `{nome}`, `{name}`, `TODO`, `FIXME`, `???`, "meu nome é você", "Aluno local". `todo o tempo` não entra. | Trocar pelo nome real ou por Lucas. |
| CL003-choice-prompt-not-question | Escolha sem `?`, sem verbo (qual, como, escolha, ouça, reconheça, quer, monte) e sem reticências de completar. | Reescrever como pergunta ou instrução. |
| CL004-unassemblable-target | `sentence_build` / `reverse_recall`: algum hànzì da resposta não está nas peças. `fill_blank`: a lacuna não está no banco. | Incluir a peça, como o 好 de 你好. |
| CL005-hanzi-before-intro | Resposta de um só hànzì antes da lição em que esse hànzì entra no foco. | Ensinar antes, ou registrar em `scripts/lint-content.exceptions.json` com motivo. |
| CL006-runtime-validator-reject | `validateExercise` rejeita a etapa (é a etapa que o player pula). | Corrigir opções, resposta ou tipo. |
| CL007-evaluated-step-without-review-target | Etapa com hànzì em que `reviewTargetsForMistake` não produz alvo nem se tudo já foi ensinado. | O prompt 21 trata o buraco. Não mudar a função neste lint. |
| CL008-unknown-component | `components` de um caractere não é radical nem outro caractere. | Cadastrar o radical ou tirar o id. |

## Fases 1 e 2

Zero violações nas oito regras. Exceções explícitas, que não entram na contagem:

- Glifo `吗` na escuta de tom: a partícula já aparece em 你好吗.
- Cinco `audio_to_action` (`l2`, `l4`, `p1-ate-logo`, `p1-qingwen-cortesia`, `p3-wohenhao`): o extrator ainda não tem ramo para esse tipo. A lista é fechada. Uma etapa nova desse tipo nas fases 1–2 falha o lint.

## Dívida nas fases 3+

62 entradas em `scripts/lint-content.baseline.json`. Nenhuma é `p1` ou `p2`.

| Regra | p3 | p4 | p5 | p6 | p7 | Total |
|---|---:|---:|---:|---:|---:|---:|
| CL001 | 0 | 0 | 0 | 0 | 0 | 0 |
| CL002 | 0 | 0 | 0 | 0 | 0 | 0 |
| CL003 | 1 | 0 | 0 | 5 | 0 | 6 |
| CL004 | 1 | 0 | 2 | 0 | 1 | 4 |
| CL005 | 0 | 0 | 0 | 4 | 0 | 4 |
| CL006 | 0 | 2 | 0 | 0 | 0 | 2 |
| CL007 | 10 | 2 | 5 | 23 | 6 | 46 |
| CL008 | 0 | 0 | 0 | 0 | 0 | 0 |

A meta da R-16, no fim da Onda 2, é esta tabela vazia. Os prompts 21, 25 e 27 reduzem CL005, CL007 e CL008. Este comando não corrige essa dívida.

## Linha de base

`npm run lint:content -- --update-baseline` só apaga entrada que já não ocorre. Não adiciona.

`npm run lint:content -- --update-baseline --allow-grow` registra violação nova. O CI (`CI` definido) recusa `--allow-grow`.

Uma entrada de `p1` ou `p2` na linha de base também falha. Não dá para esconder regressão das primeiras fases.

`--json` imprime o resumo para o rastreador.
