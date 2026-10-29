# Decisões — relatório QA v1.1

O bloco "Decisão necessária" do prompt 01 veio sem edição. O agente **não trata isso como decisão fechada do Matty**. Cada item abaixo tem o padrão recomendado do pacote e o campo para a confirmação. Enquanto o campo estiver em branco, os prompts seguintes devem seguir o padrão e parar se a implementação depender de uma escolha diferente.

Data da linha de base: 26/10/2026 (America/Sao_Paulo).

## D1–D3 e congelamento (prompt 01)

### D1 — Cobrar durante a beta?

- (a) Não cobrar. Pro desligado / "Em breve", ou concedido manualmente a testers.
- (b) Cobrar em Stripe Test Mode só para testers internos.
- Padrão recomendado: **(a)**. Billing não está ligado em produção e o CORS bloqueia o checkout (LGY-004). `RC_CHANGE_POLICY.md` já diz `MONETIZATION_MODE=TEST` e proíbe compra ao vivo.
- Decisão do Matty: ____ (data)

### D2 — Repositório público ou privado?

- Padrão recomendado: **privado até a beta pública** (o repo expõe currículo e motores; LGY-037 / LGY-045).
- Fato na linha de base: o GitHub `matstangherlin/longyu` está **público**. Este PR não muda visibilidade.
- Decisão do Matty: ____ (data)

### D3 — Quem entra na onda 1 da beta fechada?

- Padrão recomendado: **5–8 pessoas conhecidas que nunca estudaram mandarim.**
- Decisão do Matty: ____ (data)

### Branch `beta/1.0.0`

- Agora, ou depois da Onda 1?
- Padrão recomendado: **depois da Onda 1** (as migrations pendentes são o schema que o código já espera, não schema novo).
- Decisão do Matty: ____ (data)

## Decisões que os prompts seguintes vão pedir

Nenhuma foi confirmada. O padrão é o do pacote, para o Matty aceitar ou trocar antes de colar o prompt.

