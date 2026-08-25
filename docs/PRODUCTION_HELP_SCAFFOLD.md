# Scaffolding progressivo de produção / transferência (níveis 0–4)

Não transforma transferência em múltipla escolha. O aluno forte responde sem andaime; quem trava pede ajuda opcional. Usar ajuda é telemetrado e não custa vida/estrela.

| Nível | O que aparece |
|------:|---------------|
| 0 | Situação + input |
| 1 | Padrão `你要 ___ 吗？` |
| 2 | Estrutura visual `你 \| 要 \| ___ \| 吗` + rótulos |
| 3 | Poucas palavras úteis já aprendidas (não monta a frase) |
| 4 | Sentence build — só após dificuldade repetida |

## Nível inicial

- transferência (incl. 1ª da estrutura) → **0** (V4.6: sem vazar o alvo)
- free guiada → **1**
- open → **0**

Na transferência, o scaffold honesto (âncora + componente + desafio) aparece no nível 0.
O alvo completo / transformação `from → to` só no nível **≥ 3** (ajuda explícita), após erro, ou no feedback pós-resposta.

## Pós-erro

- 1º erro → libera até nível **3** (vocabulário)
- 2º+ erros → libera nível **4** (montagem)
- Pedir dica permanece opcional (`Preciso de uma dica`)

A revisão imediata de `free_production` / `transfer_task` já usa montagem (`immediateRemediation`) — mais apoio do que a tentativa original.

## Código

- `src/data/productionHelp.ts` — plano, unlock, labels
- `StepFreeProduction` — UI progressiva
- evento `production_help_requested` (+ metadados em `exercise_answered` / `exercise_mistake`)
- `npm run test:production-help`
