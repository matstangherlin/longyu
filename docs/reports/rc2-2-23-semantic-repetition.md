# RC2.2.23 — Repetição semântica

Bug: `REVIEW_SEMANTIC_REPETITION` — P2, OPEN (conteúdo congelado).

A RC2.2.22 não achava repetição ruim porque olhava o ID do passo; o owner sente repetição. A RC2.2.23 mede o que o aluno percebe: `semanticTargetKey` (o mesmo 你好 em qualquer domínio), `cognitiveOperation` (OUVIR, RECONHECER, DISCRIMINAR, RECORDAR, PRODUZIR, MONTAR, USAR EM CONTEXTO), `interactionFamily` e `contextKey`. Cada reaparição vira TRANSFORMED (outra operação/contexto), INTERLEAVED (outros alvos entre eles) ou REDUNDANT (mesmo alvo+operação+contexto dentro da janela de 3).

## OBSERVED (auditoria das 20 primeiras sessões — `docs/reports/rc2-2-23-semantic-repetition.json`)

- 20 sessões: 1 REDUNDANT, 58 TRANSFORMED, 0 INTERLEAVED.
- **Sessões dominadas por um alvo: [5, 6, 16]** (ex.: 你好 em 5/7 e 6/7 dos passos de prática; 你 em 4/7).
- Sessões limpas: 17/20. "Limpo" **nunca** é declarado com saturação ou domínio.

## Correção (apresentação, mesmo SRS)

- Revisão: no máximo 2 aparições do mesmo alvo por rodada de 5–8; 3 só com remediação explícita após erro. O excedente vai para a rodada seguinte — nada sai da fila do SRS (`capTargetPerRound`).

## NOT_TESTED / pendente

- Sessões 5, 6 e 16 são conteúdo autoral congelado: ficam registradas como bug; esta onda não edita lições (fingerprint c48b008c9c1e).
