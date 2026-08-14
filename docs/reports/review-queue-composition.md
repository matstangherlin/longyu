# Composição da fila de revisão (REVIEW-023)

Gerado por `npm run report:review-queue`.

Reproduz a conta do QA real: "Revisar 260 itens" ainda na Fase 1 · Unidade 2.

## Fase 1 · Unidade 1+2 (ponto da captura)

- lições simuladas: **15**
- **total exibido hoje: 301**
- memórias-alvo distintas (item, ignorando domínio): **43**
- entradas de domínio NUNCA praticado: **258** (86%)
- se a fila contasse só o domínio praticado: **43**
- itens sem entrada no banco (órfãos): **0**

| domínio | entradas |
| --- | ---: |
| fala | 43 |
| som | 43 |
| pinyin | 43 |
| uso | 43 |
| leitura | 43 |
| forma | 43 |
| significado | 43 |

| tipo | entradas |
| --- | ---: |
| char | 203 |
| chunk | 98 |

## Primeiras 10 lições

- lições simuladas: **10**
- **total exibido hoje: 203**
- memórias-alvo distintas (item, ignorando domínio): **29**
- entradas de domínio NUNCA praticado: **174** (86%)
- se a fila contasse só o domínio praticado: **29**
- itens sem entrada no banco (órfãos): **0**

| domínio | entradas |
| --- | ---: |
| fala | 29 |
| som | 29 |
| pinyin | 29 |
| uso | 29 |
| leitura | 29 |
| forma | 29 |
| significado | 29 |

| tipo | entradas |
| --- | ---: |
| char | 147 |
| chunk | 56 |

## Primeiras 20 lições

- lições simuladas: **20**
- **total exibido hoje: 301**
- memórias-alvo distintas (item, ignorando domínio): **43**
- entradas de domínio NUNCA praticado: **258** (86%)
- se a fila contasse só o domínio praticado: **43**
- itens sem entrada no banco (órfãos): **0**

| domínio | entradas |
| --- | ---: |
| fala | 43 |
| som | 43 |
| pinyin | 43 |
| uso | 43 |
| leitura | 43 |
| forma | 43 |
| significado | 43 |

| tipo | entradas |
| --- | ---: |
| char | 203 |
| chunk | 98 |

## Depois da correção (REVIEW-024)

`gradeReviewDomain` passou a chamar `ensureSrs` apenas para o domínio efetivamente avaliado. A coluna "só o domínio praticado" acima é o novo comportamento: na Fase 1 · Unidade 2 a fila cai de 301 para 43 entradas — uma por memória-alvo real, como o aluno espera.

## Leitura

A chave do SRS inclui o domínio (`makeKey(type, itemId, reviewDomain)`), e `gradeReviewDomain` chama `ensureSrs` para TODOS os domínios do tipo — 7 para chunk e char — sempre que qualquer um é avaliado. Praticar 你好 uma vez cria sete entradas; seis nunca tiveram evento pedagógico de aquisição.

Por isso o total cresce ~7× mais rápido que o vocabulário real. Nenhum item vem do Atlas, de distractors ou de combinações geradas: a inflação é toda de domínios não praticados do próprio vocabulário ensinado (REVIEW-024).
