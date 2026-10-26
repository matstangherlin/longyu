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
| Node | 02 | Versão do Node no README, Netlify e CI | (a) 22 em tudo · (b) `engines` em 20 | (a) 22, se os workflows já usam 22 | ____ (data) |
| Business | 05 | Publicar `submit-business-lead` na beta? | (a) manter `/business` escondido · (b) publicar | (a) | ____ (data) |
| Nome de conta | 08 | Fallback quando não há nome | (a) "Aluno" · (b) parte do e-mail · (c) pedir no 1º acesso | (c), com (a) só no último recurso; nunca "Aluno local" em conta cloud | ____ (data) |
| Nome no diálogo | 09 | Nome quando o aluno não tem nome utilizável | (a) "[seu nome]" + nome-modelo falado · (b) nome-modelo fixo · (c) pedir antes da lição | (c) + (b) como fallback; nunca "você" no lugar do nome; nunca "Matheus" se o aluno tem nome | ____ (data) |
| Sem áudio | 11 | "Não posso ouvir agora" numa etapa só auditiva | (a) pula sem custo e reagenda · (b) versão visual · (c) as duas | (c), etapa "não avaliada em escuta" | ____ (data) |
| Reset | 13 | Código ou link | (a) código de 6 dígitos · (b) link | (a), link fora do e-mail de recovery | ____ (data) |
| Versão beta | 14 | Número da beta fechada | — | `0.3.0-beta.1` | ____ (data) |
| Reportar | 14 | Onde fica a entrada no celular | (a) menu do perfil/Mais + tela de erro · (b) botão flutuante | (a) | ____ (data) |
| Canal humano | 14 | Para onde o relato vai | WhatsApp ou Telegram | link só em doc privado / convite; não versionar se o repo for público | ____ (data) |
| Menores | 15 | Menores de 18 na beta fechada | (a) só 18+ · (b) 13–17 com responsável · (c) livre | (a), revisar antes da beta pública | ____ (data) |
| Social | 16 | Esconder ou concluir Amigos | (a) esconder até o backend existir · (b) concluir (prompt 24) | (a); `/amigos` vai para `/perfil` | ____ (data) |
| Economia | 20 | Fonte canônica de Cargas | (a) `energyPolicy.ts` · (b) `economy.ts` | (a); `economy.ts` só constantes | ____ (data) |
| Pinyin/Hànzì | 20 | Cobrar Pinyin Lab, Hànzì, Som, Fala, Leitura? | (a) não · (b) sim | (a) não cobrar; copy "Grátis" | ____ (data) |
| Imersão | 20 | Imersão sem Cargas | (a) bloqueia áudio e libera histórias · (b) bloqueia tudo · (c) libera tudo | a regra que o código já cobra em `immersion_session`; banner igual ao código | ____ (data) |
| Vocabulário | 20 | Renomear Vidas / Pulos / Energia | agora ou depois | adiar para depois da beta fechada | ____ (data) |
| Módulo grátis | 20 | "Sem custo se aprovado" | agora ou depois | adiar | ____ (data) |
| Revisão Free | 23 | Limite por sessão | manter 20 ou mudar | manter 20; só corrigir a ordem | ____ (data) |
| Prioridade SRS | 23 | Critério da fila Free | — | mais atrasado, depois lapsos/leech, depois mais antigo | ____ (data) |
| SRS máximo | 21 | Intervalo máximo | 180 ou 365 dias, ou FSRS 0,90 | 365 dias, sem trocar o algoritmo | ____ (data) |
| Estrelas | 22 | Faixas para concluir | — | < 60% não conclui; 60–79% = 1★; 80–94% = 2★; ≥ 95% = 3★; 100% sem erro = 3★ perfeito | ____ (data) |
| Qi | 22 | Qi na 1ª conclusão | — | 1★ = 3, 2★ = 4, 3★ = 5; bônus sem pular e Pro só em 3★ | ____ (data) |
| Sem vidas | 22 | `outOfLives` | conclui ou não | não conclui; oferece Reforço | ____ (data) |
| Estrelas antigas | 22 | Recalcular quem já concluiu? | — | não recalcular | ____ (data) |
| Seguir | 24 | Seguir ou pedido de amizade | assimétrico × simétrico | manter seguir | ____ (data) |
| Hànzì | 25 | Rótulo mnemônico × etimologia | — | "Dica para lembrar" e "Origem" separados; Origem só com fonte | ____ (data) |
| Traços | 25 | Ordem de traços | importar agora ou plano | só plano + dry-run neste prompt | ____ (data) |
| Pares mínimos | 26 | Exceção ao congelamento | depois da beta ou exceção formal | só depois da beta fechada | ____ (data) |
| HSK | 27 | Referência | HSK 3.0 ou 2.0 | HSK 3.0 Nível 1 nas fases 1–5; 2.0 só como checagem | ____ (data) |
| Pedagogia depois | 28 | Ordem | cinco passos | (1) objetivos (2) feedback fases 1–3 (3) instrumentação (4) recordação (5) calibração | ____ (data) |
| A/B | 28 | Experimentos na beta fechada | A/B ou coorte | antes/depois por coorte; A/B só na beta pública | ____ (data) |
| A11y | 29 | Relação com o PR #358 | (a) depois do merge · (b) dentro do #358 | (a), um PR por item | ____ (data) |
| Texto mínimo | 29 | Tamanho | — | 12 px informativo; 11 px só em rótulo decorativo/legal | ____ (data) |
