# Conceitos estruturais e rótulos de UI

## Problema

A interface podia mostrar **sujeito / verbo / objeto / partícula** antes de o curso ensinar esses conceitos — virando teste de gramática prévia.

## Política

| Estágio | Quando | Exemplo |
|---------|--------|---------|
| intuitivo | antes de `introducedAt` | quem · ação · coisa · pergunta |
| pareado | intro → prática | quem (sujeito) · ação (verbo) |
| técnico | depois de `practicedAt` | sujeito · verbo · objeto |

Catálogo: `src/data/structuralConcepts.ts`  
Cada conceito tem `introducedAt`, `practicedAt`, `masteryRequiredFor`, `usedByFrames`.

## UI

`PatternSlotScaffold` resolve rótulos com `resolveSlotLabel(..., { lessonId, frameId })`.  
`LessonPlayer` passa `lessonId` ao `StepRenderer`.

## Validação

`npm run validate:structural-concepts` → `reports/structural-concepts-report.md`

Garante:
1. ids de intro/prática existem na jornada;
2. nenhum passo autoral usa termo técnico **antes** da intro;
3. rótulos gerados no plano real batem com o estágio (intuitivo / pareado / técnico).