| ID | Prompt | Pergunta | Opções | Padrão recomendado | Decisão do Matty |
|---|---|---|---|---|---|
| Node | 02 | Versão do Node no README, Netlify e CI | (a) 22 em tudo · (b) `engines` em 20 | (a) 22, se os workflows já usam 22 | padrão (a) aplicado pelo agente em 26/10/2026; confirmação do Matty: ____ (data) |
| Business | 05 | Publicar `submit-business-lead` na beta? | (a) manter `/business` escondido · (b) publicar | (a) | ____ (data) |
| Nome de conta | 08 | Fallback quando não há nome | (a) "Aluno" · (b) parte do e-mail · (c) pedir no 1º acesso | (c), com (a) só no último recurso; nunca "Aluno local" em conta cloud | ____ (data) |
| Nome no diálogo | 09 | Nome quando o aluno não tem nome utilizável | (a) "[seu nome]" + nome-modelo falado · (b) nome-modelo fixo · (c) pedir antes da lição | (c) + (b) como fallback; nunca "você" no lugar do nome; nunca "Matheus" se o aluno tem nome | ____ (data) |
| Sem áudio | 11 | "Não posso ouvir agora" numa etapa só auditiva | (a) pula sem custo e reagenda · (b) versão visual · (c) as duas | (c), etapa "não avaliada em escuta" | ____ (data) |
| Reset | 13 | Código ou link | (a) código de 6 dígitos · (b) link | (a), link fora do e-mail de recovery | ____ (data) |
| Versão beta | 14 | Número da beta fechada | — | `0.3.0-beta.1` | ____ (data) |
| Reportar | 14 | Onde fica a entrada no celular | (a) menu do perfil/Mais + tela de erro · (b) botão flutuante | (a) | ____ (data) |
| Canal humano | 14 | Para onde o relato vai | WhatsApp ou Telegram | link só em doc privado / convite; não versionar se o repo for público | ____ (data) |
| Menores | 15 | Menores de 18 na beta fechada | (a) só 18+ · (b) 13–17 com responsável · (c) livre | (a), revisar antes da beta pública | ____ (data) |
| Social | 16 | Esconder ou concluir Amigos | (a) esconder até o backend existir · (b) concluir (prompt 24) | (a); `/amigos` vai para `/perfil` | padrão (a) aplicado em 26/10/2026; confirmação do Matty: ____ (data) |
| Business na beta | 16 | Mostrar `/business` | (a) esconder · (b) manter | (a) | padrão (a) aplicado em 26/10/2026; confirmação do Matty: ____ (data) |
| Indicação | 16 | Recompensa por convite | agora ou depois | adiar (LGY-035) | adiado em 26/10/2026; confirmação do Matty: ____ (data) |
| Perfil público | 16 | `/u/:username` na beta | sim ou não | não | 404 em `/u/*` e `/@*`; confirmação do Matty: ____ (data) |
| Economia | 20 | Fonte canônica de Cargas | (a) `energyPolicy.ts` · (b) `economy.ts` | (a); `economy.ts` só constantes | padrão (a) aplicado pelo agente em 27/10/2026 (`chargeCostFor` / `describeAccess`); confirmação do Matty: ____ (data) |
| Pinyin/Hànzì | 20 | Cobrar Pinyin Lab, Hànzì, Som, Fala, Leitura? | (a) não · (b) sim | (a) não cobrar; copy "Grátis" | padrão (a) aplicado em 27/10/2026: comportamento atual mantido, a copy passou a dizer "Grátis"; confirmação do Matty: ____ (data) |
| Imersão | 20 | Imersão sem Cargas | (a) bloqueia áudio e libera histórias · (b) bloqueia tudo · (c) libera tudo | a regra que o código já cobra em `immersion_session`; banner igual ao código | (a) aplicado em 27/10/2026, porque é o que o código cobra: sessão de escuta nova do dia ("Escuta e frases") usa 1 Carga; reouvir/continuar a mesma sessão no dia e as histórias interativas não usam. O banner diz isso. Confirmação do Matty: ____ (data) |
| Vocabulário | 20 | Renomear Vidas / Pulos / Energia | agora ou depois | adiar para depois da beta fechada | adiado em 27/10/2026; nenhuma palavra da UI mudou; confirmação do Matty: ____ (data) |
| Módulo grátis | 20 | "Sem custo se aprovado" | agora ou depois | adiar | adiado em 27/10/2026 (mudança de economia congelada); o teste de módulo continua custando 1 Carga; confirmação do Matty: ____ (data) |
| Revisão Free | 23 | Limite por sessão | manter 20 ou mudar | manter 20; só corrigir a ordem | ____ (data) |
| Prioridade SRS | 23 | Critério da fila Free | — | mais atrasado, depois lapsos/leech, depois mais antigo | ____ (data) |
| SRS máximo | 21 | Intervalo máximo | 180 ou 365 dias, ou FSRS 0,90 | 365 dias, sem trocar o algoritmo | padrão aplicado em 28/10/2026: 365 dias, teto de ease 2,8, leech em 8 lapsos, FSRS não; confirmação do Matty: ____ (data) |
| Estrelas | 22 | Faixas para concluir | — | < 60% não conclui; 60–79% = 1★; 80–94% = 2★; ≥ 95% = 3★; 100% sem erro = 3★ perfeito | padrão aplicado em 29/10/2026 (`lessonStarRules.ts`). Revisão de módulo sem mudança (80%). Confirmação do Matty: ____ (data) |
| Qi | 22 | Qi na 1ª conclusão | — | 1★ = 3, 2★ = 4, 3★ = 5; bônus sem pular e Pro só em 3★ | padrão aplicado em 29/10/2026 na conta local. Conta na nuvem segue 0 abaixo de 3★ até o SQL pendente + `VITE_GRADUATED_LESSON_QI=true` (ver abaixo). Confirmação do Matty: ____ (data) |
| Sem vidas | 22 | `outOfLives` | conclui ou não | não conclui; oferece Reforço | padrão aplicado em 29/10/2026: 0★ (antes 1★), não conclui. A revisão dos erros continua oferecida, mas não recupera estrela nem conclui (como antes). Confirmação do Matty: ____ (data) |
| Estrelas antigas | 22 | Recalcular quem já concluiu? | — | não recalcular | padrão aplicado em 29/10/2026: nada recalcula estrela gravada. Confirmação do Matty: ____ (data) |
| Reforço abaixo do mínimo | 22 | O Reforço de uma tentativa < 60% conclui a lição? | (a) conclui com 3★ · (b) conclui com 1★ · (c) não conclui: é prática; concluir pede nova tentativa ≥ 60% | (c), assumido pelo agente: em nó de tema, (a) e (b) concluiriam a aula sem contar a rodada (o anel ficaria parado), e a rodada só deve contar com 60% | padrão (c) aplicado em 29/10/2026 (`reforcoRecoversAttempt`). Tentativa que já concluía continua recuperando a 3ª estrela, como antes. Confirmação do Matty: ____ (data) |
| Seguir | 24 | Seguir ou pedido de amizade | assimétrico × simétrico | manter seguir | ____ (data) |
| Hànzì | 25 | Rótulo mnemônico × etimologia | — | "Dica para lembrar" e "Origem" separados; Origem só com fonte | ____ (data) |
| Traços | 25 | Ordem de traços | importar agora ou plano | só plano + dry-run neste prompt | ____ (data) |
| Pares mínimos | 26 | Exceção ao congelamento | depois da beta ou exceção formal | só depois da beta fechada | ____ (data) |
| HSK | 27 | Referência | HSK 3.0 ou 2.0 | HSK 3.0 Nível 1 nas fases 1–5; 2.0 só como checagem | ____ (data) |
| Pedagogia depois | 28 | Ordem | cinco passos | (1) objetivos (2) feedback fases 1–3 (3) instrumentação (4) recordação (5) calibração | ____ (data) |
| A/B | 28 | Experimentos na beta fechada | A/B ou coorte | antes/depois por coorte; A/B só na beta pública | ____ (data) |
| A11y | 29 | Relação com o PR #358 | (a) depois do merge · (b) dentro do #358 | (a), um PR por item | ____ (data) |
| Texto mínimo | 29 | Tamanho | — | 12 px informativo; 11 px só em rótulo decorativo/legal | ____ (data) |

