# Conceitos estruturais e rótulos de UI

## Problema

A interface podia mostrar **sujeito / verbo / objeto / partícula** antes de o curso ensinar esses conceitos — virando teste de gramática prévia.

## Introdução gradual (antes dos rótulos)

Ver `docs/SENTENCE_STRUCTURE_INTRO.md` e `src/data/sentenceStructureIntro.ts`.

Resumo: lógica visual em `p3-ordem-das-palavras` (etapas 1–3) → nomes em `p3-nomes-da-frase` (etapa 4) → termos técnicos nas atividades a partir de `l5-rev` (etapa 5). Reforço 我要… em `l26b`.

## Política de rótulos na UI

| Estágio | Quando | Exemplo |
|---------|--------|---------|
| intuitivo | antes de `introducedAt` | quem · ação · coisa · pergunta |
| pareado | intro → prática | quem (sujeito) · ação (verbo) |
| técnico | depois de `practicedAt` | sujeito · verbo · objeto |

Catálogo: `src/data/structuralConcepts.ts`  
Cada conceito tem `introducedAt`, `practicedAt`, `masteryRequiredFor`, `usedByFrames`.

Para sujeito/verbo/objeto/ordem/吗: `introducedAt` = `p3-nomes-da-frase`.

## UI

`PatternSlotScaffold` (produção guiada) e o breakdown sob demanda da transferência
(`Ver como a frase funciona`) resolvem rótulos com `formatConceptLabel` /
`resolveSlotLabel(..., { lessonId, frameId })`.  
`LessonPlayer` passa `lessonId` ao `StepRenderer`.

## Validação

`npm run validate:structural-concepts` → `reports/structural-concepts-report.md`

Garante:
1. ids de intro/prática existem na jornada;
2. nenhum passo autoral usa termo técnico **antes** da intro;
3. rótulos gerados no plano real batem com o estágio (intuitivo / pareado / técnico);
4. etapas 1–5 de `SENTENCE_STRUCTURE_INTRO` apontam para lições existentes.
