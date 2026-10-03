# RC2.2.32 — Speech Experience

**Status:** `CODE_READY` · `PHYSICAL_OWNER_PASS: NOT_RUN`

## Fluxo pedagógico (aluno)

1. **OUÇA** — modelo canônico  
2. **GRAVE** — gravação local temporária  
3. **OUÇA VOCÊ** — self-playback  
4. **COMPARE** — ritmo/clareza (sem nota inventada)  
5. **CONTINUE** — nunca bloqueado por reconhecimento  

Implementado em `SelfComparePractice` via `speakingStageFor` / `SpeakingStageStrip`.

## Reconhecimento

| Regra | Estado |
|---|---|
| Pode ajudar quando disponível | ✅ |
| Nunca bloqueia aprendizado | ✅ |
| UI sem termos técnicos | ✅ |
| Diagnóstico só em QA | ✅ (`speechDiagnosticsEnabled`) |

Mensagem humana quando o aparelho não analisa:

> "Não consegui analisar sua fala agora."

Ações: ouvir modelo · ouvir gravação · tentar de novo · continuar.

## Termos proibidos na UI do aluno

`MODEL_MISSING`, `recognitionService`, `metadataDuration`, `recordingEngine`, tabelas DEV/QA, nomes de motores.

## Contraste fonético (infra)

Pares seed com **mesma voz canônica** obrigatória:

| Par | Textos |
|---|---|
| xī / shí | 西 / 十 |
| xiè / xiǎo | 谢 / 小 |
| mā / má | 妈 / 麻 |
| mǎ / mà | 马 / 骂 |

API: `src/lib/audioContrastPairs.ts` → `auditAudioContrastPairs()`.

## Checklist físico (owner)

- [ ] Gravar voz  
- [ ] Ouvir própria gravação  
- [ ] Fallback sem reconhecimento  
- [ ] Continuar sem falar  
- [ ] Modelos A/B de contraste com a mesma voz  