## Estrelas e Qi (prompt 22 · LGY-026, LGY-031)

| Regra | Antes | Depois |
|---|---|---|
| 1 acerto em 10 | 2★ e conclui | 0★, não conclui: Reforço dos erros (prática) e Tentar de novo |
| Qualquer erro | no máximo 2★ | conta só a precisão: 95% com 1 erro = 3★ |
| 3★ | só 100% | a partir de 95% (`THREE_STAR_ACCURACY` 0,9 → 0,95; antes sem uso) |
| Selo "Perfeito" | 100% e `graded - correct = 0` | 100% e nenhum erro registrado |
| Sem vidas | 1★ (não concluía) | 0★ (não conclui) |
| Etapa avaliada sem resultado (pulo com Fôlego, "Não posso ouvir agora", etapa que termina só com "Continuar") | ficava no denominador; sem erro dava 1–2★ | sai da precisão; a rodada fica em no máximo 2★ (sem isso, quem está sem áudio não concluiria) |
| Reforço de tentativa < 60% | — (a tentativa já concluía) | prática dos erros; não conclui. Concluir pede nova tentativa ≥ 60% |
| Qi da 1ª conclusão | 0 abaixo de 3★; 3★ = 5 (+2 sem pular, +3 Pro) | 1★ = 3, 2★ = 4, 3★ igual. Na nuvem só com a chave |
| Repetir abaixo do mínimo | "Refazer partes fracas" reabria a lição, mas o cursor de retomada ficava na última etapa e a nova tentativa começava quase no fim | "Tentar de novo" começa do início, no mesmo lugar: não passa pela entrada, não gasta Carga. O fim de qualquer tentativa limpa o cursor. Voltar no mesmo dia também não cobra (chave idempotente por lição/rodada/dia) |
| Retomar no meio (recarregar a página) | os acertos de antes de recarregar se perdiam, mas qualquer acerto concluía com 2★ | as etapas avaliadas feitas antes de recarregar saem da precisão; a rodada fica em até 2★ |
| Erros na conclusão | só "N pontos para firmar" | lista com o enunciado, a sua resposta e a certa (hànzì e pinyin) |

