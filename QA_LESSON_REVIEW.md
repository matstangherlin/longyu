# QA - Revisão, estrelas e desbloqueio da Jornada

## Regras esperadas

| Regra | Implementação |
|-------|----------------|
| Lição perfeita | 3 estrelas (`computeLessonStars`, sem `hadMistakes`) |
| Lição com erro | Máximo 2 estrelas (`hadMistakes: true`) |
| Revisão imediata corrige tudo | Recupera 3 estrelas + `completeLesson` |
| Recuperou 3 estrelas | Próxima lição libera (`canStartLesson`) |
| Errou revisão imediata | Mantém 2 estrelas |
| Saiu sem revisar | Mantém 2 estrelas; erros persistem na tentativa |
| Revisão global (`/revisao`) | Não altera `lessonStarsById` |
| Revisão de módulo (`isReview`) | Passa com 80% (`MODULE_REVIEW_PASS_ACCURACY`) |
| Teste de pular módulo | Exige 90% (`EXAM_PASS_RATIO`) |

## Validação automatizada

```bash
npm run validate:lesson-recovery
npm run validate:beta
```

Arquivos centrais: `LessonPlayer.tsx`, `immediateRemediation.ts`, `lessonStarRules.ts`, `lessonAttemptReview.ts`, `store.ts`, `lessonTasks.ts`, `RevisaoPage.tsx`, `ModuleChallengePage.tsx`, `examBuilder.ts`.

## Modo DEV

Em desenvolvimento, ative no console:

```js
localStorage.setItem("longyu:lesson-recovery-debug", "1")
```

O player mostra `lessonId`, estrelas, erros pendentes/recuperados e status da próxima lição. Para desligar:

```js
localStorage.removeItem("longyu:lesson-recovery-debug")
```

Inspeção programática (só DEV):

```js
window.__longyuLessonRecoveryQa.summary()
```

## Checklist manual

| ID | Cenário | Resultado esperado | Observado | Status | Notas |
|----|---------|-------------------|-----------|--------|-------|
| A | Erro em múltipla escolha | 2 estrelas → revisão → 3 estrelas + desbloqueio | — | Pendente manual | `choice` em `immediateRemediation.ts` |
| B | Erro em `match_pairs` | Só o par errado na revisão | — | Verificado no código | `createPairMatchActivityError` grava `hanzi`, `pinyin`, `expected`, `userAnswer` por par |
| C | Erro em `tone_pair` | Revisão com áudio; sem pinyin antes da resposta | — | Verificado no código | `listen` + `pinyinWouldCueAnswer` |
| D | Erro em pinyin | Mesmo hànzì; pinyin só no feedback | — | Verificado no código | `pinyin` kind |
| E | Erro em hànzì (`recognize`/`hanzi_build`) | Mesmo item na revisão | — | Verificado no código | `hanzi` / `build` |
| F | Erro em `sentence_build` | Peças remontadas; sem gabarito pré-preenchido | — | Verificado no código | `build` + `seededOrder` |
| G | Erro em `fill_blank` | Mesma lacuna e distratores | — | Verificado no código | `blank` kind |
| H | Erro em `dialogue_choice` | Mesma decisão comunicativa | — | Verificado no código | `choice` kind |
| I | Erro em `listen_select` | Mesmo áudio; resposta após seleção | — | Verificado no código | `listen` kind |
| J | Sair antes de revisar | 2 estrelas; próxima bloqueada com mensagem humana | — | Verificado no código | `canStartLesson` + `lessonStarsById` |
| K | Recarregar antes de revisar | 2 estrelas persistem; sem desbloqueio acidental | — | Verificado no código | `finishLessonAttempt` persiste estrelas |
| L | Voltar depois e revisar | Oferta de revisão restaurada da última tentativa | — | Verificado no código | `getPendingAttemptReview` |
| M | Corrigir todos os erros | Uma recuperação; sem duplicar Qi/XP/missão | — | Verificado no código | `recoveryAppliedRef` + `claimReward` idempotente |
| N | Errar revisão imediata | Mantém 2 estrelas; mensagem de retry | — | Verificado no código | `ImmediateErrorReviewSummary` |
| O | Revisão global | Estrelas da Jornada inalteradas | — | Verificado no código | `RevisaoPage` não chama `setLessonStars` |
| P | Revisão de módulo 80% | Passa com ≥80% | — | Automatizado | `validate:lesson-recovery` |
| Q | Teste pular módulo 90% | Passa com ≥90% | — | Automatizado | `EXAM_PASS_RATIO` em `examBuilder.ts` |
| R | Trocar conta local | Tentativas/estrelas isoladas por conta | — | Pendente manual | `saveCurrentAccount` por perfil |
| S | `decompose` | Instrucional; sem revisão imediata | — | Esperado | Não é step avaliado (`GRADED_STEP_KINDS`) |
| T | `microread` | Instrucional; sem revisão imediata | — | Esperado | Não é step avaliado |

## Tipos de exercício × revisão imediata

| Tipo | Revisão | Gabarito antes da resposta? |
|------|---------|----------------------------|
| `multiple_choice` / `comprehend` | `choice` | Não |
| `match_pairs` | `pair` (par único) | Não |
| `tone_pair` | `listen` | Não (pinyin oculto até feedback) |
| `sentence_build` | `build` | Não |
| `translation_build` | `build` | Não |
| `fill_blank` | `blank` | Não |
| `dialogue_choice` | `choice` | Não |
| `listen_select` | `listen` | Não |
| `tone` | `tone` | Não |
| `pinyin` (via diálogo/escolha) | `pinyin` | Não |
| `hanzi_build` | `build` | Não |
| `recognize` | `hanzi` | Não |
| `decompose` | — | N/A (não avaliado) |
| `microread` | — | N/A (não avaliado) |

## Exemplo de erro de par (木)

Esperado no registro:

```
hanzi: 木
pinyin: mù
expected: árvore / madeira
userAnswer: pessoa
```

Não salvar string da tabela inteira (`木 = … | 人 = …`).

## Persistência

- `lessonStarsById` — estrelas por lição
- `lessonAttemptsById` — tentativas com `mistakes` / `recoveredMistakes`
- `recentActivityErrors` — erros para SRS global (não alteram estrelas)
- Revisão imediata usa **somente** `activityErrorsRef` da tentativa atual (ou restauração via `lessonAttemptReview.ts`)
