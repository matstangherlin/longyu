# RC2.3.13C — Learning flow cognitive polish

## Principle

One moment = one dominant action. Reduce interface decisions; preserve learning decisions.

## Flows

### Listen → Continue

| | |
| --- | --- |
| **Before** | Continuar often equal weight to Ouvir; disabled Continuar without reason |
| **Problem** | Hick + mystery grey button |
| **Principle** | Fitts + disabled explainability |
| **Change** | Ouvir primary until heard; Continuar secondary + `listenFirstToContinue`; escape tertiary; tech failure marked `data-tech-failure` |
| **Evidence** | `steps.tsx` guided listen; gate kills 1–3 |

### Guided Try dock

| | |
| --- | --- |
| **Before** | Continuar disabled without copy |
| **Change** | Reason lines for listen / answer / build; `data-learning-flow="rc2-3-13c"`; hierarchy on dock CTA |
| **Evidence** | `GuidedTryPage.tsx` |

### Speech

| | |
| --- | --- |
| **Before** | Record / escape unmarked hierarchy |
| **Change** | Gravar/Stop primary; cannot-speak tertiary; mic settings primary when denied; fallback options preserved as non-penalty |
| **Evidence** | `PronunciationPractice.tsx`, `SelfComparePractice.tsx` |

### Review hub

| | |
| --- | --- |
| **Before** | Começar revisão unmarked |
| **Change** | `data-cta-hierarchy="primary"` + min-h-12 |
| **Evidence** | `RevisaoPage.tsx` |

### Completion

| | |
| --- | --- |
| **Before** | Already one primary; ability-first |
| **Change** | Explicit `data-cta-hierarchy` on victory primary; culture skip tertiary; gate forbids Store/League in victory actions |
| **Evidence** | `LessonVictory.tsx` |

### Conversation

| | |
| --- | --- |
| **Before** | Guided mode hid turn progress; phase not labeled; advance CTA unmarked |
| **Problem** | Invisible progression / Hick on check vs continue |
| **Principle** | Progressive disclosure + one primary |
| **Change** | `ConversationPhaseChrome` (Ouvindo… / Sua vez / Processando… + Fala N de M); `data-conversation-phase`; advance/check/continue hierarchy |
| **Evidence** | `ConversationSceneStep.tsx`; gate kills 25–26 |

### Hànzì

| | |
| --- | --- |
| **Before** | Stage unlabeled; canvas min 220; tools equal to task |
| **Change** | Single `STAGE_LABEL_PT` label; canvas ≥248 + `touch-action: none`; tools secondary; tech failure non-penalty copy |
| **Evidence** | `HanziWritingExercise.tsx`, `HanziWritingCanvas.tsx`; gate kills 27–28 |

## Freeze

Curriculum / Mastery math / SRS / JEV / billing / sibling projects unchanged (gated).

## Next

RC2.3.13D — mobile accessibility & physical UX. RC4 stamps after 13C freeze; do not physical-certify RC3 as final if 13C replaces learning UI.
