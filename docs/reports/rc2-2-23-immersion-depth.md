# RC2.2.23 — Profundidade da Imersão

Bug: `IMMERSION_DEPTH_GAP` — P2, FIXED_CODE.

## OBSERVED (código)

- Já existia (RC2.2.11/2.2.19): pré-tela da cena (ONDE / COM QUEM / OBJETIVO), elenco com falante visível, bolhas de NPC e do aluno, áudio em cada fala, glossário por toque, recap "Você conseguiu", coachmark de primeiro uso (`immersion-first-scene`).
- Faltava: a **reação da cena** à escolha do aluno — o feedback era só "Certo/Quase".

## Correção

- O parceiro de cena (quem fala no passo, ou o personagem mais próximo; nunca narrador nem o próprio aluno) reage — 对！(duì, "Isso!") no acerto, 嗯？(ńg?, "Hum? Não entendi bem.") no erro — com áudio. Interjeições fixas de apresentação, não currículo novo; o "porquê" continua na explicação.

## Tons (mesma onda)

- Microaula de tom VER → OUVIR → IMITAR → DISCRIMINAR → RECONHECER → USAR EM PALAVRA → USAR EM CONTEXTO: um conceito por tela, frase curta, contorno grande; abre antes da 1ª rodada de um pack com tom ainda não praticado ([Pular] disponível). Sem nota de pitch (`NO_PITCH_MEASUREMENT`); pitch nunca explicado por língua.

## NOT_TESTED

- "Parece cena" para testers humanos: **NOT_RUN**.
