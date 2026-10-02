# RC2.2.23 — Aterrissagem suave de energia

Bug: `ENERGY_DEPLETION_FEELS_LIKE_APP_LOCK` — P1, bloqueia release, PHYSICAL_RETEST_PENDING.

## OBSERVED (código)

- 4 erros seguidos consumiam uma Carga **além** da Vida (dupla punição).
- `extra_training` (Hànzì, Pinyin, Som, Fala, Leitura) cobrava Carga: zero Cargas bloqueava praticar o que já foi aprendido.
- Replay de lição concluída cobrava Carga.
- A tela de energia oferecia o Pro primeiro.

## Correção

- **Vidas** = erros dentro da tentativa · **Fôlego** = pular tarefa · **Cargas** = iniciar NOVA progressão principal (lição nova, desafio de módulo, sessão nova de Imersão). A copy nunca mistura.
- `MISTAKE_CHARGE_COST = 0`; `CONSECUTIVE_MISTAKE_CHARGE_COST = 0` (nome exportado mantido).
- Zero Cargas mantém abertos: Revisão, Praticar, Cultura, histórias de Imersão, Hànzì, Pinyin, Atlas, Missões, Perfil, Conta, Aparência, Configurações e replays.
- Uma superfície calma ("Você usou suas Cargas de hoje. Ainda dá para continuar estudando."): [Revisar][Praticar][Cultura][História disponível] → [Conseguir Carga] → link discreto Longyu Pro por último. Sem loop de paywall, sem moeda nova.

## INFERRED

- Tone Trainer, Pinyin e Hànzì em modo prática deixam de cair no paywall com zero Cargas (`extra_training` livre).

## NOT_TESTED

- Percepção do owner no aparelho (`zeroChargeStillUsable`): **NOT_RUN**.
