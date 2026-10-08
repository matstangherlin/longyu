# RC2.2.32 — Conversation Integrity

**Status:** `CODE_READY` · `PHYSICAL_OWNER_PASS: NOT_RUN`

## Contrato

1. **Texto primeiro / estado primeiro** — áudio acompanha  
2. Falha de player **nunca** cancela progressão  
3. Sem placeholders internos (`undefined`, `_`, `TODO`) na fala do aluno  
4. Validação automática via `src/lib/conversationIntegrity.ts`

## Detectores

| Código | Significado |
|---|---|
| `EMPTY_SPEECH` | fala vazia |
| `TRUNCATED_SPEECH` | frase cortada (hífen/reticências suspeitas) |
| `UNDEFINED_LITERAL` | literal `undefined` |
| `UNDERSCORE_PLACEHOLDER` | `_` interno |
| `SCAFFOLD_LEAK` | TODO/FIXME/PLACEHOLDER |
| `NO_CONTINUATION` | next desconhecido / nó sem saída |
| `NPC_NO_REPLY` | NPC sem resposta |
| `AUDIO_TEXT_MISMATCH` | audioText vazio com fala presente |

## Superfícies

- `conversation_scene` (`ConversationSceneStep` + `conversationReducer`)
- `dialogue_choice` / `dialogue_completion` (`StepDialogueChoice`)
- Immersion / Guided Try (áudio não trava UI)
- Exemplos com nome do aluno (DYNAMIC — TTS permitido)

## Gate de áudio

Auditoria prévia (#308 / RC2.2.27) já marca `conversation_scene` e `dialogue_*` com `audioGatesContinue: false`. Mantido.

## Resultado estático (código)

- API de inspeção: **presente**
- Progressão independente de áudio: **preservada**
- Varredura completa do corpus de cenas em runtime de CI: via `npm run test:rc232-unit` + gate `conversation-integrity`
- Prova física 10+ nodes: **NOT_RUN**
