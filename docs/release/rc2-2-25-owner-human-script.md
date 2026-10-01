# RC2.2.25 — roteiro humano do owner (aceite visual SIM/NÃO)

Aparelho Android real, APK da branch `claude/rc2-2-25-product-experience-closure`.
Cada linha recebe **SIM** ou **NÃO** do owner. Este documento não é preenchido
por agente: mock, E2E e captura não contam como aceite. O resultado vai para
`docs/release/rc2-2-25-owner-product-debt.json` (`ownerAccepted`) e para
`ownerDevicePhysical` em `docs/release/rc2-2-25-product-experience-bugs.json`,
com data e tipo de evidência.

Não gravar voz humana em CI. Não anotar e-mail, senha, OTP, token ou gravação
neste arquivo.

## Roteiro (conta nova → Logout)

| # | Passo | Superfície | Esperado | SIM/NÃO |
|---|-------|-----------|----------|---------|
| 1 | Instalar o APK e abrir | Landing | Landing limpa, [Começar] e Login visíveis | |
| 2 | Criar conta nova | Cadastro | Sem "Aluno local", sem perfis locais | |
| 3 | Primeira tela | Jornada | Barra só com **Jornada · Mais** | |
| 4 | Fazer a primeira aula | Lição | Uma ideia por tela, sem rolar, CTA "Continuar" sem XP | |
| 5 | Voltar à Jornada | Jornada | Volta ao nó (pulso discreto), não ao topo; **Praticar** aparece | |
| 6 | Ouvir no Teste guiado | Teste guiado | Áudio ouvido libera Continuar; sem áudio há saída clara | |
| 7 | Conversa da lição | Lição/conversa | Cada toque mostra a próxima fala | |
| 8 | Abrir Revisão | Revisão (hub) | Resumo + [Começar revisão] | |
| 9 | Começar revisão | Revisão (rodada) | Sem TabBar/contadores; "ETAPA n/N"; Hànzì grande | |
| 10 | Abrir Tons | Tons (hub) | Hub ≠ rodada; [Começar] | |
| 11 | Rodada de tons | Tons (rodada) | Sem Nota/Melhor/Fraco/Pack; opções e [Próxima] sem rolar | |
| 12 | Tone Trace | Microaula | "Passe o dedo pelo caminho do tom."; linha → parcial → pontos → nada → escolha de memória; vibração só no início/fim | |
| 13 | Pinyin Lab | Pinyin | [Começar] abre o treino em tela cheia com X | |
| 14 | Fala | Fala | [Começar] → frases em foco; Gravar e comparar mostra OUÇA → GRAVE → OUÇA VOCÊ → COMPARE → CONTINUE | |
| 15 | Fala sem reconhecimento | Passo de fala | "Seu aparelho não conseguiu reconhecer mandarim agora." [Gravar e comparar] [Continuar sem falar]; sem nome de motor | |
| 16 | Marco cultural | Jornada | "Antes de continuar, entenda este costume." [Ir para Cultura] | |
| 17 | Concluir a Cultura | Cultura | "✓ Cultura concluída" + [Voltar para <unidade>] | |
| 18 | Imersão | Imersão | ONDE / COM QUEM / OBJETIVO; em foco; "Você conseguiu…" | |
| 19 | Mais | Mais | VOCÊ no topo; "Sair da conta" linha inteira, não vermelha; ESTUDAR · SOCIAL · PROGRESSO · SISTEMA | |
| 20 | Perfil | Perfil | Avatar, nome, @username, medalhas, Editar, Amigos, **Conta** | |
| 21 | Conta | Conta | Primeira dobra: avatar, nome, e-mail, status, Perfil/Aparência/Segurança/**Sair** sem rolar; Excluir só no fim | |
| 22 | Aparência | Aparência | Sistema / Claro / Escuro | |
| 23 | Sair da conta | Mais (sheet) | ≤ 2 toques; cai na Landing/Login; nunca "Aluno local" | |

## Goldens (15 superfícies × 5 viewports)

`RC2225_GOLDENS=1 npx playwright test e2e/rc2-2-25-goldens.spec.ts --project=chromium`
gera as capturas em `docs/reports/rc2-2-25-goldens/` (não versionadas).
360×640, 375×667, 390×844, 412×915, 432×960. Captura é material de revisão,
**não** aceite: o owner marca SIM/NÃO por superfície.

## Estados

`NOT_IMPLEMENTED → CODE_READY → WEB_PASS → APK_PASS → OWNER_ACCEPTED`.
Nenhum passo pula outro. CODE PASS ≠ ANDROID PASS; WEB PASS ≠ APK PASS.
