# B002 — Auditoria final (main pós-#148)

**Data:** 2026-08-12  
**Tip `main`:** `3622885` (#148)  
**Escopo:** remediação imediata pós-erro e recuperação da 3ª estrela **dentro do Lesson Player** (`immediateRemediation.ts` → `LessonPlayer.tsx`).

> **Automação não substitui QA humano.** Esta auditoria confirma proteção técnica em código e CI. B002 só fecha no [`BETA_BUG_LOG.md`](./BETA_BUG_LOG.md) após revalidação humana no app.

## Problema original (B002)

Na revisão pós-erro / recuperação de estrela podia aparecer:

- múltiplas frases concatenadas (`你好 / 你好吗 / …`);
- pinyin gigante desalinhado;
- status de pulo (“Pulou…”) como alternativa;
- resposta correta inconsistente com prompt/hanzi/significado.

## Garantias verificadas

| # | Garantia | Mecanismo principal |
|---|----------|---------------------|
| 1 | Um único alvo por item | `singleTargetHanzi`, `errorHanziForStep` (LessonPlayer) |
| 2 | Hanzi e pinyin do mesmo alvo | `pinyinForSinglePhrase`, `cleanDisplay` |
| 3 | Significado do mesmo alvo | `coherentMeaning` |
| 4 | Nenhum array concatenado como prompt | `isConcatenatedDump`, `cleanDisplay`, `situationalDisplay` |
| 5 | “Pulou…” nunca vira alternativa | `isNonOptionAnswer`, `buildChoiceOptions`, `buildPieces` |
| 6 | Restore/reload mantém o mesmo item | `activityErrorFromMistake`, `getPendingAttemptReview` |
| 7 | Sentence build usa PieceAssembly | `ErrorReviewQuestion` → `PieceAssemblyBoard/Tray/Bank` |
| 8 | Revisão não pega resposta de outro step | opções/peças do `error.step` + `correctAnswer` do erro |
| 9 | Medalhas/modais não cobrem revisão | `holdAchievementModals` durante offer/review/summary |
| 10 | Recuperação da 3ª estrela | `canRecoverStar`, `applyAttemptRecovery`, `markErrorCorrected` |

## Caminhos auditados (Lesson Player)

| Caminho | Protegido | Kind de remediação | Teste unitário | E2E player |
|---------|:---------:|-------------------|:--------------:|:----------:|
| `choice` (fallback) | ✅ | `choice` | via diálogo/cena | parcial |
| `dialogue_choice` | ✅ | `choice` (forçado) | ✅ | ✅ |
| `conversation_scene` | ✅ | `choice` (forçado) | ✅ | ✅ |
| `sentence_build` | ✅ | `build` | ✅ | ✅ |
| `free_production` | ✅ | `build` | ✅ | — |
| `transfer_task` | ✅ | `build` | ✅ | transfer UI only |
| `listen_select` | ✅ | `listen` | ✅ | — |
| `recognize` | ✅ | `hanzi` | ✅ | — |
| Item pulado (penalidade) | ✅ | conforme tipo | ✅ (status filtrado) | ✅ |
| Erro restaurado após reload | ✅ | conforme tipo | ✅ | ✅ |
| Recuperação 3ª estrela | ✅ | — | ✅ (dados) | ✅ |

### Nota: pulo com Fôlego

Pular com **Fôlego** não entra na fila de remediação imediata (SRS / `lessonPendingStars`). Comportamento intencional — distinto de erro com penalidade ou resposta incorreta.

### Nota: `/revisao` (hub Pro)

O hub [`/revisao?modo=erros`](./BETA_HUMAN_QA_RUNBOOK.md) usa `reviewExerciseBuilder.ts` e UI própria — **fora** do pipeline B002 do player. Coberto por `e2e/review-remediation.spec.ts`, não por PieceAssembly do player.

## Onde está a proteção (referência)

- **Construção do exercício de revisão:** `src/features/lesson/immediateRemediation.ts`
- **UI + PieceAssembly + estrela:** `src/features/lesson/LessonPlayer.tsx`
- **Reload 2★ pendente:** `src/features/lesson/lessonAttemptReview.ts`
- **Copy acolhedora:** `src/features/lesson/reviewCopy.ts`

## Testes executados (auditoria 2026-08-12)

```bash
npm run test:immediate-remediation   # ✅
npm run test:review-ux               # ✅
npm run test:assembly-ux             # ✅
npm run test:qa-regression-guard     # ✅
npm run validate:lesson-recovery     # ✅
npx playwright test e2e/review-remediation.spec.ts e2e/qa-regression-guard.spec.ts --project=chromium  # ✅ 7/7
```

## Veredito

**B002 está tecnicamente protegido na `main` pós-#148** para todos os caminhos listados no player. Regressões são bloqueadas pelos scripts acima.

**B002 permanece aberto para RC** até QA humano confirmar no app real (ver checklists em [`BETA_BUG_LOG.md`](./BETA_BUG_LOG.md#checklist-de-revalidação-b002-revisão--estrela)).

## Lacunas aceitas (não bloqueiam veredito técnico)

- E2E player para `listen_select`, `recognize`, `free_production` em `[data-review-question]` — cobertura unitária existe; E2E foca diálogo/build/estrela.
- Recuperação com **múltiplos erros** na mesma tentativa — lógica em `applyAttemptRecovery` (todos corrigidos); sem E2E multi-erro dedicado.
- `/revisao` hub — pipeline separado; B002 do player não se aplica literalmente.
