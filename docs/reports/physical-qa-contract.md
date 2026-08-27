# Contrato de QA físico — Closed Beta BR

Automação **não** preenche este arquivo com PASS. Emulação Playwright ≠ aparelho real.

Três superfícies, **a mesma sequência curta**. Cada linha é `PASS` / `FAIL` / `NOT_RUN`.
Começa tudo em `NOT_RUN`.

**Build / SHA a preencher na hora do teste:** _______________

## Superfícies

| ID | Aparelho | Browser | Tester | Data |
| --- | --- | --- | --- | --- |
| A | Android (Chrome atual) | Chrome | | |
| I | iPhone (Safari atual) | Safari | | |
| D | Desktop | Chrome | | |

## Sequência (obrigatória e idêntica)

Use o QA Fast Path em **Deploy Preview** (`/qa` ou `/qa/player`) para não gastar 40 min de curso.
**Não** use Production Beta para Fast Path — a rota redireciona para `/`.

| # | Cenário | Como | A | I | D | Notas |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Signup | `/comecar` → conta | NOT_RUN | NOT_RUN | NOT_RUN | |
| 2 | Login | `/login` | NOT_RUN | NOT_RUN | NOT_RUN | |
| 3 | Primeira aula | `/qa/m1` ou primeira lição | NOT_RUN | NOT_RUN | NOT_RUN | |
| 4 | Áudio | ouvir na primeira atividade | NOT_RUN | NOT_RUN | NOT_RUN | |
| 5 | Escolha | toque numa opção | NOT_RUN | NOT_RUN | NOT_RUN | |
| 6 | Produção | `/qa/free-production` ou transferência | NOT_RUN | NOT_RUN | NOT_RUN | |
| 7 | Conclusão 1/4 | vitória M1 | NOT_RUN | NOT_RUN | NOT_RUN | |
| 8 | Retorno à Journey | CTA Voltar à Jornada; anel `1/4` | NOT_RUN | NOT_RUN | NOT_RUN | |
| 9 | Review | `/qa/review` | NOT_RUN | NOT_RUN | NOT_RUN | |
| 10 | Logout / login | sessão sobrevive | NOT_RUN | NOT_RUN | NOT_RUN | |
| 11 | Viewport pequeno | 360×640 | NOT_RUN | NOT_RUN | NOT_RUN | |
| 12 | Teclado aberto | input de produção | NOT_RUN | NOT_RUN | NOT_RUN | |
| 13 | Scroll | conteúdo não fica sob CTA | NOT_RUN | NOT_RUN | NOT_RUN | |
| 14 | CTA | botão primário visível e tocável | NOT_RUN | NOT_RUN | NOT_RUN | |

## Estados extra (Fast Path)

| Cenário | Rota | A | I | D |
| --- | --- | --- | --- | --- |
| M2 / M3 / M4 | `/qa/m2` … `/qa/m4` | NOT_RUN | NOT_RUN | NOT_RUN |
| Pinyin / tom / hànzì | `/qa/pinyin` `/qa/tone` `/qa/hanzi` | NOT_RUN | NOT_RUN | NOT_RUN |
| Conversa | `/qa/conversation` | NOT_RUN | NOT_RUN | NOT_RUN |
| Transferência (sem leak) | `/qa/transfer` | NOT_RUN | NOT_RUN | NOT_RUN |
| Sem energia | `/qa/energy-empty` | NOT_RUN | NOT_RUN | NOT_RUN |
| Pro | `/qa/pro` | NOT_RUN | NOT_RUN | NOT_RUN |
| Missão | `/qa/mission` | NOT_RUN | NOT_RUN | NOT_RUN |
| Sync error | `/qa/sync-error` | NOT_RUN | NOT_RUN | NOT_RUN |
| Onboarding pendente | `/qa/onboarding-pending` | NOT_RUN | NOT_RUN | NOT_RUN |

## Critério

`PHYSICAL_QA_READY` só vira PASS quando **A, I e D** tiverem a sequência 1–14 em PASS, com SHA anotada.
Enquanto isso: `NOT_RUN` ou `FAIL`. Nunca copiar resultado de Chromium headless para esta tabela.
