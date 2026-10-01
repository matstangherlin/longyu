# RC2.2.22 — Burndown de bugs da Beta

Fonte: `docs/release/rc2-2-22-beta-bugs.json`. O manifesto importou os bugs da RC2.2.21 sem reset e acrescentou os achados do lint de produto.

## Painel

| Severidade | Abertos | Novos | Reproduzidos | Corrigidos | Aguardando físico | Physical pass |
| --- | --- | --- | --- | --- | --- | --- |
| P0 | 0 | 0 | 0 | 0 | 0 | 0 |
| P1 | 9 | 0 | 0 | 0 | 9 | 0 |
| P2 | 5 | 3 | 0 | 0 | 2 | 0 |

**Release-blocking abertos: 8.** CLOSED BETA: NO-GO.

## Causas comuns

Cada causa comum é corrigida uma vez, não três.

| Causa | Bugs | Estado |
| --- | --- | --- |
| AUDIO_SESSION_CONFLICT | voz própria inaudível, TTS nas superfícies, fala nativa | FIXED_CODE (RC2.2.21): árbitro de áudio, foco transitório, AudioAttributes; físico pendente |
| PAUSE_TREATED_AS_EXIT | voz própria inaudível, perda de estado no ciclo de vida | FIXED_CODE (RC2.2.21): pausa ≠ sair; físico pendente |

## Achados do lint de produto (P2, conteúdo congelado)

- **FIRST20_NO_REAL_LIFE_TRANSFER_17_20:** as sessões 17–20 não têm passo de contexto/conversa.
- **FIRST20_LOW_VISUAL_SUPPORT:** 11 das 20 sessões não têm passo visual.
- **FIRST20_HIGH_COMPLEXITY_STEPS:** 3 passos HIGH; nenhum OVERLOADED.

Decisão: validar com testers antes de mexer no conteúdo. Mudar o plano exige exceção de conteúdo (fingerprint `c48b008c9c1e`).

## Regras

- **P0 durante o QA:** para a expansão da onda → corrigir → regressão → reteste físico → continuar.
- **P1 novo:** precisa de owner, reprodução e status.
- **Falha física:** vira entrada com bugId, build, classe do aparelho, reprodução e snapshot do diagnóstico, sem PII.
- **Severidade:** não muda para liberar a Beta.
