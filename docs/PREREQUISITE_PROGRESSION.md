# validate:prerequisite-progression

Portão pedagógico unificado: impede que atividades avançadas apareçam antes dos pré-requisitos reais.

```bash
npm run validate:prerequisite-progression
```

Relatório: `reports/prerequisite-progression-report.md`  
Incluído em `validate:beta`.

## Regras

| # | Regra |
|---|--------|
| 1 | `transfer_task` só após exposição + completion\|build + guided production |
| 2 | `free_production` só após exposição + completion\|build |
| 3 | `sentence_build` não usa estrutura ainda não apresentada |
| 4 | sujeito/verbo/objeto/partícula só após `introducedAt` (UI pré-resposta) |
| 5 | glifo/conceito novo não é cobrado sem apresentação apoiada |
| 6 | 1ª ocorrência de estrutura tem scaffold adequado |
| 7 | não salta recognize → free production |
| 8 | não salta vocabulary exposure → transfer |
| 9 | L1–L20 respeitam onboarding |
| 10 | atividade só exige glifos/prereqs já disponíveis naquele ponto |

## Relatório

Colunas: **lesson · step · activity · missing prerequisite · required previous experience**.

As regras usam os gates reais (`canTransferStructure`, `canGuidedProduceStructure`, `STRUCTURAL_CONCEPTS`, planos de `lessonRoundStepsFor`) — sem mínimos artificiais só para passar.