Efeito colateral esperado: a média do tema (Reforço +) muda junto. Rodadas com 60–79% passam a valer 1★ (antes 2★) e rodadas com um erro em 20+ etapas passam a valer 3★ (antes 2★). O limiar da Plus (média ≤ 2,0) não mudou.

### Qi graduado na nuvem (prompt 22)

- Fato (só leitura em produção, 28/10/2026): `grant_lesson_reward` ignora `p_stars` e paga sempre o pacote de 3★ (5 + 2, +3 no Pro), uma vez por lição. Corpo igual a `20260808170000_harden_client_reward_claims.sql`.
- Por isso a conta na nuvem continua sem Qi abaixo de 3★: graduar só no cliente faria o servidor pagar 7 por uma conclusão de 1★.
- Pronto, **não aplicado**: `supabase/pending/qa-22-graduated-lesson-qi.sql` (+ `.down.sql`). `p_stars` só reduz o pacote: 3★ paga o mesmo de hoje.
- Ordem: staging → produção com backup → `VITE_GRADUATED_LESSON_QI=true` no Netlify. Rollback: desligar a chave e depois aplicar o `.down.sql`.
- Decisão do Matty: ____ (data)

## Experimentos registrados (não implementados)

### Fôlego determinístico (prompt 20 · R11 / §6.7 item 8)

- Ideia: o Fôlego deixa de depender de sorte (`FOLEGO_PERFECT_EARN_CHANCE`) e passa a vir por regra fixa.
- Estado: **não implementado**. É mudança de economia congelada.
- Proposta: experimento A/B na beta pública, comparando D7 e uso de Fôlego entre as coortes. Na beta fechada, no máximo antes/depois por coorte (ver a decisão A/B do prompt 28).
- Decisão do Matty: ____ (data)

### Dia das Cargas no aparelho × no servidor (prompt 20 · LGY-034)

- Fato: o servidor vira `user_economy.energy_day` com `current_date`, e o Postgres de produção roda em UTC (consulta só de leitura em 27/10/2026: `TimeZone = UTC`). O aparelho vira o dia à meia-noite local (`todayKey`).
- Efeito: conta na nuvem em Brasília recebe Cargas às 21:00. A tela agora diz 21:00 para conta na nuvem e 00:00 para conta local.
- Risco aberto: entre 21:00 e 00:00 o aparelho ainda acha que é o dia anterior. À meia-noite local o store pode recarregar sozinho e o servidor recusar a Carga ("Carga não confirmada pelo servidor").
- Opções: (a) o servidor usar o fuso do aluno · (b) o cliente seguir o `energy_day` do servidor · (c) manter e só explicar. Este PR fez só (c). Mudar (a) ou (b) é economia congelada.
- Decisão do Matty: ____ (data)

### FSRS com retenção 0,90 (prompt 21 · R3)

- Estado: **não implementado**. O agendador segue SM-2 com passos, agora com tetos (365 d, ease 2,8), lapso em 50% do intervalo e leech em 8 lapsos.
- Proposta: experimento depois da beta fechada, comparando retenção medida (`srs_summary` + revisões) entre coortes.
- Decisão do Matty: ____ (data)

