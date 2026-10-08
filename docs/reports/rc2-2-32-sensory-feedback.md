# RC2.2.32 — Sensory Feedback

**Status:** `CODE_READY` · `PHYSICAL_OWNER_PASS: NOT_RUN`

## Fonte da verdade

- Implementação: `src/lib/haptics.ts` + `nativeHaptics.ts`
- Matriz: `src/lib/sensoryFeedbackMatrix.ts` → `SENSORY_FEEDBACK_MATRIX`
- Preferência: `hapticsEnabled` (default true); `false` desliga **tudo**

## Matriz (resumo)

| Evento | Visual | Som | Haptic | Duração | Frequência |
|---|---|---|---|---:|---|
| selection | highlight leve | opcional | impactLight | ~40ms | 1/gesto |
| piecePlaced | snap | pieceSelect | impactLight | ~50ms | 1/peça |
| answerCorrect | positivo curto | success | success | ~120ms | 1/resposta |
| answerWrong | claro, sem punição | error | warning | ~120ms | 1/resposta |
| practiceComplete | animação curta | success | success | ~200ms | 1/atividade |
| lessonComplete | cerimônia | completion | success | ~400ms | 1/lição |
| achievementReveal | medalha/marco | achievement | impactMedium | ~300ms | 1/conquista |
| scroll / nav / openScreen / playAudio | — | — | **nunca** | 0 | proibido |

## Distribuição auditada

| Superfície | Haptic |
|---|---|
| HanziBuilder | piece / correct / wrong |
| ToneTrace | selection / piecePlaced |
| LessonPlayer / victory | correct / wrong / complete |
| Guided Try | via fluxos existentes |
| Guidance unlock reveal | achievementReveal (host) |

## Preferência off

`hapticsEnabled === false` → `haptic()` retorna imediatamente (nenhuma chamada nativa).

## Prova física Android

- [ ] Acerto vibra diferente de erro  
- [ ] Peça de Hànzì coloca com snap + haptic leve  
- [ ] Scroll/navegação **não** vibram  
- [ ] Com haptic desligado em Ajustes, nada vibra  
