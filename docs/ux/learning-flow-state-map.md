# RC2.3.13C — Learning flow state map

Contract: **one moment = one dominant action**. Home (13B) answers *what*; this map answers *how*.

Sources: `GuidedLessonShell`, `LessonPlayer`, `steps.tsx`, `GuidedTryPage`, `PronunciationPractice`, `SelfComparePractice`, `ConversationSceneStep`, `HanziWritingExercise`, `RevisaoPage`, `LessonVictory`.

## State table

| State | Primary | Secondary | Optional / tertiary | Disabled | Auto transition | Failure recovery |
| --- | --- | --- | --- | --- | --- | --- |
| **LESSON_ENTER** | Começar (`lesson-prepare-start`) | — | Sair (×) | — | — | Stall retry if prepare hangs |
| **INSTRUCTION** | Continuar / Entendi | — | Pular (guided dock) | — | — | — |
| **MODEL_AUDIO_READY** | Ouvir (`GuidedAudioButton`) | — | “Não consigo ouvir agora” | Continuar até ouvir / falhar | — | — |
| **MODEL_AUDIO_PLAYING** | (busy ring on Ouvir) | — | — | Continuar | → HEARD on end | Deadline → FAILED |
| **ANSWER_READY** | Confirmar / Verificar / escolha | Ouvir modelo (se speech) | Dica / Pular | Continuar até resposta | — | — |
| **ANSWER_SUBMITTED** | (processing) | — | — | Duplicate submit blocked | → feedback | Network retry idempotent |
| **FEEDBACK_CORRECT** | Continuar | — | — | — | Subtle reinforce | — |
| **FEEDBACK_INCORRECT** | Tentar de novo | Continuar (após política) | Dica | — | — | Non-punitive copy |
| **RECOVERY** | Tentar novamente | Continuar sem áudio / sem fala | Abrir ajustes | — | — | Tech ≠ wrong answer |
| **CONTINUE_READY** | Continuar (`data-cta-hierarchy=primary`) | — | — | — | Advance step | Stall guard re-offers Continuar |
| **SPEECH_READY** | Gravar | Ouvir modelo | Continuar sem gravação | — | — | Pre-permission explain |
| **SPEECH_RECORDING** | Parar | — | — | Duplicate start blocked | → playback | Permission / device fail |
| **SPEECH_PLAYBACK** | Continuar *ou* Tentar novamente | Ouvir minha voz / modelo | — | — | — | Tech fail non-penalty |
| **HANZI_READY** | Interagir no canvas | — | Preferir montagem (a11y) | Continuar até critério | — | Fallback assemble |
| **HANZI_INTERACTION** | Desfazer / Limpar / Reproduzir (tools) | — | — | CTA fora do canvas | → complete | — |
| **REVIEW_READY** | Começar revisão (`review-start`) | — | — | — | — | Empty queue → hub only |
| **COMPLETION** | Continuar jornada (`data-victory-primary`) | Cultura skip (ghost) | — | Store/League/Pro hidden | Short celebration | Reduced motion |

## Hick flags (before 13C polish)

| Surface | Risk | Mitigation in 13C |
| --- | --- | --- |
| Listen step | Ouvir + Continuar + “não consigo” equal weight | Audio primary until heard; Continuar secondary→primary; escape tertiary |
| Speech | Gravar + Ouvir + Continuar all filled | Gravar primary; Ouvir secondary; escape tertiary |
| Guided Try listen | Same | Same hierarchy + `data-cta-hierarchy` |
| Victory | Already one primary | Gate preserves; mark hierarchy |
| Review hub | One CTA | Mark primary |

## Disabled Continue explainability

| Condition | Reason copy (short) |
| --- | --- |
| Listen not heard | Ouça o modelo primeiro. |
| Choice unanswered | Escolha uma resposta para continuar. |
| Build incomplete | Monte a frase para continuar. |
| Speech recording | Pare a gravação para continuar. |

## File anchors

| Concern | Path |
| --- | --- |
| Dock / Continue | `src/features/lesson/steps.tsx` `ContinueBtn` / `StickyActionBar` |
| Audio button | `src/components/guided/GuidedPrimitives.tsx` `GuidedAudioButton` |
| Guided Try | `src/features/landing/GuidedTryPage.tsx` |
| Speech | `PronunciationPractice.tsx`, `SelfComparePractice.tsx` |
| Conversation | `ConversationSceneStep.tsx` |
| Hànzì | `HanziWritingExercise` / canvas |
| Review | `RevisaoPage.tsx` |
| Completion | `LessonVictory.tsx` |
| Gate | `gate:rc2-3-13c-learning-flow` |
