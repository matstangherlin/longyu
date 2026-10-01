# RC2.2.23 — Entrega de orientação (guidance delivery)

Bug: `GUIDANCE_DELIVERY_NOT_VISIBLE_OWNER_DEVICE` — P1, bloqueia release, PHYSICAL_RETEST_PENDING.

## OBSERVED

- Código: coachmark cuja âncora não estava na tela (fora da viewport / ainda não montada) era **descartado em silêncio** pelo timeout de render (4 s) e, enquanto a âncora faltasse, ficava **inelegível para sempre**.
- Código: `guidanceSuppressedForSeededE2E` só vale para sessão semeada de E2E na Web; build nativo e build de QA nunca são suprimidos (a função recebe `native`/`deviceQaBuild` e devolve `false`).
- E2E Web (`e2e/rc2-2-23-product-convergence.spec.ts`): painel GUIDANCE DELIVERY em /qa/device lista pendentes, mostra a próxima; card sem âncora aparece quando a âncora falta.

## Correção

| Antes | Agora |
| --- | --- |
| âncora ausente → descarte silencioso | espera 1,5 s → card inferior sem âncora (`data-guidance-anchor="fallback"`, `ANCHOR_FALLBACK`) |
| timeout de render → descarte | troca para o card sem âncora; `RENDER_TIMEOUT` só se o card também falhar |
| sem motivo | 13 códigos: DISABLED, ALREADY_RESOLVED, SESSION_BUDGET, WRONG_SURFACE, ANCHOR_MISSING, INPUT_FOCUSED, ACTIVE_LEARNING, OTHER_CEREMONY, FEATURE_NOT_AVAILABLE, SNOOZED, RENDER_TIMEOUT, SUPPRESSED_TEST_BUILD, NOT_INITIALIZED |
| sem trilha | selected → render_started → shown → dismissed (memória, teto 60) |

- AUTO_SEEDED = **pendente**, nunca visto.
- Orçamento: 1 por sessão; 2 na primeira sessão, só depois da primeira atividade.
- Nunca durante resposta, gravação, reconhecimento, teclado, recompensa ou modal.
- Prioridade: CRITICAL_UX > PEDAGOGICAL_TIP > FEATURE_UNLOCK > OPTIONAL (monetização nunca vira dica).
- Primeiro uso: Jornada, Perfil, Praticar, Revisão, Cultura, Atlas, Imersão, Conta/Aparência.
- Ponte Jornada → Cultura com "← Voltar à Jornada".
- `/qa/device`: [Listar dicas pendentes] [Mostrar próxima dica] [Resetar guidance de QA]. Só no build de QA.

## INFERRED

- A causa mais provável no aparelho do owner é âncora ausente/fora da tela (layout compacto em 360–390 px), não supressão.

## NOT_TESTED

- Dica visível no APK do owner (`guidanceVisibleOwnerDevice`): **NOT_RUN**. CODE PASS ≠ PHYSICAL PASS.
